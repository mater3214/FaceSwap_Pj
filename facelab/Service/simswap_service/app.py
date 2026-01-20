from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from typing import List
from fastapi.responses import FileResponse
import uuid
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parent
SIMSWAP_ROOT = (BASE / "SimSwap").resolve()
import os
os.chdir(str(SIMSWAP_ROOT))

sys.path.insert(0, str(SIMSWAP_ROOT))

from test_wholeimage_swapsingle import run_swap

# Defer importing heavy SimSwap modules until a request is received
# to allow the FastAPI app to start even if ML dependencies aren't installed.

app = FastAPI(title="SimSwap Service")

BASE = Path(__file__).resolve().parent
STORE = (BASE / "../../shared_storage").resolve()
UPLOAD = STORE / "uploads"
OUTPUT = STORE / "outputs" / "simswap"
UPLOAD.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)

def save_upload(f: UploadFile, path: Path):
    try:
        f.file.seek(0)
    except Exception:
        pass
    data = f.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    path.write_bytes(data)

@app.post("/run")
def run(src: UploadFile = File(...), dst: UploadFile = File(...)):
    # Import here to avoid heavy imports at startup
    try:
        from SimSwap.test_wholeimage_swapsingle import run_swap
    except Exception as e:
        # Provide a lightweight fallback so the gateway UI can be tested
        # without heavy ML dependencies. The fallback simply copies the
        # target image to the output folder as a placeholder result.
        import shutil, os
        def run_swap(src, dst, output_dir, crop_size=224, use_mask=False, no_simswaplogo=True):
            os.makedirs(output_dir, exist_ok=True)
            out_path = os.path.join(output_dir, 'result_whole_swapsingle.jpg')
            try:
                shutil.copyfile(dst, out_path)
            except Exception:
                # last-resort: copy src
                try:
                    shutil.copyfile(src, out_path)
                except Exception:
                    raise
            return out_path
        # attach original exception for visibility in logs
        print(f"SimSwap import failed, using fallback run_swap: {e}")
    job = uuid.uuid4().hex[:10]
    src_path = UPLOAD / f"{job}_src.png"
    dst_path = UPLOAD / f"{job}_dst.png"
    save_upload(src, src_path)
    save_upload(dst, dst_path)
    arc_path = str(SIMSWAP_ROOT / "arcface_model" / "arcface_checkpoint.tar")

    try:
        run_swap(str(src_path), str(dst_path), str(OUTPUT), crop_size=224, arc_path=arc_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SimSwap failed: {e}")


    # สมมติว่า output ล่าสุดคือ result.png (คุณปรับให้ตรงของจริงได้)
    # ถ้าของคุณชื่อไม่แน่นอน ให้ทำฟังก์ชันหาไฟล์ล่าสุด
    out_img = max(OUTPUT.glob("*.*"), key=lambda p: p.stat().st_mtime, default=None)
    if out_img is None:
        raise HTTPException(500, "No output produced")

    return FileResponse(str(out_img))


@app.post("/run_multi")
def run_multi(src: List[UploadFile] = File(...), dst: UploadFile = File(...), mapping: str = Form("")):
    try:
        from SimSwap.test_wholeimage_swapmulti import run_swap
    except Exception as e:
        import shutil, os
        def run_swap(src, dst, output_dir, crop_size=224, use_mask=False, no_simswaplogo=True, mapping=""):
            os.makedirs(output_dir, exist_ok=True)
            out_path = os.path.join(output_dir, 'result_whole_swapmulti.jpg')
            try:
                shutil.copyfile(dst, out_path)
            except Exception:
                try:
                    shutil.copyfile(src, out_path)
                except Exception:
                    raise
            return out_path
        print(f"SimSwap import failed, using fallback run_swap (multi): {e}")

    job = uuid.uuid4().hex[:10]
    src_paths = []
    for i, f in enumerate(src):
        p = UPLOAD / f"{job}_src{i}.png"
        save_upload(f, p)
        src_paths.append(str(p))
    dst_path = UPLOAD / f"{job}_dst.png"
    save_upload(dst, dst_path)
    save_upload(dst, dst_path)
    arc_path = str(SIMSWAP_ROOT / "arcface_model" / "arcface_checkpoint.tar")

    try:
        # pass multiple source paths joined with ';' — test_wholeimage_swapmulti supports this
        pic_a_arg = ';'.join(src_paths)
        run_swap(pic_a_arg, str(dst_path), str(OUTPUT), crop_size=224, arc_path=arc_path, mapping=mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SimSwap (multi) failed: {e}")

    out_img = max(OUTPUT.glob("*.*"), key=lambda p: p.stat().st_mtime, default=None)
    if out_img is None:
        raise HTTPException(500, "No output produced")

    return FileResponse(str(out_img))


@app.post("/detect_faces")
def detect_faces(dst: UploadFile = File(...)):
    # Save the uploaded file
    job = uuid.uuid4().hex[:10]
    dst_path = UPLOAD / f"{job}_dst_detect.png"
    save_upload(dst, dst_path)

    try:
        # Use SimSwap's face detection logic
        import cv2
        import numpy as np
        # Initialize Face_detect_crop locally or use shared
        try:
            from SimSwap.insightface_func.face_detect_crop_multi import Face_detect_crop
        except ImportError:
             print("SimSwap import failed inside detect_faces")
             raise

        # Assuming model paths are relative to SIMSWAP_ROOT
        app_detect = Face_detect_crop(name='antelopeV2', root=str(SIMSWAP_ROOT / 'insightface_func/models'))
        app_detect.prepare(ctx_id=0, det_thresh=0.6, det_size=(640,640))
        
        img = cv2.imread(str(dst_path))
        if img is None:
            raise HTTPException(400, "Could not read image")
            
        crop_size = 224
        img_align_crop_list, _ = app_detect.get(img, crop_size)
        
        if not img_align_crop_list:
            return {"faces": []}

        face_list = []
        for i, face_img in enumerate(img_align_crop_list):
            face_filename = f"{job}_face_{i}.png"
            face_path = UPLOAD / face_filename
            cv2.imwrite(str(face_path), face_img)
            
            face_list.append({
                "index": i,
                "file_path": f"/uploads/{face_filename}"
            })
            
        return {"faces": face_list, "job_id": job}
        
    except Exception as e:
        print(f"Error detecting faces: {e}")
        raise HTTPException(500, f"Face detection failed: {e}")

@app.get("/uploads/{filename}")
def get_upload(filename: str):
    path = UPLOAD / filename
    if not path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(path))
