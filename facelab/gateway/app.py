from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import requests
from pathlib import Path
import uuid

app = FastAPI(title="FaceLab Hub")

# ====== CORS Middleware ======
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== Config ======
SIMSWAP_URL = "http://127.0.0.1:8001/run"  # SimSwap service endpoint (single)
SIMSWAP_MULTI_URL = "http://127.0.0.1:8001/run_multi"  # SimSwap service endpoint (multi)
BG_REMOVAL_URL = "http://127.0.0.1:8002/run"  # Background removal service endpoint
HEADNERF_URL = "http://127.0.0.1:8003"  # HeadNeRF service endpoint

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR.mkdir(exist_ok=True)

# Serve static files (for displaying results)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    # Hub page (currently only SimSwap enabled)
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
def health():
    return {"status": "ok", "service": "gateway"}


@app.post("/api/simswap")
def simswap(src: UploadFile = File(...), dst: UploadFile = File(...)):
    try:
        src.file.seek(0)
    except Exception:
        pass
    try:
        dst.file.seek(0)
    except Exception:
        pass

    files = {
        "src": (src.filename, src.file, src.content_type),
        "dst": (dst.filename, dst.file, dst.content_type),
    }

    try:
        r = requests.post(SIMSWAP_URL, files=files, timeout=600)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"SimSwap service unreachable: {e}")

    if r.status_code != 200:
        # ส่ง error กลับให้หน้าเว็บอ่านได้
        return JSONResponse(status_code=r.status_code, content={"detail": r.text})

    # บันทึกผลลัพธ์เป็นไฟล์ static เพื่อให้ <img src=...> เรียกได้
    result_filename = f"simswap_{uuid.uuid4().hex[:8]}.png"
    out_path = STATIC_DIR / result_filename
    out_path.write_bytes(r.content)

    return {"ok": True, "result_url": f"/static/{result_filename}"}




@app.post("/api/simswap_multi_detect")
async def simswap_multi_detect(dst: UploadFile = File(...)):
    """Convert uploaded image to detected face crops via SimSwap service."""
    # 1. Forward to SimSwap service
    try:
        files = {"dst": (dst.filename, dst.file, dst.content_type)}
        # Reset file pointer just in case
        dst.file.seek(0)
        
        r = requests.post(f"http://127.0.0.1:8001/detect_faces", files=files, timeout=60)
    except Exception as e:
         raise HTTPException(status_code=502, detail=f"Service unreachable: {e}")
         
    if r.status_code != 200:
        return JSONResponse(status_code=r.status_code, content=r.json())
        
    data = r.json()
    faces = data.get("faces", [])
    job_id = data.get("job_id", "unknown")
    
    # 2. Download face crops to Gateway static
    local_faces = []
    face_dir = STATIC_DIR / "faces"
    face_dir.mkdir(exist_ok=True)
    
    for face in faces:
        remote_path = face["file_path"] # e.g. /uploads/xxx.png
        # Download
        try:
            face_url = f"http://127.0.0.1:8001{remote_path}"
            rr = requests.get(face_url, timeout=10)
            if rr.status_code == 200:
                fname = f"face_{job_id}_{face['index']}.png"
                (face_dir / fname).write_bytes(rr.content)
                local_faces.append({
                    "index": face["index"],
                    "url": f"/static/faces/{fname}"
                })
        except Exception as e:
            print(f"Failed to fetch face {face}: {e}")
            
    return {"ok": True, "faces": local_faces}


@app.post("/api/simswap_multi_upload")
async def simswap_multi_upload(src: list[UploadFile] = File(...), dst: UploadFile = File(...), mapping: str = Form("")):
    """Accept explicit file uploads (List[UploadFile]) so Swagger UI shows inputs.
    This endpoint mirrors the behavior of `/api/simswap_multi` but exposes typed params for the docs.
    """
    # save into shared_storage/uploads and forward, similar to simswap_multi logic
    shared_upload_dir = BASE_DIR.parent / 'shared_storage' / 'uploads'
    shared_upload_dir.mkdir(parents=True, exist_ok=True)

    job = __import__('uuid').uuid4().hex[:10]
    saved_files = []
    # save src files
    for i, f in enumerate(src):
        try:
            await f.seek(0)
        except Exception:
            pass
        suffix = Path(getattr(f, 'filename', f'src{i}')).suffix or '.jpg'
        outp = shared_upload_dir / f"{job}_src{i}{suffix}"
        data = await f.read()
        outp.write_bytes(data)
        saved_files.append(('src', outp))

    # save dst
    try:
        await dst.seek(0)
    except Exception:
        pass
    suffix = Path(getattr(dst, 'filename', 'dst')).suffix or '.jpg'
    outp = shared_upload_dir / f"{job}_dst{suffix}"
    data = await dst.read()
    outp.write_bytes(data)
    saved_files.append(('dst', outp))

    # open saved files for forwarding
    opened_handles = []
    files = []
    for kind, p in saved_files:
        fh = open(p, 'rb')
        opened_handles.append(fh)
        files.append((kind, (p.name, fh, 'application/octet-stream')))
    
    # Add mapping to payload
    payload = {"mapping": mapping}

    try:
        r = requests.post(SIMSWAP_MULTI_URL, files=files, data=payload, timeout=600)
    except requests.RequestException as e:
        for fh in opened_handles:
            try:
                fh.close()
            except Exception:
                pass
        raise HTTPException(status_code=502, detail=f"SimSwap service unreachable: {e}")

    # close handles
    for fh in opened_handles:
        try:
            fh.close()
        except Exception:
            pass

    if r.status_code != 200:
        return JSONResponse(status_code=r.status_code, content={"detail": r.text})

    result_filename = f"simswap_multi_{uuid.uuid4().hex[:8]}.png"
    out_path = STATIC_DIR / result_filename
    out_path.write_bytes(r.content)

    return {"ok": True, "result_url": f"/static/{result_filename}"}


