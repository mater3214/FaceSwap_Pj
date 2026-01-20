"""
HeadNeRF FastAPI Service

This service provides REST API endpoints for HeadNeRF head generation.
Run with: uvicorn app:app --host 0.0.0.0 --port 8003 --reload
"""

from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import torch
import cv2
import numpy as np
import os
import sys
from glob import glob
from pathlib import Path
import uuid
import base64
import shutil
from io import BytesIO

# Set working directory to headnerf folder
BASE = Path(__file__).resolve().parent
HEADNERF_ROOT = BASE / "headnerf"
os.chdir(str(HEADNERF_ROOT))
sys.path.insert(0, str(HEADNERF_ROOT))

# Imports from headnerf
from Utils.HeadNeRFUtils import HeadNeRFUtils

# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(
    title="HeadNeRF Service",
    description="Real-time NeRF-based Parametric Head Model API",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Config & Storage
# -----------------------------
MODEL_PATH = "TrainedModels/model_Reso64.pth"
FITTING_MODEL_PATH = "TrainedModels/model_Reso32HR.pth"
STORE = (BASE / "../../shared_storage").resolve()
OUTPUT = STORE / "outputs" / "headnerf"
TEMP_DIR = HEADNERF_ROOT / "temp_fitting"
FITTED_SAMPLES_DIR = HEADNERF_ROOT / "LatentCodeSamples" / "fitted"
OUTPUT.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)
FITTED_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

# Global model instance
headnerf_model = None
current_source = None
current_target = None


# -----------------------------
# Pydantic Models
# -----------------------------
class RenderParams(BaseModel):
    identity: float = 0.0
    expression: float = 0.0
    albedo: float = 0.0
    illumination: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0
    roll: float = 0.0


class RenderResponse(BaseModel):
    ok: bool
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    error: Optional[str] = None


class SampleInfo(BaseModel):
    name: str
    path: str


# -----------------------------
# Helper Functions
# -----------------------------
def get_model():
    """Get or initialize HeadNeRF model."""
    global headnerf_model, current_source, current_target
    
    if headnerf_model is None:
        model_path = HEADNERF_ROOT / MODEL_PATH
        if not model_path.exists():
            raise HTTPException(
                status_code=500, 
                detail=f"Model not found: {MODEL_PATH}. Please download TrainedModels."
            )
        
        print(f"Loading HeadNeRF model from {model_path}...")
        headnerf_model = HeadNeRFUtils(str(model_path))
        
        # Load default codes
        base_name = os.path.basename(MODEL_PATH)[:-4]
        samples = get_available_samples_internal()
        
        if len(samples) >= 2:
            headnerf_model.update_code_1(str(HEADNERF_ROOT / samples[0]["path"]))
            headnerf_model.update_code_2(str(HEADNERF_ROOT / samples[1]["path"]))
            current_source = samples[0]["name"]
            current_target = samples[1]["name"]
        
        print("HeadNeRF model loaded!")
    
    return headnerf_model


def get_available_samples_internal() -> List[dict]:
    """Get list of available latent code samples (including fitted ones)."""
    base_name = os.path.basename(MODEL_PATH)[:-4]
    samples = []
    
    # Original samples
    samples_dir = HEADNERF_ROOT / f"LatentCodeSamples/{base_name}"
    if samples_dir.exists():
        for s in sorted(glob(str(samples_dir / "*.pth"))):
            samples.append({
                "name": os.path.basename(s), 
                "path": f"LatentCodeSamples/{base_name}/{os.path.basename(s)}"
            })
    
    # Fitted samples
    if FITTED_SAMPLES_DIR.exists():
        for s in sorted(glob(str(FITTED_SAMPLES_DIR / "*.pth"))):
            samples.append({
                "name": os.path.basename(s),
                "path": f"LatentCodeSamples/fitted/{os.path.basename(s)}"
            })
    
    return samples


def image_to_base64(img: np.ndarray) -> str:
    """Convert numpy image to base64 string."""
    _, buffer = cv2.imencode('.png', cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    return base64.b64encode(buffer).decode('utf-8')


# -----------------------------
# API Endpoints
# -----------------------------
@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "headnerf"}


@app.get("/samples", response_model=List[SampleInfo])
def list_samples():
    """List available latent code samples."""
    samples = get_available_samples_internal()
    return [SampleInfo(**s) for s in samples]


@app.get("/current")
def get_current_codes():
    """Get currently loaded source and target codes."""
    return {
        "source": current_source,
        "target": current_target
    }


