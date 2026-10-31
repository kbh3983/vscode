// 놀심 에이전트 — 포인트 자막 클립마다 등장 뒤 한 장면을 PNG로 (크기 측정용, 2026-10-29)
// 사용: var OUT="<폴더>"; var FROM=0; var COUNT=30; var NP_RESULT=""; $.evalFile("<이 파일>"); return NP_RESULT;
// V3(index 2)부터 그래픽 템플릿 클립, 두 줄 템플릿(D2·B2) 제외. 꺼진 트랙은 뽑는 동안만 켰다가 원래대로
// SKIP_MUTED=true 이면 꺼진 트랙 클립은 뺌 (사용자가 V3를 보관용으로 꺼 둠 — 2026-10-29 V3 켜고 뽑았다가 V4 직접 만든 그래픽과 겹쳐 잼)
// 시점 = 시작 + min(길이−0.15, max(0.8, 길이×0.6)) — export가 요청보다 0.3~0.5초 앞 화면을 내므로 넉넉히 (memory premiere-export-frame-lag)
(function () {
    app.enableQE();
    var seq = app.project.activeSequence, q = qe.project.getActiveSequence();
    var L = [];
    for (var t = 2; t < seq.videoTracks.numTracks; t++) {
        var cs = seq.videoTracks[t].clips;
        for (var c = 0; c < cs.numItems; c++) {
            var k = cs[c], m = null; try { m = k.getMGTComponent(); } catch (e) {}
            if (!m || k.name.indexOf("2줄") >= 0) continue;
            if (typeof SKIP_MUTED != "undefined" && SKIP_MUTED && seq.videoTracks[t].isMuted()) continue;
            L.push([t, k]);
        }
    }
    var muted = [];
    for (var t = 0; t < seq.videoTracks.numTracks; t++) muted.push(seq.videoTracks[t].isMuted());
    var out = [], end = Math.min(L.length, FROM + COUNT);
    for (var i = FROM; i < end; i++) {
        var t = L[i][0], k = L[i][1], d = k.end.seconds - k.start.seconds;
        if (muted[t]) seq.videoTracks[t].setMute(0);
        var tm = new Time(); tm.seconds = k.start.seconds + Math.min(d - 0.15, Math.max(0.8, d * 0.6));
        var tc = tm.getFormatted(seq.getSettings().videoFrameRate, seq.getSettings().videoDisplayFormat);
        var nm = OUT + "/" + ("00" + i).slice(-3) + "_V" + (t + 1) + "_" + k.start.seconds.toFixed(2);
        var ok = q.exportFramePNG(tc, nm);
        if (muted[t]) seq.videoTracks[t].setMute(1);
        out.push(i + "|" + t + "|" + k.start.seconds.toFixed(3) + "|" + k.name + "|" + ok);
    }
    for (var t = 0; t < seq.videoTracks.numTracks; t++) if (seq.videoTracks[t].isMuted() != muted[t]) seq.videoTracks[t].setMute(muted[t] ? 1 : 0);
    NP_RESULT = "total " + L.length + "\n" + out.join("\n");
})();
