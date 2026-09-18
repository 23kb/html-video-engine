#!/usr/bin/env python3
"""Reference-copy SFX analysis — the DSP half of tools/sfx/*-reference / match tools.

Run with the SFX venv (tools/sfx/.venv), never the system Python:
    tools/sfx/.venv/Scripts/python.exe tools/sfx/py/sfxref.py <cmd> ...

Commands
    split <ref>                 demucs 4-stem split → <ref>/stems/*.wav (+ novocals, bed)
    cues <ref>                  detect SFX hits → <ref>/reference-cues.json, cues/*.wav|jpg
    features <file>...          feature JSON for arbitrary audio files
    match <ref> --pool <dir>... rank candidate sounds against the reference cues
    plan-levels <plan.json>     per-clip cue level vs backdrop for a video's sfx plan

We copy a reference's CHARACTER and LEVELS, never its files: everything written
under <ref>/ stays under tools/sfx/refs/ (gitignored) and is for measurement only.
"""
import argparse, hashlib, json, math, os, re, subprocess, sys
import numpy as np
import soundfile as sf
import librosa

SR = 44100
HOP = 256
FR = HOP / SR                      # seconds per analysis frame (~5.8 ms)
EPS = 1e-12

# Classes Umair rejected by ear. Never generate, never rank as a pick.
REJECTED = {
    'tick': 'rejected 2026-09-17 ("NEVER EVER add those again")',
    'shimmer': 'rejected 2026-09-03',
    'riser': 'rejected 2026-09-03 (riser/whoosh class)',
    'whoosh': 'rejected 2026-09-03 (riser/whoosh class)',
}
REJECTED_NAMES = {'tick-a', 'tick-b', 'tick-c', 'shimmer-a', 'shimmer-b', 'riser-a', 'riser-b'}
AUDIO_EXT = ('.wav', '.mp3', '.ogg', '.flac', '.m4a')


# ── small helpers ──────────────────────────────────────────────────────────
def db(x):
    return 10 * math.log10(max(float(x), EPS))


def load(path, mono=True):
    y, _ = librosa.load(path, sr=SR, mono=mono)
    return y.astype(np.float32)


def clean(o):
    """JSON-safe copy: NaN/inf -> None (JS JSON.parse rejects NaN)."""
    if isinstance(o, float):
        return o if math.isfinite(o) else None
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    return o


def dump(obj, path):
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(clean(obj), fh, indent=1, allow_nan=False)


def rel(p):
    return os.path.relpath(p).replace('\\', '/')


def ffmpeg_lufs(path):
    """Integrated loudness, LRA and true peak via ffmpeg ebur128."""
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true',
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = out[out.rfind('Summary:'):] if 'Summary:' in out else out
    g = lambda pat: (lambda m: float(m.group(1)) if m else None)(re.search(pat, tail))
    return {'I': g(r'I:\s+(-?[\d.]+) LUFS'), 'LRA': g(r'LRA:\s+(-?[\d.]+) LU'), 'TP': g(r'Peak:\s+(-?[\d.]+) dBFS')}


def frame_energy(y):
    return librosa.feature.rms(y=y, frame_length=HOP * 2, hop_length=HOP, center=True)[0] ** 2


def onset_sample(y, frac=0.05):
    """First sample above frac of the file's own peak (same rule as onset.mjs)."""
    a = np.abs(y)
    pk = a.max() if len(a) else 0
    if pk <= 0:
        return 0
    idx = np.flatnonzero(a > frac * pk)
    return int(idx[0]) if len(idx) else 0


# ── features ───────────────────────────────────────────────────────────────
def active_span(e, start=0, search_s=0.5, drop_db=20.0, max_s=2.0, floor_e=0.0):
    """(peak_frame, end_frame) of a hit starting at frame `start` in energy curve e.
    The hit ends when energy falls 20 dB under its peak OR back to `floor_e`
    (the bed it sits on), whichever comes first."""
    n = len(e)
    s_end = min(n, start + max(1, int(search_s / FR)))
    if start >= n:
        return start, start
    pk = start + int(np.argmax(e[start:s_end]))
    floor = max(e[pk] * 10 ** (-drop_db / 10), floor_e)
    lim = min(n, start + int(max_s / FR))
    end, run = lim, 0
    for i in range(pk, lim):
        run = run + 1 if e[i] < floor else 0
        if run >= 3:
            end = i - 2
            break
    return pk, max(end, pk + 1)


