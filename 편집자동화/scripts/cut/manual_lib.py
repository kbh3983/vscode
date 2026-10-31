"""컷편집 에이전트 — 받아쓰기(transcript.json: [{s,e,t,w:[[s,e,단어]]}])로 manual.json·ne_candidates.json·subtitle.json 만들기 (2026-10-29 261020 최박사 build_manual.py를 공용으로)
쓰는 법 (작업 폴더의 build_manual.py):
  import sys; sys.path.insert(0, "<repo>/scripts/cut"); from manual_lib import *
  L = Lib("<work 폴더>")          # <work>/subtitle/transcript.json
  CUTS = [("C2", s, e, "delete"|"review", 확신도, 대사, 이유, split여부), ...]  — L.ws(i,k)/L.we(i,k)/L.gap(a,b,k)로 시간 (i = transcript.txt 줄 번호)
  L.write(CUTS, KEEP=[(s,e,이유)], TAKES=[...], seq="시퀀스 이름", dur=길이초)
"""
import json, os, re

NE = ("네", "예", "넵", "네네")


class Lib:
    def __init__(self, work):
        self.work = work
        self.T = json.load(open(os.path.join(work, "subtitle", "transcript.json"), encoding="utf-8"))

    def ws(self, i, k=0): return self.T[i - 1]["w"][k][0]
    def we(self, i, k=-1): return self.T[i - 1]["w"][k][1]
    def gap(self, a, b, k=0): return round(self.we(a - 1) + 0.15, 3), round(self.ws(b + 1, k) - 0.1, 3)   # 줄 a~b 지움, 다음 줄 k번째 단어부터 남김

    def write(self, CUTS, KEEP=(), TAKES=(), seq="", dur=0.0, sound_extra=()):
        os.makedirs(os.path.join(self.work, "cut"), exist_ok=True)
        cuts = [{"task": t, "start": round(s, 3), "end": round(e, 3), "action": a, "confidence": c, "text": x, "reason": r,
                 **({"split": True} if sp else {})} for t, s, e, a, c, x, r, sp in CUTS]
        bad = [c for c in cuts if c["end"] <= c["start"]]
        if bad: raise SystemExit(f"시작 ≥ 끝: {bad}")
        dels = [(c["start"], c["end"]) for c in cuts if c["action"] == "delete"]
        inside = lambda a, b: any(a < e and b > s for s, e in dels)
        inkeep = lambda t: any(s <= t <= e for s, e, _ in KEEP) or any(s <= t <= e for s, e in sound_extra)
        words = [(w[0], w[1], w[2], i + 1) for i, c in enumerate(self.T) for w in c["w"]]
        ne = []
        for k, (s, e, w, ci) in enumerate(words):
            if re.sub(r"[,.?!]", "", w) not in NE or inside(s, e): continue
            pe = words[k - 1][1] if k else 0.0
            ns = words[k + 1][0] if k + 1 < len(words) else e + 0.5
            ne.append({"t": round((s + e) / 2 if e - s < 0.5 else s + 0.2, 2), "prev_end": round(pe, 3), "next_start": round(ns, 3),
                       "mode": "sound" if inkeep(s) else "pause", "cue": f"{ci}: {self.T[ci - 1]['t']}"})
        json.dump(ne, open(os.path.join(self.work, "cut", "ne_candidates.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        man = {"sequence": seq, "duration": dur, "confirmed_ids_before": [], "note": "받아쓰기 = transcript.json(faster-whisper 단어 시간)",
               "keep_silence": [{"start": round(s, 3), "end": round(e, 3), "reason": r} for s, e, r in KEEP], "cuts": cuts, "takes": list(TAKES)}
        json.dump(man, open(os.path.join(self.work, "cut", "manual_base.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        sub = {"sequence": {"sequence": seq, "fps": 30000 / 1001, "start": 0.0},
               "cues_final": [{"start": c["s"], "end": c["e"], "text": c["t"], "words": [{"start": w[0], "end": w[1], "word": w[2]} for w in c["w"]]} for c in self.T]}
        json.dump(sub, open(os.path.join(self.work, "subtitle", "subtitle.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(len(cuts), "컷", len(dels), "삭제", round(sum(e - s for s, e in dels), 1), "초 / 네 후보", len(ne))


def merge(work, single_cam=False):
    """manual_base.json + ne_plan.json → manual.json. single_cam이면 운동·시연 중(sound) '네'는 마커만"""
    d = os.path.join(work, "cut")
    m = json.load(open(os.path.join(d, "manual_base.json"), encoding="utf-8"))
    rows = json.load(open(os.path.join(d, "ne_plan.json"), encoding="utf-8"))["rows"]
    unclear = []
    for r in rows:
        real = r["act"] == "delete" and any(w in r.get("heard", "") for w in ("네", "예"))
        if real and (r["mode"] == "pause" or not single_cam):
            m["cuts"].append({"task": "C4네", "start": r["s"], "end": r["e"], "action": "delete", "confidence": 0.9, "text": "네",
                              "reason": "[최박사] 습관 '네' — ne_find 받아쓰기 확인" + (" (시연 중: 소리만, 점프컷)" if r["mode"] == "sound" else "")})
        elif real:
            s, e = r["blob"]
            m["cuts"].append({"task": "C4네", "start": round(s - 0.04, 3), "end": round(e + 0.04, 3), "action": "review", "confidence": 0.5,
                              "text": "네", "reason": "시연 중 '네' — 지울지 결정"})
        else:
            unclear.append(r)
    m["cuts"].sort(key=lambda c: c["start"])
    json.dump(m, open(os.path.join(d, "manual.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(unclear, open(os.path.join(d, "ne_unclear.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(m["cuts"]), "컷 / 네 확인 안 됨", len(unclear))
