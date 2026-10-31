// 놀심 에이전트 — 펀치인을 지금 포인트 자막 구간에 다시 맞춤 (2026-10-28)
// 사용: execute_extendscript code =
//   var PLAN="<punch_fix.json>"; var NP_RESULT=""; $.evalFile("<이 파일>"); return NP_RESULT;
// PLAN = {sequence_id, ranges:[[s,e],...]} (확대할 자막 구간, 초)
// V1을 각 구간 시작·끝에서 자르고, 구간 안 클립은 113.5%·얼굴 위치, 구간 밖 113.5% 클립은 100%·가운데로 되돌림
(function () {
    var PUNCH_SCALE = 113.5, PUNCH_POS = [0.5113, 0.5287], BASE_POS = [0.5, 0.5];
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var plan = JSON.parse(f.read()); f.close();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == plan.sequence_id) seq = app.project.sequences[i];
    if (!seq) { NP_RESULT = "시퀀스 없음"; return; }
    app.project.activeSequence = seq;
    var TPF = Number(seq.timebase), TPS = 254016000000, R = plan.ranges;
    function ticks(sec) { return Math.round(sec * TPS / TPF) * TPF; }
    function tc(sec) { var t = new Time(); t.ticks = String(ticks(sec)); return t.getFormatted(seq.getSettings().videoFrameRate, seq.getSettings().videoDisplayFormat); }
    app.enableQE();
    var qt = qe.project.getActiveSequence().getVideoTrackAt(0);
    for (var k = 0; k < R.length; k++) { qt.razor(tc(R[k][0])); qt.razor(tc(R[k][1])); }
    function inside(a, b) {
        for (var r = 0; r < R.length; r++) if (a >= ticks(R[r][0]) - TPF / 2 && b <= ticks(R[r][1]) + TPF / 2) return 1;
        return 0;
    }
    var cs = seq.videoTracks[0].clips, on = 0, off = 0;
    for (var c = 0; c < cs.numItems; c++) {
        var cl = cs[c], mo = null;
        for (var j = 0; j < cl.components.numItems; j++) if (cl.components[j].matchName == "AE.ADBE Motion") mo = cl.components[j];
        if (!mo) continue;
        if (inside(Number(cl.start.ticks), Number(cl.end.ticks))) { mo.properties[1].setValue(PUNCH_SCALE, true); mo.properties[0].setValue(PUNCH_POS, true); on++; }
        else if (Math.abs(mo.properties[1].getValue() - 100) > 0.01) { mo.properties[1].setValue(100, true); mo.properties[0].setValue(BASE_POS, true); off++; }
    }
    NP_RESULT = "구간 " + R.length + ", 확대 " + on + ", 되돌림 " + off;
})();