def features(y, trim_head=True):
    """Timbre + envelope features of one isolated sound (mono float array at SR)."""
    y = np.asarray(y, dtype=np.float32)
    head = onset_sample(y) if trim_head else 0
    y = y[head:]
    if len(y) < HOP * 4:
        y = np.pad(y, (0, HOP * 4 - len(y)))
    e = frame_energy(y)
    pk, end = active_span(e, 0, search_s=0.6)
    seg = y[: max(end * HOP, HOP * 4)]
    S = np.abs(librosa.stft(seg, n_fft=2048, hop_length=HOP)) + EPS
    P = S ** 2
    w = P.sum(axis=0)
    w = w / (w.sum() + EPS)
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    cent = librosa.feature.spectral_centroid(S=S, sr=SR)[0]
    roll = librosa.feature.spectral_rolloff(S=S, sr=SR, roll_percent=0.85)[0]
    flat = librosa.feature.spectral_flatness(S=S)[0]
    tot = P.sum() + EPS
    low = P[freqs < 200].sum() / tot
    high = P[freqs > 4000].sum() / tot
    try:
        # HPSS needs room for its median filters: pad very short sounds with silence
        hs = seg if len(seg) >= SR // 5 else np.pad(seg, (0, SR // 5 - len(seg)))
        h, p = librosa.effects.hpss(hs)
        harm = float((h ** 2).sum() / ((h ** 2).sum() + (p ** 2).sum() + EPS))
    except Exception:
        harm = 0.0
    if not math.isfinite(harm):
        harm = 0.0
    act = cent[: max(2, len(cent))]
    tt = np.arange(len(act)) * FR
    slope = float(np.polyfit(tt, np.log2(act + 1.0), 1)[0]) if len(act) >= 4 else 0.0
    mf = librosa.feature.mfcc(S=librosa.power_to_db(librosa.feature.melspectrogram(S=P, sr=SR)), n_mfcc=13)
    rms = math.sqrt(float(np.mean(seg ** 2)) + EPS)
    return {
        'onsetMs': round(head / SR * 1000, 1),
        'durationMs': round(len(seg) / SR * 1000, 1),
        'attackMs': round(pk * FR * 1000, 1),
        'centroidHz': round(float((cent * w).sum()), 0),
        'rolloffHz': round(float((roll * w).sum()), 0),
        'flatness': round(float((flat * w).sum()), 4),
        'lowRatio': round(float(low), 4),
        'highRatio': round(float(high), 4),
        'harmonic': round(harm, 4),
        'slopeOctPerS': round(slope, 3),
        'crestDb': round(20 * math.log10((np.abs(seg).max() + EPS) / rms), 2),
        'peakDb': round(20 * math.log10(np.abs(seg).max() + EPS), 2),
        'rmsActiveDb': round(20 * math.log10(rms), 2),
        'mfcc': [round(float(v), 2) for v in (mf * w).sum(axis=1)],
    }


def classify(f, in_roll=False):
    """Rule-of-thumb cue class. A first guess only — Umair relabels on the audition page."""
    d, a, c = f['durationMs'], f['attackMs'], f['centroidHz']
    if in_roll:
        return 'tick'
    if d < 110 and c > 1800:
        return 'click'
    if f['slopeOctPerS'] > 1.0 and d > 400:
        return 'riser'
    if a > 50 and f['flatness'] > 0.2 and d >= 150:
        return 'whoosh'
    if f['lowRatio'] > 0.45 and d >= 350:
        return 'boom'
    if f['harmonic'] > 0.6 and d >= 250 and c > 1200:
        return 'chime'
    if f['harmonic'] > 0.5 and d < 350:
        return 'pop'
    if a <= 30:
        return 'impact'
    return 'hit'


def rejected_note(cls):
    if cls in REJECTED:
        return REJECTED[cls]
    if cls == 'click':
        return 'tick-like: the tick class was rejected 2026-09-17 — needs a ruling before use'
    return None


