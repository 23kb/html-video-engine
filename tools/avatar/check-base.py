# Base-footage validator for the avatar pipeline. Run from tools/avatar/Wav2Lip
# (needs its face_detection package). Loads the first frame of a video (or the
# image itself), finds the largest face, and verdicts whether this is genuine
# talking-head framing — not a screen-share with a corner PiP, which Wav2Lip
# would happily lip-sync into a garbage asset (2026-07-23 incident: Kacie 3
# "full-screen" segments were threshold-flicker misclassifications).
#
# Usage: python check-base.py <image-or-video>   (exit 0 = ok, 2 = rejected)
import sys, os, json
sys.path.insert(0, os.getcwd())
import cv2
import numpy as np
import torch
import face_detection

MIN_FACE_H_FRAC = 0.22   # talking-head framing: face fills a real fraction of frame
CENTER_X = (0.25, 0.75)  # face center must be roughly centered, not in a corner
CENTER_Y = (0.10, 0.85)

path = sys.argv[1]
ext = os.path.splitext(path)[1].lower()
if ext in ('.png', '.jpg', '.jpeg'):
    frame = cv2.imread(path)
else:
    cap = cv2.VideoCapture(path)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        print(json.dumps({"ok": False, "reason": "could not read first frame"})); sys.exit(2)

H, W = frame.shape[:2]
device = "cuda" if torch.cuda.is_available() else "cpu"
detector = face_detection.FaceAlignment(face_detection.LandmarksType._2D, device=device)
dets = detector.get_detections_for_batch(np.array([frame]))[0]
if dets is None:
    print(json.dumps({"ok": False, "reason": "no face detected in first frame"})); sys.exit(2)

x1, y1, x2, y2 = dets
fh = (y2 - y1) / H
cx, cy = (x1 + x2) / 2 / W, (y1 + y2) / 2 / H
info = {"face": [int(v) for v in (x1, y1, x2, y2)], "frame": [W, H],
        "faceH_frac": round(float(fh), 3), "cx": round(float(cx), 2), "cy": round(float(cy), 2)}

if fh < MIN_FACE_H_FRAC:
    info.update(ok=False, reason=f"face too small ({fh:.0%} of frame height, need >= {MIN_FACE_H_FRAC:.0%}) — "
                "this looks like a screen-share/PiP frame, not a talking-head take")
    print(json.dumps(info)); sys.exit(2)
if not (CENTER_X[0] <= cx <= CENTER_X[1] and CENTER_Y[0] <= cy <= CENTER_Y[1]):
    info.update(ok=False, reason=f"face center ({cx:.2f},{cy:.2f}) is off in a corner — "
                "this looks like a PiP overlay, not a talking-head take")
    print(json.dumps(info)); sys.exit(2)

info["ok"] = True
print(json.dumps(info))
