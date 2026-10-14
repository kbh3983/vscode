// 포인트 에이전트 — 배치.json 기준으로 빠진 후보 클립을 다시 넣기 (프리미어 템플릿이 가끔 안 들어감)
// 사용: var PLAN="<배치.json>"; var AT=<빈 오디오 트랙 index>; var LIMIT=<최대 몇 개>; var FILL_RESULT=""; $.evalFile("<이 파일>"); return FILL_RESULT;
// 넣은 뒤 바로 다시 찾아서 실제로 있는지 확인. 프리미어 템플릿은 텍스트를 건드리지 않는다 (글자가 사라짐)
(function () {
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var plan = JSON.parse(f.read()); f.close();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == plan.sequence_id) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    function find(vt, s) {
        var cs = seq.videoTracks[vt].clips;
        for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - s) < 0.05) return cs[c];
        return null;
    }
    var done = [], failed = [], n = 0, lim = (typeof LIMIT == "number") ? LIMIT : 999;
    for (var p = 0; p < plan.points.length && n < lim; p++) {
        var pt = plan.points[p];
        for (var k = 0; k < pt.candidates.length && n < lim; k++) {
            var vt = plan.first_track + k;
            if (find(vt, pt.start)) continue;
            n++;
            var t = new Time(); t.seconds = pt.start;
            var item = seq.importMGT(pt.candidates[k].path, t.ticks, vt, AT);
            var got = find(vt, pt.start);
            if (got) { var e = new Time(); e.seconds = pt.end; got.end = e; }
            got = find(vt, pt.start);
            (got ? done : failed).push(pt.n + ":V" + (vt + 1) + (item ? "" : "(null)") + (got ? " " + got.end.seconds.toFixed(2) : ""));
        }
    }
    FILL_RESULT = JSON.stringify({ done: done, failed: failed });
})();