# ── split ──────────────────────────────────────────────────────────────────
def cmd_split(a):
    ref = a.ref
    audio = os.path.join(ref, 'audio.wav')
    src = os.path.join(ref, 'source.mp4')
    if not os.path.exists(audio):
        if not os.path.exists(src):
            sys.exit(f'[split] need {audio} or {src}')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-ac', '2', '-ar', '48000',
                        '-c:a', 'pcm_s16le', audio], check=True)
    raw = os.path.join(ref, 'demucs-raw', 'htdemucs', 'audio')
    if not all(os.path.exists(os.path.join(raw, f'{s}.wav')) for s in ('drums', 'bass', 'other', 'vocals')):
        print('[split] running demucs htdemucs (first run downloads ~80 MB of model weights)…', flush=True)
        subprocess.run([sys.executable, '-m', 'demucs', '-n', 'htdemucs', '--float32',
                        '-o', os.path.join(ref, 'demucs-raw'), audio], check=True)
    out = os.path.join(ref, 'stems')
    os.makedirs(out, exist_ok=True)
    data = {}
    for s in ('drums', 'bass', 'other', 'vocals'):
        y, sr = sf.read(os.path.join(raw, f'{s}.wav'), dtype='float32')
        data[s] = (y, sr)
        sf.write(os.path.join(out, f'{s}.wav'), y, sr, subtype='FLOAT')
    sr = data['drums'][1]
    sf.write(os.path.join(out, 'novocals.wav'), data['drums'][0] + data['bass'][0] + data['other'][0], sr, subtype='FLOAT')
    sf.write(os.path.join(out, 'bed.wav'), data['bass'][0] + data['other'][0], sr, subtype='FLOAT')
    report = {'program': ffmpeg_lufs(audio)}
    for s in ('vocals', 'drums', 'bass', 'other', 'novocals', 'bed'):
        report[s] = ffmpeg_lufs(os.path.join(out, f'{s}.wav'))
    report['hasVoice'] = (report['vocals']['I'] or -99) > -45
    dump(report, os.path.join(ref, 'stems.json'))
    for k, v in report.items():
        print(f'  {k:9s} {v}')
    print(f'[split] stems → {rel(out)}')


# ── cues ───────────────────────────────────────────────────────────────────
def visual_cuts(src, thresh):
    if not os.path.exists(src):
        return []
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-vf', f"select='gt(scene,{thresh})',showinfo",
                          '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return [float(m) for m in re.findall(r'pts_time:([\d.]+)', out)]


def nearest(x, arr):
    return float(np.min(np.abs(np.asarray(arr) - x))) if len(arr) else 99.0


def stem_onsets(y, delta):
    env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
    on = librosa.onset.onset_detect(onset_envelope=env, sr=SR, hop_length=HOP, backtrack=True, delta=delta)
    return on, env


def spectral_subtract(win, pre, over=1.0):
    """Remove the steady bed (mean spectrum of `pre`) from `win`. Returns mono array."""
    if len(pre) < 2048:
        return win
    Sw = librosa.stft(win, n_fft=2048, hop_length=HOP)
    Pm = np.abs(librosa.stft(pre, n_fft=2048, hop_length=HOP)).mean(axis=1, keepdims=True)
    mag = np.maximum(np.abs(Sw) - over * Pm, 0.05 * np.abs(Sw))
    return librosa.istft(mag * np.exp(1j * np.angle(Sw)), hop_length=HOP, length=len(win)).astype(np.float32)


