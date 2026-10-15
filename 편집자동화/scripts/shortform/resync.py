"""숏폼 에이전트 — 자막 싱크 맞추기: 자막 시작을 실제 말소리 시작(음량 상승)에 붙이고, 끝은 다음 자막 시작까지 이어 붙임
  python resync.py <숏폼 오디오 wav> <자막 srt 또는 cues.json> <out.srt> [report.json]
2026-10-16 원인 (사용자: "자막 싱크가 안 맞아 … 내가 다 다시 손봐야 하는 수준"):
  받아쓰기(faster-whisper) 단어 시간은 쉼 뒤 첫 단어의 시작을 쉼 쪽으로 당기거나(최대 1.5초 이르게) 늦게 잡음 → 자막이 말보다 먼저/늦게 뜸.
  자막 시간 계산·숏폼 배치는 맞았음(실측 ±0.05초) — 틀린 건 단어 시작 시간 자체.
방법:
  1. 숏폼 오디오(시퀀스에서 내보낸 wav)의 10ms 음량 → 말소리 구간(잡음 바닥 + 12dB, 60ms 이상, 120ms 미만 틈은 메움)
  2. 자막마다 원래 시작 기준 [−0.8, +1.6]초 안의 말소리 시작점 중 가장 가까운 곳으로 (원래 시작이 말소리 구간 안이면, 그 구간의 시작이 0.35초 안일 때만 당김)
  3. 순서 유지(앞 자막 시작 + 0.25초 이후), 끝 = 다음 자막 시작 (사용자 수정본처럼 빈틈 없음). 마지막 자막 끝 = 원래 끝
"""
import json, re, sys
import numpy as np, soundfile as sf

def load_srt(p):
    out = []
    for b in open(p, encoding="utf-8-sig").read().strip().split("\n\n"):
        l = b.strip().split("\n")
        if len(l) < 3: continue
        a, c = l[1].split(" --> ")
        f = lambda x: (lambda h, m, s: int(h) * 3600 + int(m) * 60 + float(s.replace(",", ".")))(*x.strip().split(":"))
        out.append(dict(s=f(a), e=f(c), text="\n".join(l[2:])))
    return out

def tc(x):
    ms = round(x * 1000); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def speech_onsets(wav):
    a, sr = sf.read(wav, dtype="float32", always_2d=True); a = a.mean(1)
    n = sr // 100; k = len(a) // n
    db = 20 * np.log10(np.sqrt((a[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)
    floor = np.percentile(db, 15); thr = max(floor + 12, -50)
    on = db > thr
    # 120ms 미만 틈 메우기, 60ms 미만 소리 버리기
    i = 0
    while i < k:
        if not on[i]:
            j = i
            while j < k and not on[j]: j += 1
            if 0 < i and j < k and j - i < 12: on[i:j] = True
            i = j
        else: i += 1
    segs = []; i = 0
    while i < k:
        if on[i]:
            j = i
            while j < k and on[j]: j += 1
            if j - i >= 6: segs.append((i / 100, j / 100))
            i = j
        else: i += 1
    return segs, thr

def resync(cues, segs):
    starts = [s for s, e in segs]
    out = []; prev = -1
    for c in cues:
        s0 = c["s"]; inside = next((sg for sg in segs if sg[0] <= s0 < sg[1]), None)
        if inside:
            ns = inside[0] if s0 - inside[0] <= 0.35 else s0
        else:
            cand = [x for x in starts if s0 - 0.8 <= x <= s0 + 1.6]
            ns = min(cand, key=lambda x: abs(x - s0)) if cand else s0
        ns = max(ns, prev + 0.25) if prev >= 0 else max(ns, 0)
        out.append(dict(s=round(ns, 3), e=None, text=c["text"], s_old=round(s0, 3))); prev = ns
    for i in range(len(out) - 1): out[i]["e"] = out[i + 1]["s"]
    if out: out[-1]["e"] = round(max(cues[-1]["e"], out[-1]["s"] + 0.5), 3)
    return out

if __name__ == "__main__":
    wav, src, dst = sys.argv[1:4]
    cues = load_srt(src) if src.endswith(".srt") else json.load(open(src, encoding="utf-8"))
    segs, thr = speech_onsets(wav)
    R = resync(cues, segs)
    open(dst, "w", encoding="utf-8-sig", newline="\r\n").write("\n".join(f"{i + 1}\n{tc(r['s'])} --> {tc(r['e'])}\n{r['text']}\n" for i, r in enumerate(R)))
    moved = [abs(r["s"] - r["s_old"]) for r in R]
    print(f"자막 {len(R)}  옮긴 것(0.1초↑) {sum(m > 0.1 for m in moved)}  최대 {max(moved):.2f}초  말소리 구간 {len(segs)}  기준 {thr:.1f}dB")
    if len(sys.argv) > 4: json.dump(R, open(sys.argv[4], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
