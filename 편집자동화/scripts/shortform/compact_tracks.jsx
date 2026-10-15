// 숏폼 에이전트 — 영상(V1) 위 요소 트랙을 한 칸 띄우고 빈칸 없이 이어 놓기 (2026-10-16 사용자: "v3,v5 이런 식으로 간격이 띄워져 있어서 요소가 한 번에 안 보여, 비디오클립 기준으로 한 칸만 위에 띄워서 추가된 요소들은 모두 쭉 이어서")
// 결과: V1 영상 / V2 비움 / V3 프레임 / V4 안내 박스 / V5 하단 안내 …(요소 트랙 순서 유지) → 위쪽 빈 트랙은 지움
// 사용: (function(){ SEQ_NAME="<시퀀스>"; CT_RESULT=""; $.evalFile("<이 파일>"); return CT_RESULT; })()
(function () {
    var P = app.project, s = null, log = [];
    for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == SEQ_NAME) s = P.sequences[i];
    function T(t) { var x = new Time(); x.ticks = t; return x; }
    // 요소가 있는 트랙(V2부터) 순서대로 → 목표 V3, V4, …
    var src = []; for (var v = 1; v < s.videoTracks.numTracks; v++) if (s.videoTracks[v].clips.numItems) src.push(v);
    var dst = 2;
    for (var k = 0; k < src.length; k++, dst++) {
        var from = src[k]; if (from == dst) continue;
        var A = s.videoTracks[from].clips, B = s.videoTracks[dst], items = [];
        for (var c = 0; c < A.numItems; c++) items.push({ it: A[c].projectItem, st: A[c].start.ticks, en: A[c].end.ticks, ss: A[c].start.seconds, inp: A[c].inPoint.ticks });
        for (var c = A.numItems - 1; c >= 0; c--) A[c].remove(false, false);
        for (var j = 0; j < items.length; j++) {
            B.overwriteClip(items[j].it, items[j].ss);
            var d = B.clips, nk = null; for (var c = 0; c < d.numItems; c++) if (Math.abs(d[c].start.seconds - items[j].ss) < 0.02) nk = d[c];
            if (nk) nk.end = T(items[j].en); else log.push("못 놓음 V" + (dst + 1) + " " + items[j].ss);
        }
        log.push("V" + (from + 1) + "→V" + (dst + 1) + " " + items.length);
    }
    // 위쪽 빈 트랙 지우기 (QE)
    P.openSequence(s.sequenceID); P.activeSequence = s; app.enableQE(); var q = qe.project.getActiveSequence();
    var rm = 0;
    for (var v = s.videoTracks.numTracks - 1; v >= dst; v--) if (s.videoTracks[v].clips.numItems == 0) { q.removeVideoTrack(v); rm++; }
    P.save();
    var cnt = []; for (var v = 0; v < s.videoTracks.numTracks; v++) cnt.push("V" + (v + 1) + ":" + s.videoTracks[v].clips.numItems);
    CT_RESULT = SEQ_NAME + " | " + log.join("; ") + " | 지운 트랙 " + rm + " | " + cnt.join(" ");
})();