def cmd_cues(a):
    ref = a.ref
    st = os.path.join(ref, 'stems')
    if not os.path.exists(os.path.join(st, 'novocals.wav')):
        sys.exit('[cues] no stems yet — run split first')
    mix_st, msr = sf.read(os.path.join(ref, 'audio.wav'), dtype='float32')
    nov = load(os.path.join(st, 'novocals.wav'))
    stems = {s: load(os.path.join(st, f'{s}.wav')) for s in ('drums', 'other', 'bass')}
    bed_st, bsr = sf.read(os.path.join(st, 'bed.wav'), dtype='float32')
    e_nov = frame_energy(nov)
    e_st = {s: frame_energy(y) for s, y in stems.items()}
    dur_s = len(nov) / SR

    tempo, beats = librosa.beat.beat_track(y=nov, sr=SR, hop_length=HOP, units='time')
    tempo = float(np.atleast_1d(tempo)[0])
    cuts = visual_cuts(os.path.join(ref, 'source.mp4'), a.scene)

    # candidates per stem
    cand = []
    for s, delta in (('drums', 0.2), ('bass', 0.3), ('other', 0.2)):
        on, env = stem_onsets(stems[s], delta)
        pk_env = env[on] if len(on) else np.array([])
        for k, i in enumerate(on):
            pre = e_st[s][max(0, i - int(0.35 / FR)):max(1, i - 3)]
            pre_db = db(np.median(pre)) if len(pre) else -120
            pk_db = db(e_st[s][i:i + int(0.15 / FR) + 1].max())
            ex = pk_db - pre_db
            if s == 'other':
                lo, hi = max(0, k - 12), min(len(on), k + 13)
                med = float(np.median(pk_env[lo:hi])) if hi > lo else 0
                if pk_env[k] < a.other_z * med or ex < 8:
                    continue
            elif s == 'bass':
                if ex < 10:
                    continue
            elif ex < a.min_excess:
                continue
            cand.append({'frame': int(i), 't': float(i * FR), 'stem': s, 'stemExcessDb': round(ex, 1), 'stemPeakDb': round(pk_db, 1)})

    # merge within 60 ms: keep the strongest, remember every stem that fired
    cand.sort(key=lambda c: c['t'])
    merged = []
    for c in cand:
        if merged and c['t'] - merged[-1]['t'] < 0.06:
            m = merged[-1]
            m['stems'] = sorted(set(m['stems']) | {c['stem']})
            if c['stemPeakDb'] > m['stemPeakDb']:
                m.update({k: c[k] for k in ('stemExcessDb', 'stemPeakDb')})
            continue
        c['stems'] = [c['stem']]
        merged.append(c)

    # rolls: >=3 hits with gaps < 160 ms read as one ticking run
    roll_id, i = 0, 0
    while i < len(merged):
        j = i
        while j + 1 < len(merged) and merged[j + 1]['t'] - merged[j]['t'] < 0.16:
            j += 1
        if j - i + 1 >= 3:
            roll_id += 1
            for k in range(i, j + 1):
                merged[k]['roll'] = roll_id
        i = j + 1

    prog = ffmpeg_lufs(os.path.join(ref, 'audio.wav'))
    cdir = os.path.join(ref, 'cues')
    os.makedirs(cdir, exist_ok=True)
    src = os.path.join(ref, 'source.mp4')
    out = []
    seen_roll = set()
    for c in merged:
        if c.get('roll') in seen_roll:
            continue                       # one entry per roll (its first hit)
        rollmates = [m for m in merged if c.get('roll') and m.get('roll') == c['roll']]
        if c.get('roll'):
            seen_roll.add(c['roll'])
        i0 = c['frame']
        e_pre = float(np.median(e_nov[max(0, i0 - int(0.35 / FR)):max(1, i0 - 3)])) if i0 > 3 else EPS
        pk, end = active_span(e_nov, i0, search_s=0.5, floor_e=e_pre * 10 ** (1.5 / 10))
        if rollmates:
            end = max(end, rollmates[-1]['frame'] + (end - i0))
        t0, t1 = i0 * FR, min(dur_s, end * FR + 0.03)
        s0, s1 = int(t0 * SR), int(t1 * SR)
        pre = nov[max(0, s0 - int(0.4 * SR)):max(0, s0 - int(0.02 * SR))]
        win = nov[max(0, s0 - int(0.01 * SR)):s1]
        iso = spectral_subtract(win, pre)
        f = features(iso, trim_head=False)
        e_win = float(np.mean(e_nov[i0:max(end, i0 + 1)]))
        over_silence = db(e_pre) < -70
        masked = (not over_silence) and e_win <= e_pre * 1.05     # adds < ~0.2 dB: not audible over the bed
        excess = None if (over_silence or masked) else round(db((e_win - e_pre) / e_pre), 1)
        cut_d = nearest(t0, cuts)
        beat_d = nearest(t0, beats)
        score = min(c['stemExcessDb'] / 15.0, 1.0) + (0.5 if cut_d <= 0.15 else 0) + (0.2 if beat_d >= 0.07 else 0)
        cls = classify(f, in_roll=bool(rollmates))
        n = len(out) + 1
        tag = f'cue-{n:02d}'
        mix_a, mix_b = max(0, int((t0 - 0.3) * msr)), min(len(mix_st), int((t1 + 0.4) * msr))
        sf.write(os.path.join(cdir, f'{tag}-mix.wav'), mix_st[mix_a:mix_b], msr)
        sf.write(os.path.join(cdir, f'{tag}-iso.wav'), iso, SR)
        bed_a, bed_b = max(0, int((t0 - 1.0) * bsr)), min(len(bed_st), int((t0 + 1.5) * bsr))
        sf.write(os.path.join(cdir, f'{tag}-bed.wav'), bed_st[bed_a:bed_b], bsr)
        if os.path.exists(src):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0 + 0.08:.3f}', '-i', src, '-frames:v', '1',
                            '-vf', 'scale=320:-2', os.path.join(cdir, f'{tag}.jpg')])
        out.append({
            'id': tag, 't': round(t0, 3), 'stems': c['stems'],
            'roll': ({'hits': len(rollmates), 'spanS': round(rollmates[-1]['t'] - rollmates[0]['t'], 3)} if rollmates else None),
            'class': cls, 'rejected': rejected_note(cls),
            'likelySfx': score >= a.min_score and not masked, 'score': round(score, 2),
            'cutDistMs': round(cut_d * 1000), 'beatDistMs': round(beat_d * 1000),
            'stemExcessDb': c['stemExcessDb'],
            'excessOverBedDb': excess, 'overSilence': over_silence, 'masked': masked,
            'bedBeforeDb': round(db(e_pre), 1),
            'cueVsProgramDb': (round(f['rmsActiveDb'] - prog['I'], 1) if prog['I'] is not None else None),
            'features': f,
            'files': {'mix': rel(os.path.join(cdir, f'{tag}-mix.wav')), 'iso': rel(os.path.join(cdir, f'{tag}-iso.wav')),
                      'bed': rel(os.path.join(cdir, f'{tag}-bed.wav')), 'bedLeadS': round(min(1.0, t0), 3),
                      'frame': rel(os.path.join(cdir, f'{tag}.jpg')) if os.path.exists(src) else None},
        })

    by = {}
    for c in out:
        if not c['likelySfx']:
            continue
        by.setdefault(c['class'], []).append(c)
    def stat(vals):
        vals = [v for v in vals if v is not None]
        if not vals:
            return None
        return {'median': round(float(np.median(vals)), 1), 'min': round(float(min(vals)), 1), 'max': round(float(max(vals)), 1), 'n': len(vals)}
    summary = {k: {'count': len(v), 'excessOverBedDb': stat([c['excessOverBedDb'] for c in v]),
                   'cueVsProgramDb': stat([c['cueVsProgramDb'] for c in v]),
                   'durationMs': stat([c['features']['durationMs'] for c in v]),
                   'centroidHz': stat([c['features']['centroidHz'] for c in v]),
                   'attackMs': stat([c['features']['attackMs'] for c in v]),
                   'rejected': rejected_note(k)} for k, v in sorted(by.items())}
    doc = {
        '_': 'Reference cue map. Measurement only — the reference audio is another brand\'s; never ship these files.',
        'ref': rel(ref), 'durationS': round(dur_s, 2), 'tempoBpm': round(tempo, 1),
        'program': prog, 'stems': json.load(open(os.path.join(ref, 'stems.json'))) if os.path.exists(os.path.join(ref, 'stems.json')) else None,
        'visualCuts': [round(x, 2) for x in cuts],
        'detection': {'minExcessDb': a.min_excess, 'otherZ': a.other_z, 'minScore': a.min_score, 'scene': a.scene,
                      'note': 'Heuristic. Demucs splits music stems, not SFX-vs-music: SFX hits land mostly in drums/other. '
                              'score = stem excess/15 (cap 1) + 0.5 if within 150 ms of a visual cut + 0.2 if >=70 ms off the beat grid. '
                              'Confirm every cue by ear on the audition page.'},
        'classSummary': summary,
        'cues': out,
    }
    dump(doc, os.path.join(ref, 'reference-cues.json'))
    print(f'[cues] program {prog}  tempo {tempo:.1f} bpm  cuts {len(cuts)}')
    print(f'{"id":7s} {"t":>6s} {"class":7s} {"sfx?":4s} {"score":>5s} {"exc/bed":>7s} {"vsProg":>6s} {"dur":>5s} {"atk":>4s} {"cent":>6s} {"cut":>5s}  stems')
    for c in out:
        f = c['features']
        print(f'{c["id"]:7s} {c["t"]:6.2f} {c["class"]:7s} {"yes" if c["likelySfx"] else "-":4s} {c["score"]:5.2f} '
              f'{(str(c["excessOverBedDb"]) if c["excessOverBedDb"] is not None else "silnc"):>7s} {str(c["cueVsProgramDb"]):>6s} '
              f'{f["durationMs"]:5.0f} {f["attackMs"]:4.0f} {f["centroidHz"]:6.0f} {c["cutDistMs"]:5d}  {",".join(c["stems"])}'
              + (f'  roll×{c["roll"]["hits"]}' if c['roll'] else '') + ('  [REJECTED CLASS]' if c['rejected'] else ''))
    print('[cues] class summary (likely SFX only):')
    for k, v in summary.items():
        print(f'  {k:7s} n={v["count"]:2d}  excess/bed {v["excessOverBedDb"]}  vsProgram {v["cueVsProgramDb"]}' + (f'  — {v["rejected"]}' if v['rejected'] else ''))
    print(f'[cues] → {rel(os.path.join(ref, "reference-cues.json"))}')


