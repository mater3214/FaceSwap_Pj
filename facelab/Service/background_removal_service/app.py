from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uuid
import io
import numpy as np
from PIL import Image, ImageOps, ImageFilter
from rembg import remove, new_session

# Optional: YOLO for multi-person segmentation
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("⚠️  ultralytics not installed — 'multi' mode disabled. Install with: pip install ultralytics>=8.0.0")

# Initialize YOLO model (only if available)
yolo_model = None
if YOLO_AVAILABLE:
    try:
        yolo_model = YOLO("yolov8n-seg.pt")
        print("✅ YOLO model loaded successfully")
    except Exception as e:
        print(f"⚠️  Failed to load YOLO model: {e}")

app = FastAPI(title="Background Removal Service (Worker)")

BASE = Path(__file__).resolve().parent
STORE = (BASE / "../../shared_storage").resolve()
OUTPUT = STORE / "outputs" / "background_removal"
OUTPUT.mkdir(parents=True, exist_ok=True)

app.mount("/static/background_removal", StaticFiles(directory=str(OUTPUT)), name="background_removal_static")

# Load Models
rembg_session = new_session("u2net")
yolo_model = YOLO("yolov8m-seg.pt") if YOLO_AVAILABLE else None

def replace_background_color(foreground, mask, background_color):
    """Replace background with solid color"""
    mask_normalized = mask.astype(np.float32) / 255.0
    h, w = foreground.shape[:2]
    bg = np.ones((h, w, 3), dtype=np.uint8) * np.array(background_color, dtype=np.uint8)
    mask_3d = np.stack([mask_normalized] * 3, axis=2)
    return (foreground * mask_3d + bg * (1 - mask_3d)).astype(np.uint8)

