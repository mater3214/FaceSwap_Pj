from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import uuid

app = FastAPI(title="DiFaReLi Service")

BASE = Path(__file__).resolve().parent
STORE = (BASE / "../../shared_storage").resolve()
UPLOAD = STORE / "uploads"
OUTPUT = STORE / "outputs" / "difareli"
UPLOAD.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)

def save_upload(f: UploadFile, path: Path):
    path.write_bytes(f.file.read())

@app.post("/run")
def run(img: UploadFile = File(...), ref: UploadFile = File(...)):
    job = uuid.uuid4().hex[:10]
    img_path = UPLOAD / f"{job}_img.png"
    ref_path = UPLOAD / f"{job}_ref.png"
    save_upload(img, img_path)
    save_upload(ref, ref_path)

    try:
        # run_relight(str(img_path), str(ref_path), str(OUTPUT))
        pass
    except Exception as e:
        raise HTTPException(500, f"DiFaReLi failed: {e}")

    out_img = max(OUTPUT.glob("*.*"), key=lambda p: p.stat().st_mtime, default=None)
    if out_img is None:
        raise HTTPException(500, "No output produced")

    return FileResponse(str(out_img))
