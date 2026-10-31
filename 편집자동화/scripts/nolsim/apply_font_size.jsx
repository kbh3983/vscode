// 놀심 에이전트 — 포인트 자막 글자 크기(fontSizeEditValue)를 클립마다 넣기 (2026-10-29 크기 통일)
// 사용: var JOBS="<size_jobs.json>"; var NP_RESULT=""; $.evalFile("<이 파일>"); return NP_RESULT;
// JOBS = {sequence_name, jobs:[{tr(0부터), s(시작 초), fs}]} — 글자 크기는 글자 줄 가운데 기준이라 위치는 그대로
(function () {
    var f = new File(JOBS); f.encoding = "UTF-8"; f.open("r"); var D = JSON.parse(f.read()); f.close();
    var seq = app.project.activeSequence;
    if (!seq || seq.name != D.sequence_name) { NP_RESULT = "활성 시퀀스가 " + D.sequence_name + " 아님"; return; }
    var ok = 0, bad = [];
    for (var k = 0; k < D.jobs.length; k++) {
        var j = D.jobs[k], cs = seq.videoTracks[j.tr].clips, cl = null;
        for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - j.s) < 0.01) cl = cs[c];
        if (!cl) { bad.push(j.s + " 클립 없음"); continue; }
        var m = cl.getMGTComponent(), done = false;
        for (var p = 0; p < m.properties.numItems; p++) {
            var pr = m.properties[p], v = ""; try { v = pr.getValue(); } catch (e) {}
            if (typeof v == "string" && v.indexOf("textEditValue") >= 0) {
                var js = JSON.parse(v), a = [];
                for (var q = 0; q < js.fontSizeEditValue.length; q++) a.push(j.fs);
                js.fontSizeEditValue = a; pr.setValue(JSON.stringify(js), true);
                done = Math.abs(JSON.parse(pr.getValue()).fontSizeEditValue[0] - j.fs) < 0.01; break;
            }
        }
        if (done) ok++; else bad.push(j.s + " 확인 실패");
    }
    NP_RESULT = "ok " + ok + "/" + D.jobs.length + (bad.length ? " / " + bad.join(", ") : "");
})();
