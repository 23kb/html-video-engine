# Heygem cloud engine — avatar generation on a rented GPU server

Local Wav2Lip failed Umair's QC bar (3 rounds, 2026-07-23: soft 96px mouth +
frozen static-frame head). Pivot: [Duix.Heygem](https://github.com/duixcom/Duix.Heygem)
(MIT-licensed HeyGen-style digital human — full head motion, blinks, identity
clone from ~10s of footage) running on a rented GPU VM, because it needs
8GB+ VRAM / 1080Ti-class or better and the local RTX 2060 (6GB) is under the
floor. Everything downstream (composite.js bubble, layout, QC probes) stays
unchanged — only the generation engine swaps.

## Provider checklist (Umair does this part — account + payment)

Any provider giving a **full Ubuntu 22.04 VM with root, an NVIDIA GPU
(≥ 11GB VRAM), and ≥ 120GB disk** works. As of 2026-07: 4090-class rentals
run ~$0.20–0.40/hr (Vast.ai VM offers, TensorDock, RunPod bare/VM tiers,
Lambda). Container-only pods (standard RunPod/Vast containers) do NOT work —
Heygem needs docker-compose inside the machine.

Recommended shape: persistent-disk VM you STOP between sessions
(~$5–10/month disk while stopped, ~$0.30/hr while generating). First boot
pulls ~70GB of Docker images (~30 min); a persistent disk makes every later
start instant.

## Server setup (one command)

```bash
curl -fsSL <paste setup-server.sh here or scp it> | bash
```

Or `scp tools/avatar/heygem/setup-server.sh root@<VM_IP>:` and run it there.
It installs Docker + NVIDIA toolkit, clones Heygem, launches services, and
verifies GPU passthrough.

## Security (non-negotiable)

- Heygem's API has **no authentication**. Never open 18180/8383 in the VM
  firewall. Reach them through an SSH tunnel from the workstation:
  `ssh -N -L 18180:127.0.0.1:18180 -L 8383:127.0.0.1:8383 root@<VM_IP>`
  The client tooling then talks to `http://127.0.0.1:8383` as if local.
- Kacie's likeness data lives on the VM: reputable provider only, wipe the
  disk (destroy the volume) if the project ends, don't leave the VM running
  unattended.

## Client flow (built after the server is live)

1. One-time: register Kacie's digital human from
   `reference/avatar-source/kacie1-fullscreen-14s.mp4` (14s genuine
   full-screen footage — passes check-base.py).
2. Per segment: `tools/avatar/generate-heygem.js --audio <mp3> --out <mp4>`
   → POST audio to `/v1/preprocess_and_tran` (:18180) → `/easy/submit`
   (:8383) → poll `/easy/query` → download MP4 → same duration check as the
   Wav2Lip wrapper.
3. Composite exactly as before with `tools/avatar/composite.js`.

Endpoint names follow the deployed version's docs — verify against the
running server before coding the client (third-party guides drift):
[deployment + API guide](https://www.xugj520.cn/en/archives/open-source-digital-human-guide.html),
[DeepWiki Linux install](https://deepwiki.com/duixcom/Duix.Heygem/2.2-linux-installation).

## Status

- 2026-07-23: runbook + setup script written. Waiting on VM (provider +
  account are Umair's). Client script (`generate-heygem.js`) intentionally
  not written until it can be tested against the live API.
