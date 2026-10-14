// 색보정 에이전트 — Lumetri 색상 값 넣기
// 사용: var SEQ_ID="..."; var TRACK=1; var CLIPS=[0]; var VALS={14:-16,15:0}; $.evalFile(".../set_lumetri.jsx"); return LUM_RESULT;
//   TRACK: 비디오 트랙 0부터, CLIPS: 트랙 안 클립 순번 배열(빈 배열이면 전부), VALS: {속성번호: 값}
//   Lumetri가 없으면 QE로 추가. 속성 번호: 14 온도, 15 색조, 16 채도, 19 노출, 20 대비, 21 밝은 영역, 22 어두운 영역, 23 흰색, 24 검정
(function () {
    app.enableQE();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    var q = qe.project.getActiveSequence(), qt = q.getVideoTrackAt(TRACK), eff = qe.project.getVideoEffectByName("Lumetri 색상");
    var cs = seq.videoTracks[TRACK].clips, idx = CLIPS.length ? CLIPS : [];
    if (!CLIPS.length) for (var c = 0; c < cs.numItems; c++) idx.push(c);
    function lum(cl) { for (var k = 0; k < cl.components.numItems; k++) if (cl.components[k].displayName == "Lumetri 색상") return cl.components[k]; return null; }
    var added = 0, n = 0;
    for (var i = 0; i < idx.length; i++) {
        var cl = cs[idx[i]];
        if (!lum(cl)) {   // QE 항목 순서 = 빈 칸 제외 DOM 순서
            var cnt = -1;
            for (var j = 0; j < qt.numItems; j++) { var it = qt.getItemAt(j); if (it.type == "Empty") continue; cnt++; if (cnt == idx[i]) { it.addVideoEffect(eff); added++; break; } }
        }
        var co = lum(cl);
        for (var p in VALS) co.properties[parseInt(p)].setValue(VALS[p], true);
        n++;
    }
    LUM_RESULT = "set " + n + " clips (added Lumetri " + added + ")";
})();
