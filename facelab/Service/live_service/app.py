import sys
import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import uuid
import cv2
import numpy as np

# Setup paths to reuse SimSwap codebase
BASE = Path(__file__).resolve().parent
# Point to the existing SimSwap implementation in simswap_service
SIMSWAP_SERVICE_DIR = (BASE / "../simswap_service").resolve()
SIMSWAP_ROOT = (SIMSWAP_SERVICE_DIR / "SimSwap").resolve()

# Add to sys.path so we can import modules
sys.path.insert(0, str(SIMSWAP_SERVICE_DIR)) # For live_handler (if we moved it there, but we will move it here)
sys.path.insert(0, str(SIMSWAP_ROOT))        # For SimSwap modules

# We will create live_handler.py in this directory for cleaner separation, 
# but it will import from SimSwap
try:
    from live_handler import SimSwapLive
except ImportError:
    # If not found here, try to add current dir to path
    sys.path.insert(0, str(BASE))
    from live_handler import SimSwapLive

app = FastAPI(title="FaceLab Live Service")

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Storage
UPLOAD_DIR = (BASE / "../../shared_storage/uploads").resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

live_handler = None
live_sessions = {}

@app.on_event("startup")
async def startup_event():
    global live_handler
    print("Initializing Live Service...")
    try:
        # Pass the customized root to SimSwapLive so it finds models
        live_handler = SimSwapLive(root_dir=SIMSWAP_ROOT)
        print("Live Service Ready!")
    except Exception as e:
        print(f"Failed to initialize SimSwapLive: {e}")

@app.get("/health")
def health_check():
    if live_handler is None:
        raise HTTPException(503, "Service initializing or failed")
    return {"status": "ok", "service": "live_service"}

@app.post("/prepare_source")
def prepare_source(src: UploadFile = File(...)):
    if live_handler is None:
         raise HTTPException(503, "Service not ready")
         
    job = uuid.uuid4().hex[:10]
    src_path = UPLOAD_DIR / f"{job}_live_src.png"
    
    try:
        with open(src_path, "wb") as buffer:
            buffer.write(src.file.read())
            
        latent_id = live_handler.prepare_source(str(src_path))
        session_id = uuid.uuid4().hex
        live_sessions[session_id] = latent_id
        
        return {"session_id": session_id, "message": "Source prepared"}
    except Exception as e:
        print(f"Error preparing source: {e}")
        raise HTTPException(500, f"Failed to prepare source: {e}")

@app.post("/swap")
async def swap(session_id: str = Form(...), frame: UploadFile = File(...)):
    if session_id not in live_sessions:
        raise HTTPException(400, "Invalid or expired session_id")
    
    if live_handler is None:
        raise HTTPException(503, "Service not ready")

    # Read frame directly from memory
    contents = await frame.read()
    nparr = np.frombuffer(contents, np.uint8)
    img_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img_frame is None:
        raise HTTPException(400, "Invalid frame data")

    try:
        latent_id = live_sessions[session_id]
        result_frame = live_handler.swap(img_frame, latent_id)
        
        # Encode back to JPEG
        _, img_encoded = cv2.imencode('.jpg', result_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        return Response(content=img_encoded.tobytes(), media_type="image/jpeg")
    except Exception as e:
        # print(f"Error in swap: {e}")
        # Return original on error to keep stream flowing
        return Response(content=contents, media_type="image/jpeg")

@app.websocket("/ws/swap")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    if session_id not in live_sessions:
        await websocket.close(code=4000, reason="Invalid session_id")
        return

    if live_handler is None:
        await websocket.close(code=4001, reason="Service not ready")
        return
        
    latent_id = live_sessions[session_id]
    
    try:
        while True:
            # Receive bytes (frame)
            data = await websocket.receive_bytes()
            
            # Decode
            nparr = np.frombuffer(data, np.uint8)
            img_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img_frame is None:
                continue
                
            # Process
            # Note: swap might need to be async or run in threadpool if it blocks too long
            # For now running directly assuming it's fast enough or we accept the block
            try:
                result_frame = live_handler.swap(img_frame, latent_id)
                # Encode
                _, img_encoded = cv2.imencode('.jpg', result_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                await websocket.send_bytes(img_encoded.tobytes())
            except Exception as e:
                print(f"Swap error in WS: {e}")
                # Send back original on error
                await websocket.send_bytes(data)

    except WebSocketDisconnect:
        print(f"Client disconnected: {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    # Run on port 8003
    uvicorn.run(app, host="0.0.0.0", port=8004)