def replace_background_image(foreground, mask, bg_image_bytes):
    """Replace background with another image (Fix Aspect Ratio)"""
    bg_pil = Image.open(io.BytesIO(bg_image_bytes)).convert("RGB")
    
    # ขนาดของ Foreground (w, h)
    h, w = foreground.shape[:2]
    size = (w, h)
    
    # --- ใช้ ImageOps.fit เพื่อ Crop ให้พอดีโดยภาพไม่เบี้ยว ---
    bg_pil = ImageOps.fit(bg_pil, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    bg_arr = np.array(bg_pil)

    # Blend
    mask_normalized = mask.astype(np.float32) / 255.0
    mask_3d = np.stack([mask_normalized] * 3, axis=2)
    
    return (foreground * mask_3d + bg_arr * (1 - mask_3d)).astype(np.uint8)

@app.post("/run")
async def run(
    image: UploadFile = File(...),
    bg_image: UploadFile = File(None),
    colors: str = Form(None),
    mode: str = Form("color") # transparent, color, image, blur
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    job_id = uuid.uuid4().hex[:10]

    try:
        input_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(input_bytes)).convert("RGB")
        
        result_urls = []
        colors_used = []

        # --- MODE: MULTI (Multi-Person Separation) ---
        if mode == "multi":
            if not YOLO_AVAILABLE or yolo_model is None:
                raise HTTPException(status_code=400, detail="Multi mode requires 'ultralytics' package. Install with: pip install ultralytics>=8.0.0")
            # Use YOLOv8-seg to detect separate people
            results = yolo_model(pil_image)
            
            # Check if we have any detections
            if results and results[0].masks:
                masks = results[0].masks.data.cpu().numpy() # (N, H, W)
                boxes = results[0].boxes.data.cpu().numpy() # (N, 6)
                
                # Resize masks to original image size
                # YOLO masks are usually smaller, need to resize
                orig_w, orig_h = pil_image.size
                
                for i, mask_tensor in enumerate(masks):
                    # Check class (0 is person in COCO)
                    cls = int(boxes[i, 5])
                    if cls != 0: continue # Skip non-person

                    # Convert mask to full size
                    # Provide a robust resizing
                    mask_img = Image.fromarray((mask_tensor * 255).astype(np.uint8))
                    mask_img = mask_img.resize((orig_w, orig_h), resample=Image.NEAREST)
                    mask_np = np.array(mask_img)

                    # Create transparent PNG for this person
                    rgba = np.array(pil_image.convert("RGBA"))
                    rgba[..., 3] = mask_np # Set alpha channel
                    
                    # Crop to bounding box to minimize empty space
                    bbox = boxes[i, :4] # x1, y1, x2, y2
                    x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
                    
                    # Ensure within bounds
                    x1 = max(0, x1); y1 = max(0, y1)
                    x2 = min(orig_w, x2); y2 = min(orig_h, y2)
                    
                    # Crop the RGBA image
                    person_crop = Image.fromarray(rgba).crop((x1, y1, x2, y2))
                    
                    out_path = OUTPUT / f"{job_id}_person_{i}.png"
                    person_crop.save(out_path, format="PNG")
                    
                    # Return structured object
                    result_urls.append({
                        "url": f"/static/background_removal/{out_path.name}",
                        "box": [x1, y1, x2 - x1, y2 - y1], # x, y, w, h
                        "original_size": [orig_w, orig_h]
                    })
                    
                if not result_urls:
                    # Fallback if no person found by YOLO but mode is 'image'
                    # Use Rembg
                    output_bytes = remove(input_bytes, session=rembg_session)
                    path = OUTPUT / f"{job_id}_rembg.png"
                    with open(path, "wb") as f: f.write(output_bytes)
                    result_urls.append(f"/static/background_removal/{path.name}")
                    
            else:
                # No masks found, fallback to Rembg (entire foreground)
                output_bytes = remove(input_bytes, session=rembg_session)
                path = OUTPUT / f"{job_id}_rembg_fallback.png"
                with open(path, "wb") as f: f.write(output_bytes)
                result_urls.append(f"/static/background_removal/{path.name}")
                
            colors_used.append({"label": "Multi-Layer Composition"})

        # --- MODE: OTHER (Standard Single Layer) ---
        else:
            # 1. ลบพื้นหลัง (AI Running - Standard)
            output_bytes = remove(input_bytes, session=rembg_session)
            if output_bytes is None:
                raise ValueError("rembg returned None")

            result_image_rgba = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
            
            # --- TRANSPARENT or IMAGE (Frontend Composition) ---
            if mode == "transparent" or mode == "image":
                result_path = OUTPUT / f"{job_id}_transparent.png"
                result_image_rgba.save(result_path, format="PNG")
                result_urls.append(f"/static/background_removal/{result_path.name}")
                colors_used.append({"label": "Transparent"})

            # --- BLUR ---
            elif mode == "blur":
                bg_blurred = pil_image.filter(ImageFilter.GaussianBlur(radius=15))
                bg_arr = np.array(bg_blurred)
                
                mask = np.array(result_image_rgba.split()[-1])
                foreground = np.array(result_image_rgba.convert("RGB"))
                
                mask_normalized = mask.astype(np.float32) / 255.0
                mask_3d = np.stack([mask_normalized] * 3, axis=2)
                result_arr = (foreground * mask_3d + bg_arr * (1 - mask_3d)).astype(np.uint8)
                
                result_path = OUTPUT / f"{job_id}_blur.png"
                Image.fromarray(result_arr).save(result_path)
                result_urls.append(f"/static/background_removal/{result_path.name}")
                colors_used.append({"label": "Blur Effect"})

            # --- COLOR ---
            else: 
                mask = np.array(result_image_rgba.split()[-1])
                foreground = np.array(result_image_rgba.convert("RGB"))

                if colors is None or colors.strip() == "":
                    colors = "0,0,0"
                
                color_strings = colors.split("|")
                color_list = []
                for color_str in color_strings:
                    try:
                        rgb = [int(x.strip()) for x in color_str.split(",")]
                        color_list.append(tuple(max(0, min(255, x)) for x in rgb))
                    except:
                        pass
                
                if not color_list: color_list = [(0,0,0)]

                for i, bg_color in enumerate(color_list):
                    result_arr = replace_background_color(foreground, mask, bg_color)
                    result_path = OUTPUT / f"{job_id}_color_{i}.png"
                    Image.fromarray(result_arr).save(result_path)
                    result_urls.append(f"/static/background_removal/{result_path.name}")
                
                colors_used = [{"r": c[0], "g": c[1], "b": c[2]} for c in color_list]

        return {
            "ok": True,
            "job_id": job_id,
            "results": result_urls,
            "colors_used": colors_used,
            "mode": mode
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "service": "background_removal"}