# ── features / match ───────────────────────────────────────────────────────
def list_audio(paths):
    for p in paths:
        if os.path.isfile(p):
            yield p
        elif os.path.isdir(p):
            for root, _, files in os.walk(p):
                for fn in sorted(files):
                    if fn.lower().endswith(AUDIO_EXT):
                        yield os.path.join(root, fn)


def cmd_features(a):
    res = {}
    for p in list_audio(a.files):
        res[rel(p)] = features(load(p))
    txt = json.dumps(clean(res), indent=1)
    if a.out:
        open(a.out, 'w').write(txt)
    else:
        print(txt)


VEC_KEYS = ('durationMs', 'attackMs', 'centroidHz', 'flatness', 'crestDb', 'lowRatio', 'highRatio', 'harmonic', 'slopeOctPerS')


def vec(f):
    return np.nan_to_num(np.array([math.log(f['durationMs'] + 1), math.log(f['attackMs'] + 1), math.log2(f['centroidHz'] + 1),
                     f['flatness'], f['crestDb'] / 10, f['lowRatio'], f['highRatio'], f['harmonic'], f['slopeOctPerS']], dtype=float))


def candidate_class(path, f):
    side = os.path.splitext(path)[0] + '.json'
    if os.path.exists(side):
        try:
            c = json.load(open(side)).get('class')
            if c:
                return c, 'sidecar'
        except Exception:
            pass
    man = os.path.join(os.path.dirname(path), 'manifest.json')
    if os.path.exists(man):
        try:
            s = json.load(open(man)).get('sounds', {}).get(os.path.splitext(os.path.basename(path))[0])
            if s and s.get('class'):
                return s['class'], 'manifest'
        except Exception:
            pass
    return classify(f), 'guess'


