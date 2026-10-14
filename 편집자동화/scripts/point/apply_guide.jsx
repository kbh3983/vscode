// 포인트 에이전트 — fit_guide.py plan 결과(비율·위치)를 클립 모션에 넣기
// 사용: var SEQ_ID="<ID>"; var PLAN="<plan.json>"; var GUIDE_RESULT=""; $.evalFile("<이 파일>"); return GUIDE_RESULT;
(function () {
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var P = JSON.parse(f.read()); f.close();
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    var ok = 0, miss = [];
    for (var j = 0; j < P.length; j++) {
        var p = P[j], cs = s.videoTracks[p.v].clips, g = null;
        for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - p.s) < 0.02) g = cs[c];
        if (!g) { miss.push(p.i); continue; }
        for (var z = 0; z < g.components.numItems; z++) if (g.components[z].matchName == "AE.ADBE Motion") {
            var mp = g.components[z].properties;
            for (var y = 0; y < mp.numItems; y++) { if (mp[y].displayName == "비율 조정") mp[y].setValue(p.sc, true); if (mp[y].displayName == "위치") mp[y].setValue(p.pos, true); }
        }
        ok++;
    }
    GUIDE_RESULT = "set " + ok + (miss.length ? " missing " + miss.join(",") : "");
})();