@app.post("/api/background_removal")
async def background_removal(
    image: UploadFile = File(...),
    bg_image: UploadFile = File(None),
    colors: str = Form(None),
    mode: str = Form("color")
):
    """
    Gateway Endpoint for Background Removal
    Supports: transparent, color, image
    """
    try:
        # 1. เตรียม Files
        image.file.seek(0)
        files = {
            "image": (image.filename, image.file, image.content_type),
        }
        
        # ถ้ามีรูปพื้นหลังแนบมา (สำหรับโหมด image)
        if bg_image:
            bg_image.file.seek(0)
            files["bg_image"] = (bg_image.filename, bg_image.file, bg_image.content_type)

        # 2. เตรียม Data
        data = {"mode": mode}
        if colors:
            data["colors"] = colors

        # 3. ส่ง Request ไปยัง Service (Port 8002)
        try:
            r = requests.post(BG_REMOVAL_URL, files=files, data=data, timeout=600)
        except requests.RequestException as e:
            raise HTTPException(status_code=502, detail=f"Service unreachable: {e}")

        if r.status_code != 200:
            return JSONResponse(status_code=r.status_code, content={"detail": r.text})

        # 4. Process Response และ Download รูปกลับมาเก็บที่ Gateway
        resp_json = r.json()
        results = []
        job_id = resp_json.get("job_id", uuid.uuid4().hex[:8])

        for i, path in enumerate(resp_json.get("results", [])):
            if path.startswith('http'):
                src_url = path
            else:
                src_url = f"http://127.0.0.1:8002{path}"

            try:
                rr = requests.get(src_url, timeout=60)
                if rr.status_code == 200:
                    out_name = f"bg_{job_id}_{i}.png"
                    out_path = STATIC_DIR / out_name
                    out_path.write_bytes(rr.content)
                    results.append(f"/static/{out_name}")
            except:
                continue

        if not results:
            return JSONResponse(status_code=500, content={"detail": "No results returned"})

        return {
            "ok": True,
            "job_id": job_id,
            "results": results,
            "colors_used": resp_json.get("colors_used", [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ====== HeadNeRF Endpoints ======

@app.get("/api/headnerf/samples")
def headnerf_samples():
    """Proxy to HeadNeRF service - list available samples."""
    try:
        r = requests.get(f"{HEADNERF_URL}/samples", timeout=10)
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"HeadNeRF service unreachable: {e}")


@app.get("/api/headnerf/current")
def headnerf_current():
    """Proxy to HeadNeRF service - get current source/target."""
    try:
        r = requests.get(f"{HEADNERF_URL}/current", timeout=10)
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"HeadNeRF service unreachable: {e}")


@app.post("/api/headnerf/set_source")
def headnerf_set_source(sample_name: str):
    """Proxy to HeadNeRF service - set source sample."""
    try:
        r = requests.post(f"{HEADNERF_URL}/set_source", params={"sample_name": sample_name}, timeout=30)
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"HeadNeRF service unreachable: {e}")


@app.post("/api/headnerf/set_target")
def headnerf_set_target(sample_name: str):
    """Proxy to HeadNeRF service - set target sample."""
    try:
        r = requests.post(f"{HEADNERF_URL}/set_target", params={"sample_name": sample_name}, timeout=30)
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"HeadNeRF service unreachable: {e}")


@app.get("/api/headnerf/render")
def headnerf_render(
    identity: float = 0.0,
    expression: float = 0.0,
    albedo: float = 0.0,
    illumination: float = 0.0,
    pitch: float = 0.0,
    yaw: float = 0.0,
    roll: float = 0.0
):
    """
    Proxy to HeadNeRF service - render with parameters.
    Returns base64 image for real-time display.
    """
    try:
        r = requests.get(
            f"{HEADNERF_URL}/render_quick",
            params={
                "identity": identity,
                "expression": expression,
                "albedo": albedo,
                "illumination": illumination,
                "pitch": pitch,
                "yaw": yaw,
                "roll": roll
            },
            timeout=30
        )
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"HeadNeRF service unreachable: {e}")


@app.post("/api/headnerf/fit")
async def headnerf_fit(image: UploadFile = File(...)):
    """
    Proxy to HeadNeRF service - fit an image to get latent code.
    This runs the full pipeline: mask generation, landmark detection, 3DMM fitting, HeadNeRF fitting.
    """
    try:
        image.file.seek(0)
        files = {"image": (image.filename, image.file, image.content_type)}
        
        # This is a long-running operation
        r = requests.post(f"{HEADNERF_URL}/fit", files=files, timeout=600)
        
        if r.status_code != 200:
            return JSONResponse(status_code=r.status_code, content={"detail": r.text})
        
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"HeadNeRF service unreachable: {e}")

