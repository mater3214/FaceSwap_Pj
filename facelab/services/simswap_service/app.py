from fastapi import FastAPI, UploadFile, File, HTTPException
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
    arc_path = r"D:\Facelab\services\simswap_service\SimSwap\arcface_model\arcface_checkpoint.tar"

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
def run_multi(src: List[UploadFile] = File(...), dst: UploadFile = File(...)):
    try:
        from SimSwap.test_wholeimage_swapmulti import run_swap
    except Exception as e:
        import shutil, os
        def run_swap(src, dst, output_dir, crop_size=224, use_mask=False, no_simswaplogo=True):
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
    arc_path = r"D:\Facelab\services\simswap_service\SimSwap\arcface_model\arcface_checkpoint.tar"

    try:
        # pass multiple source paths joined with ';' — test_wholeimage_swapmulti supports this
        pic_a_arg = ';'.join(src_paths)
        run_swap(pic_a_arg, str(dst_path), str(OUTPUT), crop_size=224, arc_path=arc_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SimSwap (multi) failed: {e}")

    out_img = max(OUTPUT.glob("*.*"), key=lambda p: p.stat().st_mtime, default=None)
    if out_img is None:
        raise HTTPException(500, "No output produced")

    return FileResponse(str(out_img))