def pool_of(path):
    p = path.replace('\\', '/')
    for key in ('palette-candidates', 'palette/', 'candidates/', 'explore/', 'refs/'):
        if key in p:
            return key.strip('/')
    return 'other'


def cmd_match(a):
    ref = a.ref
    doc = json.load(open(os.path.join(ref, 'reference-cues.json')))
    decisions_p = os.path.join(ref, 'audition-decisions.json')
    decisions = json.load(open(decisions_p)) if os.path.exists(decisions_p) else {}
    confirmed = {k for k, v in decisions.get('cues', {}).items() if v.get('isSfx') is True}
    denied = {k for k, v in decisions.get('cues', {}).items() if v.get('isSfx') is False}
    relabel = {k: v['class'] for k, v in decisions.get('cues', {}).items() if v.get('class')}
    refs = [c for c in doc['cues'] if (c['id'] in confirmed) or (c['likelySfx'] and c['id'] not in denied) or a.all]
    for c in refs:
        c['class'] = relabel.get(c['id'], c['class'])
    cands = []
    pools = list(a.pool)
    if a.self_test:
        pools.append(os.path.join(ref, 'cues'))
    seen_hash = set()
    skipped = []
    for p in list_audio(pools):
        base = os.path.basename(p)
        if a.self_test and '/cues/' in p.replace('\\', '/') and not base.endswith('-iso.wav'):
            continue
        name = os.path.splitext(base)[0]
        h = hashlib.md5(open(p, 'rb').read()).hexdigest()
        if h in seen_hash:
            continue                                   # same bytes already measured (palette vs its candidates folder)
        seen_hash.add(h)
        if 'near-silent' in name:
            skipped.append({'file': rel(p), 'why': 'marked near-silent'})
            continue
        f = features(load(p))
        if f['peakDb'] < -35:
            skipped.append({'file': rel(p), 'why': f'peak {f["peakDb"]} dBFS — too quiet to use'})
            continue
        cls, how = candidate_class(p, f)
        rej = name in REJECTED_NAMES or cls in REJECTED
        cands.append({'file': rel(p), 'name': name, 'class': cls, 'classFrom': how, 'pool': pool_of(p),
                      'rejected': rej, 'features': f})
    if not cands:
        sys.exit('[match] no candidate audio found in the pools')
    V = np.array([vec(c['features']) for c in refs] + [vec(c['features']) for c in cands])
    sd = V.std(axis=0) + 1e-6
    def dist(fa, fb):
        d = np.sqrt((((vec(fa) - vec(fb)) / sd) ** 2).mean())
        ma, mb = np.nan_to_num(np.array(fa['mfcc'][1:])), np.nan_to_num(np.array(fb['mfcc'][1:]))
        cos = 1 - float(ma @ mb / (np.linalg.norm(ma) * np.linalg.norm(mb) + EPS))
        return float(d + 2.0 * cos)
    per_cue = []
    self_hits = 0
    for c in refs:
        ranked = sorted(({'file': k['file'], 'name': k['name'], 'class': k['class'], 'pool': k['pool'],
                          'rejected': k['rejected'], 'distance': round(dist(c['features'], k['features']), 3),
                          'rmsActiveDb': k['features']['rmsActiveDb'], 'onsetMs': k['features']['onsetMs']}
                         for k in cands), key=lambda r: r['distance'])
        if a.self_test:
            self_hits += int(ranked[0]['file'].endswith(f'{c["id"]}-iso.wav'))
        usable = [r for r in ranked if not r['rejected'] and '/cues/' not in r['file']]
        best = usable[0]['distance'] if usable else 99
        fit = 'good' if best < 0.8 else 'fair' if best < 1.3 else 'poor — generate or download a closer sound'
        per_cue.append({'id': c['id'], 't': c['t'], 'class': c['class'], 'refRejected': c.get('rejected'), 'fit': fit,
                        'top': usable[: a.top], 'topIncludingRejected': ranked[: a.top]})
    report = {'_': 'Candidate ranking against the reference cues. Lower distance = closer character. Ear decides.',
              'ref': rel(ref), 'pools': [rel(p) for p in a.pool], 'cuesRanked': len(refs), 'candidates': len(cands),
              'selfTest': ({'hits': self_hits, 'of': len(refs)} if a.self_test else None),
              'fitScale': 'distance < 0.8 good · 0.8–1.3 fair · ≥ 1.3 poor (self-test distance is ~0)',
              'skipped': skipped,
              'perCue': per_cue,
              'candidatesMeasured': [{k: v for k, v in c.items() if k != 'features'} | {'features': {kk: c['features'][kk] for kk in VEC_KEYS + ('rmsActiveDb', 'onsetMs')}} for c in cands]}
    outp = os.path.join(ref, 'match-report.json')
    dump(report, outp)
    for pc in per_cue:
        tops = ' | '.join(f'{r["name"]}({r["pool"]},{r["distance"]})' for r in pc['top'])
        print(f'{pc["id"]} {pc["t"]:6.2f} {pc["class"]:7s} {pc["fit"].split(" ")[0]:5s} → {tops}')
    if a.self_test:
        print(f'[match] self-test: {self_hits}/{len(refs)} reference cues rank their own isolated clip #1')
    print(f'[match] {len(refs)} cues × {len(cands)} candidates → {rel(outp)}')


