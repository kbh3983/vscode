// 숏폼 에이전트 — 목록의 (시퀀스, 시각) 프레임을 PNG로 (이미 있는 파일은 건너뜀 → 시간 초과 뒤 다시 부르면 이어서)
// 사용: (function(){ JOBS="<json: [{seq, t, out}]>"; MAXN=15; $.evalFile("<이 파일>"); return EF_RESULT; })()
(function () {
    app.enableQE();
    var f = new File(JOBS); f.encoding = "UTF-8"; f.open("r"); var J = JSON.parse(f.read()); f.close();
    var P = app.project, done = 0, left = 0, cur = null, err = [];
    function seqByName(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    for (var k = 0; k < J.length; k++) {
        var j = J[k];
        if (new File(j.out + ".png").exists || new File(j.out).exists) continue;
        if (done >= MAXN) { left++; continue; }
        try {
            if (!cur || cur.name != j.seq) { cur = seqByName(j.seq); P.openSequence(cur.sequenceID); P.activeSequence = cur; }   // 열려 있지 않은 시퀀스는 activeSequence 지정이 오류
            var t = new Time(); t.seconds = j.t;
            qe.project.getActiveSequence().exportFramePNG(t.getFormatted(cur.getSettings().videoFrameRate, cur.getSettings().videoDisplayFormat), j.out.replace(/\//g, "\\"));   // QE는 역슬래시 경로만
        } catch (e) { err.push(k + ":" + e.message); cur = null; }
        done++;
    }
    EF_RESULT = "보냄 " + done + " 남음 " + left + (err.length ? " 오류 " + err.join("; ") : "");
})();
