// 놀심 에이전트 — 포인트 자막 크기·위치를 레퍼런스(r1)에 맞춤 (2026-10-28)
// 사용: execute_extendscript code =
//   var JOBS="<size_jobs.json>"; var NP_RESULT=""; $.evalFile("<이 파일>"); return NP_RESULT;
// JOBS = {sequence_name, jobs:[{tr(0부터), s(시작 초), scale(%), pos([x,y] 0~1)}]} — 트랙·시작 시각으로 클립을 찾아 Motion 크기·위치를 넣음
(function () {
    var f = new File(JOBS); f.encoding = "UTF-8"; f.open("r"); var D = JSON.parse(f.read()); f.close();
    var seq = app.project.activeSequence;
    if (!seq || seq.name != D.sequence_name) { NP_RESULT = "활성 시퀀스가 " + D.sequence_name + " 아님"; return; }
    var ok = 0, bad = [];
    for (var k = 0; k < D.jobs.length; k++) {
        var j = D.jobs[k], cs = seq.videoTracks[j.tr].clips, cl = null;
        for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - j.s) < 0.002) cl = cs[c];
        if (!cl) { bad.push(k + " 클립 없음"); continue; }
        var mo = null;
        for (var i = 0; i < cl.components.numItems; i++) if (cl.components[i].matchName == "AE.ADBE Motion") mo = cl.components[i];
        mo.properties[1].setValue(j.scale, true); mo.properties[0].setValue(j.pos, true);
        var p = mo.properties[0].getValue();
        if (Math.abs(mo.properties[1].getValue() - j.scale) < 0.01 && Math.abs(p[0] - j.pos[0]) < 1e-4 && Math.abs(p[1] - j.pos[1]) < 1e-4) ok++; else bad.push(k + " 값 확인 실패");
    }
    NP_RESULT = "ok " + ok + "/" + D.jobs.length + (bad.length ? " / " + bad.join(", ") : "");
})();
