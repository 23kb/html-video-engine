# tools/avatar — local talking-head lip-sync pipeline

> **STATUS 2026-07-23: PARKED.** All Wav2Lip variants failed visual QC (soft
> 96px mouth; static-frame head), and a Heygem-on-GPU-VM pivot
> was skipped in favor of a simpler decision: **real
> Kacie recordings for intro + outro** (spec:
> docs/kacie-intro-outro-recording-spec.md), TTS-narrated body, no synthetic
> face anywhere. This tooling stays for two reasons: `check-base.py` is the
> intake validator for her deliveries, and the generation route reopens if
> localization ever needs a synthetic Kacie. `composite.js` remains generally
> useful (real-footage PiP bubble).

Turns a narration audio track (Voicebox TTS mp3) into a lip-synced MP4 of
Umair's talking head, then composites it as a circular picture-in-picture
bubble onto a rendered body video. Fully local (Wav2Lip on the RTX 2060),
no cloud APIs, deterministic output assets.

```
Voicebox mp3 ──> generate.js (Wav2Lip, GPU) ──> avatar clip MP4
rendered body MP4 + avatar clip ──> composite.js (ffmpeg) ──> final MP4
```

## One-time setup

Everything heavyweight is gitignored (`.venv/`, `Wav2Lip/`, `weights/`).
To rebuild on a fresh machine:

```bash
# 1. Python 3.10 venv (uv fetches its own CPython; system Python stays untouched)
python -m pip install uv
python -m uv venv "tools/avatar/.venv" --python 3.10

# 2. Torch w/ CUDA 12.1 (RTX 2060-compatible) + Wav2Lip deps
python -m uv pip install --python "tools/avatar/.venv/Scripts/python.exe" torch==2.2.2 torchvision==0.17.2 --index-url https://download.pytorch.org/whl/cu121
python -m uv pip install --python "tools/avatar/.venv/Scripts/python.exe" "numpy==1.23.5" "librosa==0.9.2" "numba==0.56.4" "setuptools==80.9.0" opencv-python tqdm scipy
# setuptools MUST stay <81 — librosa 0.9.2 imports pkg_resources, removed in newer setuptools

# 3. Wav2Lip code
git clone --depth 1 https://github.com/Rudrabha/Wav2Lip "tools/avatar/Wav2Lip"

# 4. Model weights
#    s3fd face detection (~86 MB, canonical host from the face-alignment project)
curl -L -o "tools/avatar/Wav2Lip/face_detection/detection/sfd/s3fd.pth" "https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth"
#    wav2lip_gan checkpoint (~416 MB, HF mirror of the official IIIT-H release)
curl -L -o "tools/avatar/weights/wav2lip_gan.pth" "https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/wav2lip_gan.pth"
```

## Usage

```bash
# 1. Lip-sync a narration segment onto the base footage
node tools/avatar/generate.js --audio videos/<slug>/narration/01.mp3 --out videos/<slug>/avatar/01.mp4

# 2. Bubble it onto the rendered body
node tools/avatar/composite.js --bg videos/<slug>.mp4 --avatar videos/<slug>/avatar/01.mp4 --out videos/<slug>-with-avatar.mp4 --size 360 --pos bottom-right --start 4.0 --audio avatar
```

`generate.js` validates base framing first (rejects screen-share/PiP frames
where the face is tiny or cornered — `check-base.py`; `--skip-base-check` to
override), loops the base footage if narration outlasts it, auto-downscales
>720p bases for VRAM headroom (`--resize-factor 1` to override), and exits
nonzero on output/audio duration mismatch. OOM on the 2060? Retry with a
higher `--resize-factor` or `--face-det-batch 2`.

`composite.js` feathers the bubble edge ~2px, keeps the body playing after the
avatar ends, and picks audio automatically (body audio if present, else the
avatar's narration delayed by `--start`).

## Base footage: idle take REQUIRED (finding 2026-07-23)

A/B-tested on Kacie's real videos: a **talking** base clip fights the generated
mouth (residual jaw/cheek motion) — measured sync correlation drops to
0.12–0.20 with wandering lag, and the mouth visibly "flaps too fast." A
**static still** base measures 0.47 with stable lag (healthy). There is no
usable idle stretch in existing tutorial footage — she talks continuously.

- Production: record a 60–90s idle "listening" take. This is the durable fix.
- Interim/testing: pass a PNG still as `--base` — Wav2Lip's static mode
  (no blinks/head motion, passable at bubble size).
- Objective sync check: `scratchpad sync_probe.py` pattern — mouth-region
  motion vs audio-envelope cross-correlation; healthy ≈ 0.4+, stable lag.

## Quality notes

- Wav2Lip = best-in-class sync accuracy; mouth region is generated at 96px so
  it reads soft in full-frame closeups but clean at bubble size (≤ ~420px).
- Best base footage is a NON-talking idle take (Wav2Lip overwrites the mouth;
  a talking base leaves residual jaw motion). Talking footage still works.
- Optional future upgrade: GFPGAN face-restore pass on the mouth region, or
  MuseTalk (borderline on 6GB VRAM) for sharper texture.
