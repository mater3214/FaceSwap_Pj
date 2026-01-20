from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uuid  # เพิ่มแล้ว
import io
import numpy as np
from PIL import Image, ImageOps, ImageFilter # เพิ่ม ImageOps, ImageFilter
from rembg import remove, new_session

app = FastAPI(title="Background Removal Service (Worker)")

BASE = Path(__file__).resolve().parent
STORE = (BASE / "../../shared_storage").resolve()
OUTPUT = STORE / "outputs" / "background_removal"
OUTPUT.mkdir(parents=True, exist_ok=True)

app.mount("/static/background_removal", StaticFiles(directory=str(OUTPUT)), name="background_removal_static")

# โหลด model
rembg_session = new_session("u2net")

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
        
        # 1. ลบพื้นหลัง (AI Running)
        output_bytes = remove(input_bytes, session=rembg_session)
        if output_bytes is None:
            raise ValueError("rembg returned None")

        result_image_rgba = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
        
        # เตรียมตัวแปร
        result_urls = []
        colors_used = []

        # --- MODE 1: TRANSPARENT (PNG) ---
        if mode == "transparent":
            result_path = OUTPUT / f"{job_id}_transparent.png"
            result_image_rgba.save(result_path, format="PNG")
            result_urls.append(f"/static/background_removal/{result_path.name}")
            colors_used.append({"label": "Transparent"})

        # --- MODE 2: CUSTOM IMAGE ---
        elif mode == "image":
            if not bg_image:
                raise HTTPException(status_code=400, detail="Background image is required for image mode")
            
            bg_bytes = await bg_image.read()
            mask = np.array(result_image_rgba.split()[-1])
            foreground = np.array(result_image_rgba.convert("RGB"))
            
            result_arr = replace_background_image(foreground, mask, bg_bytes)
            
            result_path = OUTPUT / f"{job_id}_bg_image.png"
            Image.fromarray(result_arr).save(result_path)
            result_urls.append(f"/static/background_removal/{result_path.name}")
            colors_used.append({"label": "Custom Image"})
            
        # --- MODE 3: BLUR BACKGROUND (NEW) ---
        elif mode == "blur":
            # สร้างภาพฉากหลังที่เบลอจากภาพต้นฉบับ
            # หมายเหตุ: เราต้องใช้ภาพต้นฉบับเดิม (input_bytes) เป็นฉากหลัง แต่ในที่นี้เราใช้ result_image_rgba แปลงกลับก็ได้
            # แต่ดีที่สุดคือใช้ภาพต้นฉบับ ถ้าจะให้ง่าย ใช้ภาพที่ลบพื้นแล้วมาซ้อนบนภาพเบลอ
            
            # โหลดภาพต้นฉบับเต็มๆ เพื่อมาทำเบลอ
            original_img = Image.open(io.BytesIO(input_bytes)).convert("RGB")
            bg_blurred = original_img.filter(ImageFilter.GaussianBlur(radius=15))
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

        # --- MODE 4: SOLID COLOR (DEFAULT) ---
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