@app.post("/set_source")
def set_source(sample_name: str = Query(..., description="Sample filename")):
    """Set the source latent code."""
    global current_source
    
    model = get_model()
    base_name = os.path.basename(MODEL_PATH)[:-4]
    
    # Check original samples first, then fitted
    code_path = HEADNERF_ROOT / f"LatentCodeSamples/{base_name}/{sample_name}"
    if not code_path.exists():
        code_path = FITTED_SAMPLES_DIR / sample_name
    
    if not code_path.exists():
        raise HTTPException(404, f"Sample not found: {sample_name}")
    
    model.update_code_1(str(code_path))
    current_source = sample_name
    
    # Return preview
    img = model.source_img
    return {
        "ok": True,
        "sample": sample_name,
        "preview_base64": image_to_base64(img)
    }


@app.post("/set_target")
def set_target(sample_name: str = Query(..., description="Sample filename")):
    """Set the target latent code."""
    global current_target
    
    model = get_model()
    base_name = os.path.basename(MODEL_PATH)[:-4]
    
    # Check original samples first, then fitted
    code_path = HEADNERF_ROOT / f"LatentCodeSamples/{base_name}/{sample_name}"
    if not code_path.exists():
        code_path = FITTED_SAMPLES_DIR / sample_name
    
    if not code_path.exists():
        raise HTTPException(404, f"Sample not found: {sample_name}")
    
    model.update_code_2(str(code_path))
    current_target = sample_name
    
    # Return preview
    img = model.target_img
    return {
        "ok": True,
        "sample": sample_name,
        "preview_base64": image_to_base64(img)
    }


@app.post("/render", response_model=RenderResponse)
def render(params: RenderParams, return_file: bool = False):
    """
    Render an image with the given parameters.
    
    Parameters:
    - identity, expression, albedo, illumination: 0-1 blend between source and target
    - pitch, yaw, roll: -1 to 1 rotation angles
    - return_file: If True, return file URL instead of base64
    """
    try:
        model = get_model()
        
        # Generate image
        img = model.gen_image(
            params.identity,
            params.expression,
            params.albedo,
            params.illumination,
            params.pitch,
            params.yaw,
            params.roll
        )
        
        if return_file:
            # Save to file and return URL
            filename = f"render_{uuid.uuid4().hex[:8]}.png"
            output_path = OUTPUT / filename
            cv2.imwrite(str(output_path), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
            
            return RenderResponse(
                ok=True,
                image_url=f"/outputs/{filename}"
            )
        else:
            # Return base64 (faster for real-time)
            return RenderResponse(
                ok=True,
                image_base64=image_to_base64(img)
            )
            
    except Exception as e:
        return RenderResponse(ok=False, error=str(e))


@app.get("/render_quick")
def render_quick(
    identity: float = 0.0,
    expression: float = 0.0,
    albedo: float = 0.0,
    illumination: float = 0.0,
    pitch: float = 0.0,
    yaw: float = 0.0,
    roll: float = 0.0
):
    """
    Quick render endpoint for real-time updates.
    Returns base64 encoded image for fast client-side display.
    """
    try:
        model = get_model()
        
        img = model.gen_image(
            identity, expression, albedo, illumination,
            pitch, yaw, roll
        )
        
        return {
            "ok": True,
            "image": image_to_base64(img)
        }
        
    except Exception as e:
        return {"ok": False, "error": str(e)}



@app.get("/outputs/{filename}")
def get_output(filename: str):
    """Serve rendered output files."""
    path = OUTPUT / filename
    if not path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(path))


