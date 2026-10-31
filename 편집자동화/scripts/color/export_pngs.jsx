// 색보정 에이전트 — 프레임 방식 측정용 PNG 내보내기 (QE exportFramePNG, 빠름) → DIR/f<프레임>.png (batch.py frame_at 형식)
// 사용: var SID="<시퀀스 ID>"; var FR=[프레임...]; var DIR="<폴더/>"; var FROM=0; var N=40; $.evalFile("<이 파일>"); return PNG_RESULT;
// 2026-10-30: In/Out 1프레임 내보내기(export_frames.jsx)는 4K에서 느리고 시간 초과 위험 → QE로 (놀심에서 +0.012초 보정이 정확함을 확인)
var PNG_RESULT = "";
(function () {
    var s = null; for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SID) s = app.project.sequences[i];
    app.project.activeSequence = s; app.enableQE();
    var q = qe.project.getActiveSequence(), st = s.getSettings(), n = 0, FPS = 30000 / 1001;
    new Folder(DIR).create();
    for (var i = FROM; i < FR.length && i < FROM + N; i++) {
        var t = new Time(); t.seconds = FR[i] / FPS + 0.012;
        q.exportFramePNG(t.getFormatted(st.videoFrameRate, st.videoDisplayFormat), DIR + "f" + FR[i]); n++;
    }
    PNG_RESULT = "OK " + n + " next " + (FROM + n) + "/" + FR.length;
})();