# ── plan levels (our films) ────────────────────────────────────────────────
def cmd_plan_levels(a):
    plan_p = a.plan
    plan = json.load(open(plan_p))
    sfx_dir = os.path.dirname(os.path.abspath(plan_p))
    dur = float(plan.get('duration') or 0)
    clips = []
    for tr in plan.get('tracks', []):
        tg = tr.get('gainDb', 0) or 0
        if tr.get('muted'):
            continue
        for c in tr.get('clips', []):
            if c.get('muted'):
                continue
            if c['type'] == 'media':
                f = c['file'] if os.path.isabs(c['file']) else os.path.join(sfx_dir, c['file'])
            else:
                f = os.path.join(sfx_dir, 'sounds', f'{c["sound"]}.mp3')
            clips.append({'track': tr.get('name', ''), 'clip': c, 'file': f, 'gainDb': (c.get('gainDb') or 0) + tg})
    if not dur:
        dur = max(c['clip']['t'] + (c['clip'].get('trim') or librosa.get_duration(path=c['file'])) for c in clips if os.path.exists(c['file']))
    n = int((dur + 1) * SR)
    backdrop = np.zeros(n, dtype=np.float32)
    cache = {}
    def audio(f):
        if f not in cache:
            cache[f] = load(f) if os.path.exists(f) else None
        return cache[f]
    for c in clips:                          # media = music / VO / ambience = the backdrop a cue sits on
        if c['clip']['type'] != 'media':
            continue
        y = audio(c['file'])
        if y is None:
            continue
        L = len(y) if not c['clip'].get('trim') else min(len(y), int(c['clip']['trim'] * SR))
        seg = y[:L].copy()
        fi, fo = c['clip'].get('fadeIn') or 0, c['clip'].get('fadeOut') or 0
        if fi:
            k = min(L, int(fi * SR)); seg[:k] *= np.linspace(0, 1, k)
        if fo:
            k = min(L, int(fo * SR)); seg[L - k:] *= np.linspace(1, 0, k)
        seg *= 10 ** (c['gainDb'] / 20)
        s0 = int(c['clip']['t'] * SR)
        backdrop[s0:s0 + len(seg)] += seg[: max(0, n - s0)]
    e_bd = frame_energy(backdrop)
    rows = []
    for c in clips:
        if c['clip']['type'] != 'sound':
            continue
        y = audio(c['file'])
        cls = (plan.get('sounds', {}).get(c['clip']['sound']) or {}).get('class')
        if y is None:
            rows.append({'sound': c['clip']['sound'], 't': c['clip']['t'], 'class': cls, 'missing': True})
            continue
        if c['clip'].get('trim'):
            y = y[: int(c['clip']['trim'] * SR)]
        f = features(y)
        cue_db = f['rmsActiveDb'] + c['gainDb']
        t_on = c['clip']['t'] + f['onsetMs'] / 1000
        i0 = int(t_on / FR)
        span = max(1, int(f['durationMs'] / 1000 / FR))
        pre = e_bd[max(0, i0 - int(0.35 / FR)):max(1, i0 - 3)]
        bed_db = db(np.median(pre)) if len(pre) else -120
        bed_during = db(np.mean(e_bd[i0:i0 + span])) if i0 < len(e_bd) else -120
        # the same measure as the reference: energy the cue ADDS over the backdrop, relative to the backdrop
        excess = None if bed_during < -70 else round(db((10 ** (cue_db / 10)) / (10 ** (bed_during / 10))), 1)
        rows.append({'track': c['track'], 'sound': c['clip']['sound'], 'label': c['clip'].get('label', '')[:60], 't': c['clip']['t'],
                     'class': cls, 'gainDb': c['gainDb'], 'cueRmsDb': round(cue_db, 1), 'cuePeakDb': round(f['peakDb'] + c['gainDb'], 1),
                     'bedBeforeDb': round(bed_db, 1), 'bedDuringDb': round(bed_during, 1), 'excessOverBedDb': excess,
                     'durationMs': f['durationMs'], 'onsetMs': f['onsetMs']})
    out = {'plan': rel(plan_p), 'durationS': dur, 'clips': rows}
    if a.program:
        out['program'] = ffmpeg_lufs(a.program)
        for r in rows:
            if 'cueRmsDb' in r and out['program']['I'] is not None:
                r['cueVsProgramDb'] = round(r['cueRmsDb'] - out['program']['I'], 1)
    print(json.dumps(clean(out), indent=1))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('split'); p.add_argument('ref'); p.set_defaults(fn=cmd_split)
    p = sp.add_parser('cues'); p.add_argument('ref')
    p.add_argument('--min-excess', type=float, default=6.0, help='drums-stem rise over its own recent floor, dB')
    p.add_argument('--other-z', type=float, default=2.5, help='other-stem onset must beat the local median onset strength by this factor')
    p.add_argument('--min-score', type=float, default=0.9)
    p.add_argument('--scene', type=float, default=0.25, help='ffmpeg scene-change threshold for visual cuts')
    p.set_defaults(fn=cmd_cues)
    p = sp.add_parser('features'); p.add_argument('files', nargs='+'); p.add_argument('--out'); p.set_defaults(fn=cmd_features)
    p = sp.add_parser('match'); p.add_argument('ref'); p.add_argument('--pool', action='append', default=[])
    p.add_argument('--top', type=int, default=3); p.add_argument('--all', action='store_true', help='rank every cue, not just likely SFX')
    p.add_argument('--self-test', action='store_true'); p.set_defaults(fn=cmd_match)
    p = sp.add_parser('plan-levels'); p.add_argument('plan'); p.add_argument('--program', help='rendered MP4/WAV for program loudness')
    p.set_defaults(fn=cmd_plan_levels)
    a = ap.parse_args()
    a.fn(a)


if __name__ == '__main__':
    import warnings
    warnings.filterwarnings('ignore')
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    main()
