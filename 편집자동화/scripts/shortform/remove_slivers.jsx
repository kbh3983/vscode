// 숏폼 에이전트 — V1·A1 컷 이음새의 조각 클립(MAXDUR초 미만)을 지우고 옆 클립을 늘려 메운다 (2026-10-18)
// 사용자: "모두 컷 이음새마다 남긴 조각 클립 있다면 지워줘." / "자막은 내가 넣을 거라 손대지 말아줘."
//   → 타이밍을 바꾸지 않음(리플 없음): 앞 클립 끝을 조각 끝까지 늘림, 맨 앞 조각이면 뒤 클립 시작을 조각 시작까지 당김
//   자막·그래픽 트랙은 건드리지 않음
// 사용: (function(){ NAMES=["자세교정_숏폼2_엔딩"]; MAXDUR=0.3; DRY=true; AS_RESULT=""; $.evalFile("<이 파일>"); return AS_RESULT; })()
(function () {
    var P = app.project, out = [];
    function seq(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function T(x) { var t = new Time(); t.seconds = x; return t; }
    for (var k = 0; k < NAMES.length; k++) {
        var s = seq(NAMES[k]); if (!s) { out.push("없음 " + NAMES[k]); continue; }
        var rep = NAMES[k] + ":";
        var tracks = [["V1", s.videoTracks[0]], ["A1", s.audioTracks[0]]];
        for (var q = 0; q < tracks.length; q++) {
            var TR = tracks[q][1], n = 0, guard = 0, fail = [];
            while (guard++ < 200) {
                var cs = TR.clips, hit = -1;
                for (var c = 0; c < cs.numItems; c++) if (cs[c].end.seconds - cs[c].start.seconds < MAXDUR) { hit = c; break; }
                if (hit < 0) break;
                var C = cs[hit], st = C.start.seconds, en = C.end.seconds;
                var pv = hit > 0 ? cs[hit - 1] : null, nx = hit < cs.numItems - 1 ? cs[hit + 1] : null;
                if (DRY) { n++; fail.push(st.toFixed(3)); if (n > 50) break; C = null; break; }
                if (pv && Math.abs(pv.end.seconds - st) < 0.02) {
                    C.remove(false, false);
                    pv = TR.clips[hit - 1]; var o0 = pv.outPoint.seconds;
                    pv.end = T(en);
                    pv = TR.clips[hit - 1]; pv.outPoint = T(pv.inPoint.seconds + (pv.end.seconds - pv.start.seconds));   // end만 늘리면 소스 out이 그대로 남음 (2026-10-18 확인)
                    if (Math.abs(pv.end.seconds - en) > 0.02 || pv.outPoint.seconds - o0 < (en - st) - 0.02) fail.push("앞늘림실패@" + st.toFixed(3));
                } else if (nx && Math.abs(nx.start.seconds - en) < 0.02) {
                    C.remove(false, false);
                    nx = TR.clips[hit]; var i0 = nx.inPoint.seconds;
                    nx.start = T(st);
                    nx = TR.clips[hit]; nx.inPoint = T(i0 - (en - st));   // start를 당기면 내용이 통째로 앞당겨짐 → in을 조각 길이만큼 앞으로
                    nx = TR.clips[hit]; nx.outPoint = T(nx.inPoint.seconds + (nx.end.seconds - nx.start.seconds));
                    if (Math.abs(nx.start.seconds - st) > 0.02 || i0 - nx.inPoint.seconds < (en - st) - 0.02) fail.push("뒤당김실패@" + st.toFixed(3) + " in" + i0.toFixed(3) + "→" + nx.inPoint.seconds.toFixed(3) + " end" + nx.end.seconds.toFixed(3));
                } else { fail.push("이웃없음@" + st.toFixed(3)); break; }
                n++;
            }
            rep += " " + tracks[q][0] + " " + n + "개" + (fail.length ? " [" + fail.join(",") + "]" : "");
        }
        out.push(rep);
    }
    if (!DRY) P.save();
    AS_RESULT = out.join("\n");
})();
