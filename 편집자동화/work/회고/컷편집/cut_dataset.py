"""컷편집 회고 — 4개 영상에서 사용자가 최종 종편 때 추가로 자른 곳을 한 형식으로 모음 (2026-10-13)

에이전트 시퀀스(컷 전) vs 사용자 최종본: A1 메인 마이크 원본 구간을 비교해 빠진 원본 구간 = 컷.
구간마다: 컷 전 시퀀스 시간·길이(프레임)·그 시간 대사(SRT)·앞뒤 대사·소리 크기(원본 오디오 10ms RMS)·엔딩까지 거리
되살린 곳(최종본에만 있는 원본 구간)도 따로.
사용: python cut_dataset.py  → cuts.json, cuts.md
"""
import json, os, re, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
W = os.path.join(H, "..")
P = os.path.join(H, "..", "..", "포인트")
FPS = 29.97
V = [
    ("옆구리살", "옆구리살_color.json", "옆구리살_final.json", "옆구리살_종편_모노_컷전환_색보정.srt"),
    ("목교정기", "목교정기/color.json", "목교정기/final.json", "목교정기_종편_모노_색보정.srt"),
    ("자세교정", "자세교정/shot.json", "자세교정/final.json", "자세교정_종편_모노_컷전환_색보정_샷사이즈.srt"),
    ("틀어진골반", "틀어진골반/shot.json", "틀어진골반/final.json", "틀어진골반_종편_모노_컷전환_색보정_샷사이즈.srt"),
]


def srt(path):
    out = []
    for b in open(path, encoding="utf-8-sig").read().strip().split("\n\n"):
        l = b.split("\n")
        t = [int(a) * 3600 + int(b_) * 60 + int(c) + int(d) / 1000 for a, b_, c, d in re.findall(r"(\d+):(\d+):(\d+),(\d+)", l[1])]
        out.append((int(l[0]), t[0], t[1], " ".join(l[2:])))
    return out


def find_path(d, name):
    for g in ("audio", "video"):
        for t in d.get(g, []):
            for c in t["clips"]:
                if c["name"] == name and c.get("path"):
                    return c["path"]
    import glob
    hit = glob.glob(os.path.join("C:\DADA\1.프로젝트", "**", name), recursive=True)
    return hit[0] if hit else None


def main_clips(d):
    cl = d["audio"][0]["clips"]
    from collections import Counter
    name = Counter(c["name"] for c in cl).most_common(1)[0][0]
    path = find_path(d, name)
    sel = [c for c in cl if c["name"] == name]
    for c in sel:
        c.setdefault("path", path)
    return name, sel


def sub(A, B):
    """A 구간들 중 B에 덮이지 않은 원본 구간 → [(src0, src1, A 시퀀스 시간)]"""
    out = []
    for c in A:
        a0, a1 = c["in"], c["in"] + c["e"] - c["s"]
        segs = [(a0, a1)]
        for b in B:
            b0, b1 = b["in"], b["in"] + b["e"] - b["s"]
            ns = []
            for x0, x1 in segs:
                if b1 <= x0 or b0 >= x1:
                    ns.append((x0, x1)); continue
                if b0 > x0: ns.append((x0, b0))
                if b1 < x1: ns.append((b1, x1))
            segs = ns
        for x0, x1 in segs:
            if x1 - x0 > 1.5 / FPS:
                out.append((x0, x1, c["s"] + x0 - a0, c["path"]))
    # 붙어 있는 조각 합치기 (A 시간 기준)
    out.sort(key=lambda x: x[2])
    m = []
    for x in out:
        if m and abs(m[-1][2] + (m[-1][1] - m[-1][0]) - x[2]) < 0.02 and abs(m[-1][1] - x[0]) < 0.02:
            m[-1] = (m[-1][0], x[1], m[-1][2], x[3])
        else:
            m.append(x)
    return m


def level(path, s0, s1):
    """원본 오디오 10ms RMS dB → (말소리 비율 -40dB 이상, 최대 dB, 중간 dB)"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, s0):.3f}", "-t", f"{s1 - s0:.3f}", "-i", path,
                          "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    if len(x) < 160:
        return 0.0, -99.0, -99.0
    n = len(x) // 160
    r = np.sqrt((x[:n * 160].reshape(n, 160) ** 2).mean(1)) + 1e-9
    db = 20 * np.log10(r)
    return float((db > -40).mean()), float(db.max()), float(np.median(db))


def fmt(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


rows, restored = [], []
for name, bf, ff, sf in V:
    B, F = json.load(open(os.path.join(W, bf), encoding="utf-8")), json.load(open(os.path.join(W, ff), encoding="utf-8"))
    src, bc = main_clips(B)
    _, fc = main_clips(F)
    main_end = max(c["e"] for c in bc)
    cues = srt(os.path.join(P, sf))
    for s0, s1, t, path in sub(bc, fc):
        L = s1 - s0
        inside = [(n, x) for n, a, b, x in cues if b > t + 0.05 and a < t + L - 0.05]
        prev = [x for n, a, b, x in cues if b <= t + 0.05][-1:] if cues else []
        nxt = [x for n, a, b, x in cues if a >= t + L - 0.05][:1]
        sp, mx, md = level(path, s0, s1)
        rows.append({"video": name, "t": round(t, 3), "tc": fmt(t), "len": round(L, 3), "frames": round(L * FPS),
                     "src": round(s0, 3), "cues": [n for n, _ in inside], "said": " / ".join(x for _, x in inside),
                     "prev": " ".join(prev), "next": " ".join(nxt), "speech": round(sp, 2), "max_db": round(mx, 1),
                     "med_db": round(md, 1), "to_end": round(main_end - t, 1)})
    for s0, s1, t, path in sub(fc, bc):
        restored.append({"video": name, "final_t": fmt(t), "len": round(s1 - s0, 3), "frames": round((s1 - s0) * FPS)})
json.dump({"cuts": rows, "restored": restored}, open(os.path.join(H, "cuts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for v in [x[0] for x in V]:
    r = [x for x in rows if x["video"] == v]
    print(f"== {v}: 컷 {len(r)}곳 {sum(x['len'] for x in r):.1f}초 / 되살림 {len([x for x in restored if x['video'] == v])}곳")
    for x in r:
        print(f"  {x['tc']:>8} {x['len']:6.2f}s {x['frames']:4d}f 말{x['speech']:.2f} max{x['max_db']:6.1f} 끝까지{x['to_end']:6.1f} | {x['said'][:70]} || 앞:{x['prev'][:20]} 뒤:{x['next'][:20]}")
