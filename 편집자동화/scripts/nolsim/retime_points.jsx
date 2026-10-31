// 놀심 — 포인트 자막 시작·끝을 화면 확대(128%) 경계에 맞춤 (사용자 2026-10-30: 검수 1·2번 수정)
// 사용: var SEQ_ID="<ID>"; var EDITS=[{tr:"V4", s:"<원래 시작 틱>", ns:"<새 시작 틱>", ne:"<새 끝 틱>"}]; var RT_RESULT=""; $.evalFile("<이 파일>");
// 포인트 자막은 inPoint 0이라 앞으로 못 늘림 → 시작을 옮길 땐 클립을 통째로 move 한 뒤 끝을 다시 맞춤 (나타나는 애니메이션 그대로)
(function () {
    var s = null; for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    function T(t) { var x = new Time(); x.ticks = String(t); return x; }
    var out = [];
    for (var k = 0; k < EDITS.length; k++) {
        var E = EDITS[k], tr = s.videoTracks[parseInt(E.tr.slice(1), 10) - 1], cl = null;
        for (var j = 0; j < tr.clips.numItems; j++) if (tr.clips[j].start.ticks == E.s) cl = tr.clips[j];
        if (!cl) { out.push("못 찾음 " + E.tr + " " + E.s); continue; }
        if (cl.start.ticks != E.ns) { var d = new Time(); d.ticks = String(Number(E.ns) - Number(E.s)); cl.move(d); }
        if (cl.end.ticks != E.ne) cl.end = T(E.ne);
        out.push(cl.name.slice(0, 20) + " " + cl.start.ticks + "-" + cl.end.ticks + " in " + cl.inPoint.ticks);
    }
    RT_RESULT = out.join("\n");
})();
