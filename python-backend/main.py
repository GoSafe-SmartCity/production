import base64
from io import BytesIO
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageDraw
import os

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="GoSafe Computer Vision Detector")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges"],
)

# Mount Next.js public assets folder to stream video files
app.mount("/assets", StaticFiles(directory="../src/public/assets"), name="assets")

@app.post("/process-video")
def trigger_process_video():
    try:
        from process_video import process_flood_video
        process_flood_video()
        return {"status": "success", "message": "Video processed and detections stored successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CameraFeedRequest(BaseModel):
    cameraId: str

@app.get("/")
def read_root():
    return {"status": "online", "service": "GoSafe CV Detection Engine"}

@app.post("/detect")
def detect_flood(req: CameraFeedRequest):
    # Mock camera details near VNU-HCM International University
    stations = {
        "CAM_01": {
            "name": "Camera #1 - Giao lộ Võ Trường Toản (ĐHQG)",
            "latitude": 10.8795,
            "longitude": 106.8020,
            "depth_cm": 45,
            "distance_m": 150,
            "vehicles_detected": 4,
            "severity": "HIGH",
            "reason": "Mưa lớn kéo dài và hệ thống thoát nước quá tải."
        },
        "CAM_02": {
            "name": "Camera #2 - Cổng sau Đại học Quốc tế",
            "latitude": 10.8778,
            "longitude": 106.8005,
            "depth_cm": 25,
            "distance_m": 80,
            "vehicles_detected": 2,
            "severity": "MEDIUM",
            "reason": "Mức ngập trung bình ở rìa đường đi bộ."
        },
        "CAM_03": {
            "name": "Camera #3 - Đường chính VNU (Khu A)",
            "latitude": 10.8755,
            "longitude": 106.7985,
            "depth_cm": 10,
            "distance_m": 30,
            "vehicles_detected": 1,
            "severity": "LOW",
            "reason": "Đọng nước cục bộ ở hố ga."
        }
    }

    station = stations.get(req.cameraId)
    if not station:
        station = {
            "name": f"Camera {req.cameraId} - Khu vực VNU",
            "latitude": 10.8782,
            "longitude": 106.8008,
            "depth_cm": 35,
            "distance_m": 100,
            "vehicles_detected": 3,
            "severity": "MEDIUM",
            "reason": "Ngập úng đường phụ quanh trường."
        }

    # Generate a mock camera frame with overlays using PIL
    # Image size: 640x360
    img = Image.new("RGB", (640, 360), color=(30, 41, 59)) # Slate background
    draw = ImageDraw.Draw(img)

    # Draw simulated road perspectives
    draw.polygon([(0, 360), (280, 150), (360, 150), (640, 360)], fill=(71, 85, 105)) # Road (Slate-600)
    
    # Draw simulated flood water overlay
    draw.polygon([(0, 360), (220, 200), (420, 200), (640, 360)], fill=(29, 78, 216)) # Blue-700

    # No need to draw vehicle bounding boxes anymore, focus on flood area segment

    # Telemetry text drawn directly (avoiding font file dependencies for system cross-compatibility)
    draw.rectangle([10, 10, 380, 110], fill=(15, 23, 42), outline=(51, 65, 85), width=2)
    
    # Render direct line overlays
    # Save to base64
    buffered = BytesIO()
    img.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

    return {
        "cameraId": req.cameraId,
        "name": station["name"],
        "latitude": station["latitude"],
        "longitude": station["longitude"],
        "depthCm": station["depth_cm"],
        "distanceM": station["distance_m"],
        "vehiclesDetected": station["vehicles_detected"],
        "severity": station["severity"],
        "reason": station["reason"],
        "image": f"data:image/jpeg;base64,{img_str}"
    }
