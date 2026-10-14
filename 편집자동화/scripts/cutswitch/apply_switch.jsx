// 컷전환 에이전트 — V2(메인캠)를 끄고 아래 캠이 보이게 하기
// 사용: var SEQ_ID="<_컷전환 시퀀스 ID>"; var RAZOR=["00:00:43;11",...]; (V2만 자를 드롭프레임 타임코드)
//       var OFF=[[시작초,끝초],...]; (이 구간 안에 들어가는 V2 클립을 비활성화)
//       var MARK=[[시작초,끝초,"이름","설명"],...]; $.evalFile(".../apply_switch.jsx"); return SWITCH_RESULT;
(function () {
    app.enableQE();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    var qt = qe.project.getActiveSequence().getVideoTrackAt(1);
    for (var r = 0; r < RAZOR.length; r++) qt.razor(RAZOR[r]);
    var cs = seq.videoTracks[1].clips, off = 0, eps = 0.02;
    for (var c = 0; c < cs.numItems; c++) {
        var s = cs[c].start.seconds, e = cs[c].end.seconds;
        for (var k = 0; k < OFF.length; k++) if (s >= OFF[k][0] - eps && e <= OFF[k][1] + eps) { cs[c].disabled = true; off++; }
    }
    for (var m = 0; m < MARK.length; m++) {
        var mk = seq.markers.createMarker(MARK[m][0]);
        mk.end = MARK[m][1]; mk.name = MARK[m][2]; mk.comments = MARK[m][3];
        try { mk.setColorByIndex(MARK[m][4] || 0); } catch (x) {}
    }
    SWITCH_RESULT = seq.name + ": razor " + RAZOR.length + ", V2 off " + off + ", markers " + MARK.length;
})();
