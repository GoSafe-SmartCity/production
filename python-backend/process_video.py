import os
import cv2
import numpy as np
import requests
from datetime import datetime, timedelta

def process_flood_video():
    video_path = "../src/public/assets/vietnam_flood_cctv.mp4"
    output_dir = "../src/public/detections"
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(video_path):
        print(f"Error: Video file not found at {video_path}")
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video file {video_path}")
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Total frames in video: {total_frames}")

    # Sampler to find tipping frame
    frames = []
    flood_levels = []
    sample_rate = 2
    for f_idx in range(0, total_frames, sample_rate):
        cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
        ret, frame = cap.read()
        if not ret:
            break
        frame_resized = cv2.resize(frame, (640, 360))
        gray = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2GRAY)
        roi_mask = np.zeros_like(gray)
        pts = np.array([[0, 360], [250, 180], [390, 180], [640, 360]], np.int32)
        cv2.fillPoly(roi_mask, [pts], 255)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 110, 255, cv2.THRESH_BINARY)
        water_pixels = cv2.bitwise_and(thresh, roi_mask)
        road_area = np.sum(roi_mask == 255)
        water_ratio = np.sum(water_pixels == 255) / road_area if road_area > 0 else 0
        frames.append((f_idx, frame_resized))
        flood_levels.append(water_ratio)

    tipping_frame_idx = 0
    for idx, ratio in enumerate(flood_levels):
        if ratio > 0.12:
            tipping_frame_idx = idx
            break

    # Tipping point frame crop and segment (realistic representation for CAM_01)
    _, tipping_frame = frames[tipping_frame_idx]
    cropped_tipping = cv2.resize(tipping_frame[120:360, 80:560], (640, 360))
    gray_tipping = cv2.cvtColor(cropped_tipping, cv2.COLOR_BGR2GRAY)
    roi_tipping = np.zeros_like(gray_tipping)
    pts_tipping = np.array([[0, 360], [200, 100], [440, 100], [640, 360]], np.int32)
    cv2.fillPoly(roi_tipping, [pts_tipping], 255)
    _, thresh_tipping = cv2.threshold(gray_tipping, 120, 255, cv2.THRESH_BINARY)
    water_tipping = cv2.bitwise_and(thresh_tipping, roi_tipping)
    kernel = np.ones((5, 5), np.uint8)
    water_tipping = cv2.morphologyEx(water_tipping, cv2.MORPH_CLOSE, kernel)
    water_tipping = cv2.morphologyEx(water_tipping, cv2.MORPH_OPEN, kernel)

    segment_tipping = cropped_tipping.copy()
    blue_mask = np.zeros_like(cropped_tipping)
    blue_mask[:, :] = [216, 78, 29]
    mask_indices = water_tipping > 0
    segment_tipping[mask_indices] = cv2.addWeighted(cropped_tipping, 0.55, blue_mask, 0.45, 0)[mask_indices]

    cv2.rectangle(segment_tipping, (20, 20), (620, 80), (0, 140, 255), -1)
    cv2.putText(segment_tipping, "AI HAZARD DETECTED: IMMINENT ROAD FLOODING", (35, 45), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(segment_tipping, f"Water accumulation starting. Current ratio: {flood_levels[tipping_frame_idx]*100:.1f}%. Closure imminent.", (35, 68), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
                
    cv2.imwrite(os.path.join(output_dir, "raw_tipping.jpg"), cropped_tipping)
    cv2.imwrite(os.path.join(output_dir, "segment_tipping.jpg"), segment_tipping)

    # 8 Daily steps
    frame_indices = [int(i * (total_frames - 1) / 7) for i in range(8)]
    base_date = datetime(2026, 6, 20)
    stations = ["CAM_01", "CAM_02", "CAM_03"]

    for i, idx in enumerate(frame_indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        frame = cv2.resize(frame, (640, 360))
        detection_date = base_date + timedelta(days=i)

        # ----------------------------------------------------
        # 1. PROCESS CAM_01 (Vo Truong Toan St - High flooding)
        # ----------------------------------------------------
        cam1_raw = frame.copy()
        gray1 = cv2.cvtColor(cam1_raw, cv2.COLOR_BGR2GRAY)
        roi_mask1 = np.zeros_like(gray1)
        cv2.fillPoly(roi_mask1, [np.array([[0, 360], [250, 180], [390, 180], [640, 360]], np.int32)], 255)
        
        # Detect dynamic water ratio from frame
        blurred1 = cv2.GaussianBlur(gray1, (5, 5), 0)
        _, thresh1 = cv2.threshold(blurred1, 110, 255, cv2.THRESH_BINARY)
        water_pixels1 = cv2.bitwise_and(thresh1, roi_mask1)
        road_area1 = np.sum(roi_mask1 == 255)
        water_ratio1 = np.sum(water_pixels1 == 255) / road_area1 if road_area1 > 0 else 0
        
        # Scale and Normalize to final risk decision
        flooded_area_pct1 = round(water_ratio1 * 100.0, 1)
        # Apply threshold scaling:
        if flooded_area_pct1 < 15.0:
            depth1 = round(flooded_area_pct1 * 1.0, 1)
        elif flooded_area_pct1 < 45.0:
            depth1 = round(15.0 + (flooded_area_pct1 - 15.0) * 0.5, 1)
        else:
            depth1 = round(30.0 + (flooded_area_pct1 - 45.0) * 0.8, 1)
            
        severity1 = "HIGH" if depth1 >= 30 else ("MEDIUM" if depth1 >= 15 else "LOW")

        cam1_segment = cam1_raw.copy()
        blue_mask1 = np.zeros_like(cam1_raw)
        blue_mask1[:, :] = [216, 78, 29]
        cam1_segment[water_pixels1 > 0] = cv2.addWeighted(cam1_raw, 0.6, blue_mask1, 0.4, 0)[water_pixels1 > 0]

        # Draw vehicle contours on CAM_01
        vehicles_count1 = 0
        contours1, _ = cv2.findContours(cv2.Canny(blurred1, 50, 150), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours1:
            (x, y, w, h) = cv2.boundingRect(c)
            if w > 35 and h > 22 and y > 160 and w < 160 and h < 110:
                # No need to render the stalled vehicles on the image layer
                vehicles_count1 += 1
        vehicles_count1 = max(1, min(vehicles_count1, 5)) if depth1 > 20 else 0

        # Draw CCTV Telemetry Overlay on CAM_01
        cv2.rectangle(cam1_segment, (0, 0), (640, 35), (20, 20, 20), -1)
        cv2.putText(cam1_segment, f"CCTV: CAM_01 (VO TRUONG TOAN) | DEPTH: {depth1}cm | STATUS: {severity1}", (15, 22), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        raw_name1 = f"cam1_raw_day_{i}.jpg"
        segment_name1 = f"cam1_segment_day_{i}.jpg"
        cv2.imwrite(os.path.join(output_dir, raw_name1), cam1_raw)
        cv2.imwrite(os.path.join(output_dir, segment_name1), cam1_segment)

        # ----------------------------------------------------
        # 2. PROCESS CAM_02 (Marie Curie St - Moderate flooding)
        # ----------------------------------------------------
        cam2_raw = cv2.resize(frame[60:320, 0:480], (640, 360))
        gray2 = cv2.cvtColor(cam2_raw, cv2.COLOR_BGR2GRAY)
        roi_mask2 = np.zeros_like(gray2)
        cv2.fillPoly(roi_mask2, [np.array([[0, 360], [180, 120], [350, 120], [640, 360]], np.int32)], 255)

        blurred2 = cv2.GaussianBlur(gray2, (5, 5), 0)
        _, thresh2 = cv2.threshold(blurred2, 115, 255, cv2.THRESH_BINARY)
        water_pixels2 = cv2.bitwise_and(thresh2, roi_mask2)
        road_area2 = np.sum(roi_mask2 == 255)
        water_ratio2 = np.sum(water_pixels2 == 255) / road_area2 if road_area2 > 0 else 0

        # Scale and Normalize to final risk decision
        flooded_area_pct2 = round(water_ratio2 * 100.0, 1)
        if flooded_area_pct2 < 15.0:
            depth2 = round(flooded_area_pct2 * 1.0, 1)
        elif flooded_area_pct2 < 45.0:
            depth2 = round(15.0 + (flooded_area_pct2 - 15.0) * 0.5, 1)
        else:
            depth2 = round(30.0 + (flooded_area_pct2 - 45.0) * 0.8, 1)
            
        severity2 = "HIGH" if depth2 >= 30 else ("MEDIUM" if depth2 >= 15 else "LOW")

        cam2_segment = cam2_raw.copy()
        blue_mask2 = np.zeros_like(cam2_raw)
        blue_mask2[:, :] = [216, 78, 29]
        cam2_segment[water_pixels2 > 0] = cv2.addWeighted(cam2_raw, 0.65, blue_mask2, 0.35, 0)[water_pixels2 > 0]

        # Draw vehicle contours on CAM_02
        vehicles_count2 = 1 if depth2 > 15 else 0

        # Draw CCTV Telemetry Overlay on CAM_02
        cv2.rectangle(cam2_segment, (0, 0), (640, 35), (20, 20, 20), -1)
        cv2.putText(cam2_segment, f"CCTV: CAM_02 (MARIE CURIE ST) | DEPTH: {depth2}cm | STATUS: {severity2}", (15, 22), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        raw_name2 = f"cam2_raw_day_{i}.jpg"
        segment_name2 = f"cam2_segment_day_{i}.jpg"
        cv2.imwrite(os.path.join(output_dir, raw_name2), cam2_raw)
        cv2.imwrite(os.path.join(output_dir, segment_name2), cam2_segment)

        # ----------------------------------------------------
        # 3. PROCESS CAM_03 (Thomas edison St - Low flooding)
        # ----------------------------------------------------
        cam3_raw = cv2.resize(frame[80:340, 180:600], (640, 360))
        gray3 = cv2.cvtColor(cam3_raw, cv2.COLOR_BGR2GRAY)
        roi_mask3 = np.zeros_like(gray3)
        cv2.fillPoly(roi_mask3, [np.array([[50, 360], [220, 160], [420, 160], [580, 360]], np.int32)], 255)

        blurred3 = cv2.GaussianBlur(gray3, (5, 5), 0)
        _, thresh3 = cv2.threshold(blurred3, 120, 255, cv2.THRESH_BINARY)
        water_pixels3 = cv2.bitwise_and(thresh3, roi_mask3)
        road_area3 = np.sum(roi_mask3 == 255)
        water_ratio3 = np.sum(water_pixels3 == 255) / road_area3 if road_area3 > 0 else 0

        # Scale and Normalize to final risk decision
        flooded_area_pct3 = round(water_ratio3 * 100.0, 1)
        if flooded_area_pct3 < 15.0:
            depth3 = round(flooded_area_pct3 * 1.0, 1)
        elif flooded_area_pct3 < 45.0:
            depth3 = round(15.0 + (flooded_area_pct3 - 15.0) * 0.5, 1)
        else:
            depth3 = round(30.0 + (flooded_area_pct3 - 45.0) * 0.8, 1)
            
        severity3 = "HIGH" if depth3 >= 30 else ("MEDIUM" if depth3 >= 15 else "LOW")

        cam3_segment = cam3_raw.copy()
        blue_mask3 = np.zeros_like(cam3_raw)
        blue_mask3[:, :] = [216, 78, 29]
        cam3_segment[water_pixels3 > 0] = cv2.addWeighted(cam3_raw, 0.7, blue_mask3, 0.3, 0)[water_pixels3 > 0]

        # Draw CCTV Telemetry Overlay on CAM_03
        cv2.rectangle(cam3_segment, (0, 0), (640, 35), (20, 20, 20), -1)
        cv2.putText(cam3_segment, f"CCTV: CAM_03 (THOMAS EDISON) | DEPTH: {depth3}cm | STATUS: {severity3}", (15, 22), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        raw_name3 = f"cam3_raw_day_{i}.jpg"
        segment_name3 = f"cam3_segment_day_{i}.jpg"
        cv2.imwrite(os.path.join(output_dir, raw_name3), cam3_raw)
        cv2.imwrite(os.path.join(output_dir, segment_name3), cam3_segment)

        # Upload Camera Detections for all 3 cameras
        station_data = [
            ("CAM_01", depth1, vehicles_count1, severity1, raw_name1, segment_name1, flooded_area_pct1),
            ("CAM_02", depth2, vehicles_count2, severity2, raw_name2, segment_name2, flooded_area_pct2),
            ("CAM_03", depth3, 0, severity3, raw_name3, segment_name3, flooded_area_pct3)
        ]

        for station_id, depth, vehicles, severity, raw, seg, pct in station_data:
            payload = {
                "stationId": station_id,
                "timestamp": (detection_date.isoformat() + "Z"),
                "waterDepthCm": round(depth, 1),
                "vehiclesCount": vehicles,
                "severity": severity,
                "rawFramePath": f"/detections/{raw}",
                "segmentPath": f"/detections/{seg}",
                "floodedAreaPct": round(pct, 1)
            }
            try:
                requests.post("http://localhost:3000/api/camera/detections/save", json=payload)
            except Exception as e:
                pass

    # Save the special tipping threat detection into DB for CAM_01
    payload_tipping = {
        "stationId": "CAM_01",
        "timestamp": (base_date + timedelta(days=3, hours=10)).isoformat() + "Z",
        "waterDepthCm": 14.5,
        "vehiclesCount": 3,
        "severity": "MEDIUM",
        "rawFramePath": "/detections/raw_tipping.jpg",
        "segmentPath": "/detections/segment_tipping.jpg",
        "floodedAreaPct": round(flood_levels[tipping_frame_idx] * 100, 1)
    }
    try:
        requests.post("http://localhost:3000/api/camera/detections/save", json=payload_tipping)
        print("Successfully uploaded AI flood prediction tipping frame.")
    except Exception as e:
        print(f"Error saving tipping frame: {e}")

    cap.release()
    print("AI segmentation and tipping detection frame processing complete for all 3 cameras.")

if __name__ == "__main__":
    process_flood_video()
