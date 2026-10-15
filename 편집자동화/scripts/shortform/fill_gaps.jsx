// 숏폼 에이전트 — 시퀀스 V1·A1 클립 사이 1~2프레임 틈을 앞 클립 끝을 늘려 메움 (rebuild_v1.jsx와 같은 처리, 이미 만든 시퀀스용)
// 사용: (function(){ SUFFIX="_샷"; FG_RESULT=""; $.evalFile("<이 파일>"); return FG_RESULT; })()
(function () {
    var P = app.project, out = [];
    for (var i = 0; i < P.sequences.numSequences; i++) {
        var s = P.sequences[i]; if (s.name.slice(-SUFFIX.length) != SUFFIX || s.name.indexOf("숏폼소스") >= 0) continue;
        var n = 0;
        for (var q = 0; q < 2; q++) { var c4 = [s.videoTracks[0], s.audioTracks[0]][q].clips; for (var c = 0; c < c4.numItems - 1; c++) { var gap = (Number(c4[c + 1].start.ticks) - Number(c4[c].end.ticks)) / 254016000000; if (gap > 0.0001 && gap < 0.1) { var e2 = new Time(); e2.ticks = c4[c + 1].start.ticks; c4[c].end = e2; n++; } } }
        out.push(s.name + " " + n);
    }
    P.save();
    FG_RESULT = out.join("\n");
})();
