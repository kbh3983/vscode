// 포인트 에이전트 — 비교 시퀀스에서 한 트랙만 켜고 프레임별 PNG 내보내기
// 사용: var SEQ_ID="<ID>"; var SOLO=<켤 비디오 트랙 index>; var N=<프레임 수>; var START=<시작 초>; var OUT="<폴더\\접두>"; var EF_RESULT=""; $.evalFile("<이 파일>"); return EF_RESULT;
// QE exportFramePNG에 시퀀스 시간(ticks)으로 정확한 프레임을 지정한다 (MCP capture_frame은 소수 초에서 엉뚱한 프레임을 줄 때가 있음)
(function () {
    app.enableQE();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    var was = [];   // 끄기 전 상태를 기억했다가 끝나면 되돌린다
    for (var v = 0; v < seq.videoTracks.numTracks; v++) {
        var cs = seq.videoTracks[v].clips;
        for (var c = 0; c < cs.numItems; c++) { was.push([cs[c], cs[c].disabled]); cs[c].disabled = (v != SOLO); }
    }
    var q = qe.project.getActiveSequence();
    var tpf = Number(seq.timebase), out = [];
    for (var n = 0; n < N; n++) {
        var t = new Time(); t.ticks = String(Math.round(START * 254016000000 / tpf) * tpf + n * tpf);
        var tc = t.getFormatted(seq.getSettings().videoFrameRate, seq.getSettings().videoDisplayFormat);
        var name = OUT + (n < 10 ? "0" : "") + n;
        q.exportFramePNG(tc, name);
        if (n < 2) out.push(tc);
    }
    for (var r = 0; r < was.length; r++) was[r][0].disabled = was[r][1];
    EF_RESULT = "ok " + out.join(",");
})();