@app.post("/fit")
async def fit_image(image: UploadFile = File(...)):
    """
    Fit an uploaded face image to get a HeadNeRF latent code.
    
    Full pipeline:
    1. Generate head mask
    2. Detect facial landmarks
    3. Fit 3DMM model
    4. Fit HeadNeRF
    5. Save latent code
    
    Returns:
    - ok: bool
    - fitted_name: filename of saved latent code
    - result_image: base64 encoded comparison image
    """
    job_id = uuid.uuid4().hex[:8]
    work_dir = TEMP_DIR / job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Save uploaded image
        img_path = work_dir / f"img_{job_id}.png"
        image.file.seek(0)
        contents = await image.read()
        img_path.write_bytes(contents)
        
        # Step 1: Generate head mask
        sys.path.insert(0, str(HEADNERF_ROOT / "DataProcess"))
        from DataProcess.Gen_HeadMask import GenHeadMask
        from DataProcess.correct_head_mask import correct_hair_mask
        
        mask_gen = GenHeadMask(gpu_id=0)
        
        bgr_img = cv2.imread(str(img_path))
        img_rgb = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
        
        # Manual transform to avoid numpy version conflicts
        # Equivalent to: ToTensor() + Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
        img_float = img_rgb.astype(np.float32) / 255.0
        # Normalize
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img_normalized = (img_float - mean) / std
        # HWC -> CHW and to tensor (use torch.tensor to avoid numpy conflicts)
        img_chw = img_normalized.transpose(2, 0, 1).copy()
        img_tensor = torch.tensor(img_chw, dtype=torch.float32)
        img_tensor = img_tensor.unsqueeze(0).to(mask_gen.device)
        
        with torch.set_grad_enabled(False):
            pred_res = mask_gen.net(img_tensor)
            out = pred_res[0]
        
        res = out.squeeze(0).cpu().numpy().argmax(0)
        res = np.ascontiguousarray(res, dtype=np.uint8)
        lut = np.ascontiguousarray(mask_gen.lut)
        res = cv2.LUT(res, lut)
        res = correct_hair_mask(res)
        res[res != 0] = 255
        
        mask_path = work_dir / f"img_{job_id}_mask.png"
        cv2.imwrite(str(mask_path), res)
        
        # Step 2: Generate landmarks
        import face_alignment
        fa = face_alignment.FaceAlignment(face_alignment.LandmarksType.TWO_D, flip_input=False)
        
        # Reconstruct numpy array to avoid numpy version conflict
        # Convert to list then back to new numpy array
        img_for_fa = np.array(img_rgb.tolist(), dtype=np.uint8)
        lm_result = fa.get_landmarks(img_for_fa)
        if lm_result is None:
            raise ValueError("Could not detect face in image")
        
        lm_path = work_dir / f"img_{job_id}_lm2d.txt"
        preds = lm_result[0]
        with open(lm_path, "w") as f:
            for pt in preds:
                f.write(f"{pt[0]}\n")
                f.write(f"{pt[1]}\n")
        
        # Step 3: Fit 3DMM
        sys.path.insert(0, str(HEADNERF_ROOT / "Fitting3DMM"))
        from Fitting3DMM.FittingNL3DMM import FittingNL3DMM
        
        fitter_3dmm = FittingNL3DMM(
            img_size=512,
            intermediate_size=256,
            gpu_id=0,
            batch_size=1,
            img_dir=str(work_dir)
        )
        fitter_3dmm.main_process()
        
        # Find 3DMM result
        pkl_files = list(work_dir.glob("*_nl3dmm.pkl"))
        if not pkl_files:
            raise FileNotFoundError("3DMM fitting failed")
        para_3dmm_path = pkl_files[0]
        
        # Step 4: Fit HeadNeRF
        from FittingSingleImage import FittingImage
        
        output_dir = work_dir / "output"
        output_dir.mkdir(exist_ok=True)
        
        fitter = FittingImage(str(HEADNERF_ROOT / FITTING_MODEL_PATH), str(output_dir), gpu_id=0)
        fitter.fitting_single_images(
            img_path=str(img_path),
            mask_path=str(mask_path),
            para_3dmm_path=str(para_3dmm_path),
            tar_code_path=None,
            save_root=str(output_dir)
        )
        
        # Find latent code
        pth_files = list(output_dir.glob("LatentCodes_*.pth"))
        if not pth_files:
            raise FileNotFoundError("HeadNeRF fitting failed")
        
        latent_code_path = pth_files[0]
        
        # Copy to fitted samples
        fitted_name = f"fitted_{job_id}.pth"
        fitted_path = FITTED_SAMPLES_DIR / fitted_name
        shutil.copy(latent_code_path, fitted_path)
        
        # Get result image
        result_image_b64 = None
        result_images = list(output_dir.glob("FittingRes_*.png"))
        if result_images:
            result_img = cv2.imread(str(result_images[0]))
            _, buffer = cv2.imencode('.png', result_img)
            result_image_b64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "ok": True,
            "fitted_name": fitted_name,
            "result_image": result_image_b64
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"ok": False, "error": str(e)}
    
    finally:
        # Optional: cleanup
        # shutil.rmtree(work_dir, ignore_errors=True)
        pass


# -----------------------------
# Startup Event
# -----------------------------
@app.on_event("startup")
async def startup_event():
    """Pre-load model on startup."""
    try:
        get_model()
        print("✅ HeadNeRF model pre-loaded successfully!")
    except Exception as e:
        print(f"⚠️ Failed to pre-load model: {e}")
        print("Model will be loaded on first request.")


# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)

