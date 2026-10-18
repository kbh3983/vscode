// 활성 시퀀스에서 여러 시각의 프레임을 PNG로 뽑는다 (확인용)
// 사용: (function(){ TIMES=[1.0,4.4]; OUT="C:\\...\\폴더\\"; AS_RESULT=""; $.evalFile("<이 파일>"); return AS_RESULT; })()
// 파일 이름 = OUT + "f" + 시각×10 (예: f0044.png). exportFramePNG가 .png를 붙임
// 함정: 가끔 엉뚱한 시각(약 1~2초)의 프레임이 나옴 → 이상하면 그 시각을 조금 옮겨 다시 (2026-10-17)
(function () {
    app.enableQE();
    var s = app.project.activeSequence, q = qe.project.getActiveSequence(), st = s.getSettings(), n = 0;
    for (var i = 0; i < TIMES.length; i++) {
        var t = new Time(); t.seconds = TIMES[i];
        var nm = ("0000" + Math.round(TIMES[i] * 10)).slice(-4);
        if (q.exportFramePNG(t.getFormatted(st.videoFrameRate, st.videoDisplayFormat), OUT + "f" + nm)) n++;
    }
    AS_RESULT = s.name + " 프레임 " + n + "/" + TIMES.length;
})();
