// 컷전환 에이전트 — a_zoom.py plan.json을 시퀀스 V1에 적용 (V1만 razor → 클립마다 비율·위치, 확대 조각 마커) (2026-10-29)
// 사용: var SEQ_ID="<ID>"; var PLAN="<plan.json>"; $.evalFile("<이 파일>"); return ZOOM_RESULT;
var ZOOM_RESULT = "";
(function () {
    app.enableQE();
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var P = JSON.parse(f.read()); f.close();
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    app.project.activeSequence = s;
    var qt = qe.project.getActiveSequence().getVideoTrackAt(0);
    for (var i = 0; i < P.razor_tc.length; i++) qt.razor(P.razor_tc[i]);
    var TPF = 8475667200, FPS = 30000 / 1001, cs = s.videoTracks[0].clips, ok = 0, miss = [];
    function fr(t) { return Math.round(parseFloat(t.ticks) / TPF); }
    for (var j = 0; j < P.plan.length; j++) {
        var p = P.plan[j], g = null;
        for (var c = 0; c < cs.numItems; c++) if (fr(cs[c].start) == p.a && fr(cs[c].end) == p.b) g = cs[c];
        if (!g) { miss.push(p.a); continue; }
        for (var z = 0; z < g.components.numItems; z++) if (g.components[z].matchName == "AE.ADBE Motion") {
            var mp = g.components[z].properties;
            for (var y = 0; y < mp.numItems; y++) { if (mp[y].displayName == "비율 조정") mp[y].setValue(p.sc, true); if (mp[y].displayName == "위치") mp[y].setValue(p.pos, true); }
        }
        ok++;
        if (p.sc != 100 && (j == 0 || P.plan[j - 1].sc == 100)) {
            var e = p.b; for (var k = j + 1; k < P.plan.length && P.plan[k].sc != 100 && P.plan[k].a == e; k++) e = P.plan[k].b;
            var m = s.markers.createMarker(p.a / FPS); m.end = e / FPS; m.name = "확대 " + p.sc + "%"; m.comments = "A캠 확대 (B캠 대신, 점프컷 가리기·번갈아) " + p.kind; m.setColorByIndex(7);
        }
    }
    ZOOM_RESULT = s.name + " clips " + cs.numItems + " set " + ok + (miss.length ? " missing " + miss.join(",") : "");
})();
