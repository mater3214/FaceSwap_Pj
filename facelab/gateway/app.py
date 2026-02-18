from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import requests
import asyncio
from pathlib import Path
import uuid

app = FastAPI(title="FaceLab Hub")

# CORS Middleware - Allow React frontend to call API
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
LIVE_URL = "http://127.0.0.1:8004"  # Live deepfake service endpoint

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR.mkdir(exist_ok=True)

# Shared outputs directory for cross-tool result reuse
SHARED_OUTPUTS = (BASE_DIR.parent / "shared_storage" / "outputs").resolve()
SHARED_OUTPUTS.mkdir(parents=True, exist_ok=True)

# Serve static files (for displaying results)
# NOTE: /results files are served via API route below (for CORS support)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    # Hub page (currently only SimSwap enabled)
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
def health():
    return {"status": "ok", "service": "gateway"}


# ====== Results API (Cross-Tool Reuse) ======

@app.get("/api/results")
def list_results():
    """List recent result images from all tools for cross-tool reuse."""
    import time
    items = []
    tool_dirs = {"simswap": "SimSwap", "background_removal": "BG Removal", "headnerf": "HeadNeRF"}

    # Skip intermediate service files that cause duplicates
    SKIP_PREFIXES = ("result_whole_swap",)

    for folder_name, tool_label in tool_dirs.items():
        folder = SHARED_OUTPUTS / folder_name
        if not folder.exists():
            continue
        for f in folder.iterdir():
            if f.is_file() and f.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'):
                # Skip intermediate files from the service (they cause duplicates)
                if any(f.name.startswith(prefix) for prefix in SKIP_PREFIXES):
                    continue
                items.append({
                    "filename": f.name,
                    "tool": folder_name,
                    "toolLabel": tool_label,
                    "url": f"/results/{folder_name}/{f.name}",
                    "timestamp": f.stat().st_mtime,
                    "size": f.stat().st_size,
                })

    # Sort by most recent first
    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"results": items[:50]}  # Limit to 50 most recent


@app.get("/results/{tool}/{filename}")
def serve_result_file(tool: str, filename: str):
    """Serve result files with proper CORS headers (replaces StaticFiles mount)."""
    safe_tools = {"simswap", "background_removal", "headnerf"}
    if tool not in safe_tools:
        raise HTTPException(400, "Invalid tool name")
    file_path = SHARED_OUTPUTS / tool / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(file_path))


@app.post("/api/results/save")
async def save_edited_result(image: UploadFile = File(...), tool: str = Form("simswap")):
    """Save an edited image back to shared results for cross-tool reuse."""
    safe_tools = {"simswap", "background_removal", "headnerf"}
    if tool not in safe_tools:
        raise HTTPException(400, "Invalid tool name")

    out_dir = SHARED_OUTPUTS / tool
    out_dir.mkdir(parents=True, exist_ok=True)
    ts_name = f"edited_{uuid.uuid4().hex[:8]}.png"
    out_path = out_dir / ts_name

    try:
        image.file.seek(0)
        data = image.file.read()
        if not data:
            raise HTTPException(400, "Empty file")
        out_path.write_bytes(data)
    except Exception as e:
        raise HTTPException(500, f"Failed to save: {e}")

    return {"ok": True, "filename": ts_name, "url": f"/results/{tool}/{ts_name}"}


@app.delete("/api/results/{tool}/{filename}")
def delete_result(tool: str, filename: str):
    """Delete a specific result file."""
    safe_tools = {"simswap", "background_removal", "headnerf"}
    if tool not in safe_tools:
        raise HTTPException(400, "Invalid tool name")

    file_path = SHARED_OUTPUTS / tool / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")

    file_path.unlink()
    return {"ok": True, "deleted": filename}


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
    out_path = STATIC_DIR / "simswap_result.png"
    out_path.write_bytes(r.content)

    # Also save a timestamped copy for cross-tool result reuse
    import time
    simswap_out = SHARED_OUTPUTS / "simswap"
    simswap_out.mkdir(parents=True, exist_ok=True)
    ts_name = f"simswap_{uuid.uuid4().hex[:8]}.png"
    (simswap_out / ts_name).write_bytes(r.content)

    return {"ok": True, "result_url": "/static/simswap_result.png"}




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

    out_path = STATIC_DIR / "simswap_result_multi.png"
    out_path.write_bytes(r.content)

    return {"ok": True, "result_url": "/static/simswap_result_multi.png"}


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

        for i, item in enumerate(resp_json.get("results", [])):
            if isinstance(item, dict):
                path = item.get("url", "")
                metadata = {k: v for k, v in item.items() if k != "url"}
            else:
                path = item
                metadata = {}

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
                    
                    if metadata:
                        res_obj = {"url": f"/static/{out_name}"}
                        res_obj.update(metadata)
                        results.append(res_obj)
                    else:
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


# ====== Live Deepfake Endpoints ======

@app.get("/api/live/health")
def live_health():
    """Proxy to Live service health check."""
    try:
        r = requests.get(f"{LIVE_URL}/health", timeout=5)
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Live service unreachable: {e}")


@app.post("/api/live/prepare_source")
async def live_prepare_source(src: UploadFile = File(...)):
    """Proxy to Live service - prepare source face for live swapping."""
    try:
        src.file.seek(0)
        files = {"src": (src.filename, src.file, src.content_type)}
        r = requests.post(f"{LIVE_URL}/prepare_source", files=files, timeout=60)

        if r.status_code != 200:
            return JSONResponse(status_code=r.status_code, content={"detail": r.text})

        return r.json()
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Live service unreachable (port 8004 not running). Start it with: conda activate simswap && cd live_service && python -m uvicorn app:app --port 8004. Error: {e}"
        )


@app.websocket("/api/live/ws/swap")
async def live_ws_proxy(websocket: WebSocket, session_id: str = ""):
    """WebSocket proxy: relay frames between frontend and live_service."""
    await websocket.accept()

    import websockets as ws_lib

    backend_uri = f"ws://127.0.0.1:8004/ws/swap?session_id={session_id}"

    try:
        async with ws_lib.connect(backend_uri) as backend_ws:
            async def forward_to_backend():
                """Frontend → Backend"""
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await backend_ws.send(data)
                except WebSocketDisconnect:
                    pass
                except Exception:
                    pass

            async def forward_to_frontend():
                """Backend → Frontend"""
                try:
                    async for message in backend_ws:
                        if isinstance(message, bytes):
                            await websocket.send_bytes(message)
                        else:
                            await websocket.send_text(message)
                except Exception:
                    pass

            # Run both directions concurrently
            done, pending = await asyncio.wait(
                [asyncio.create_task(forward_to_backend()),
                 asyncio.create_task(forward_to_frontend())],
                return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()

    except Exception as e:
        print(f"Live WS proxy error: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
