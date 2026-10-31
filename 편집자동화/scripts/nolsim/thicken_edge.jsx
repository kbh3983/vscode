// 놀심 — sharpen_points.jsx로 붙인 테두리(검정·거리 0 그림자 효과)를 굵게 (사용자 2026-10-31: "테두리를 지금의 2배로 굵게")
// 사용: var SEQ_ID="<ID>"; var ORIG=true(앞서 3배로 올린 값을 되돌린 뒤 겹칠 때); var THICK_RESULT=""; $.evalFile("<이 파일>"); return THICK_RESULT;
// 부드러움만 올리면 옅게 퍼질 뿐 진한 폭은 그대로(2px→2px, 측정). 같은 테두리 효과를 한 번 더 겹치면 테두리 바깥에 한 겹 더 → 진한 폭 2px→5px
// 클립에 테두리가 이미 2개면 건너뜀
(function () {
    app.enableQE();
    var s = null; for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    app.project.activeSequence = s;
    var q = qe.project.getActiveSequence(), DS = qe.project.getVideoEffectByName("그림자 효과"), n = 0, L = {};
    function P(c, nm) { for (var k = 0; k < c.properties.numItems; k++) if (c.properties[k].displayName == nm) return c.properties[k]; }
    function isEdge(c) { if (c.displayName != "그림자 효과" || P(c, "거리").getValue() != 0) return false; var v = P(c, "그림자 색상").getColorValue(); return v[1] == 0 && v[2] == 0 && v[3] == 0; }
    function setEdge(c, so, op) { P(c, "그림자 색상").setColorValue(255, 0, 0, 0, true); P(c, "불투명도").setValue(op, true); P(c, "거리").setValue(0, true); P(c, "부드러움").setValue(so, true); }
    for (var t = 0; t < s.videoTracks.numTracks; t++) {
        var cs = s.videoTracks[t].clips, qt = q.getVideoTrackAt(t), idx = -1;
        for (var j = 0; j < qt.numItems; j++) {
            var it = qt.getItemAt(j); if (it.type == "Empty") continue; idx++;
            var cl = cs[idx], ed = [];
            for (var z = 0; z < cl.components.numItems; z++) if (isEdge(cl.components[z])) ed.push(cl.components[z]);
            if (ed.length != 1) continue;
            var so = P(ed[0], "부드러움").getValue(), op = P(ed[0], "불투명도").getValue();
            if (ORIG) { so = so / 3; op = op - 30; setEdge(ed[0], so, op); }   // 앞서 3배·+30 올린 값 되돌림
            it.addVideoEffect(DS);
            var c2 = cl.components[cl.components.numItems - 1];
            setEdge(c2, so, op);
            L[cl.name.split(" · ")[0]] = "부드러움 " + so + " · 불투명도 " + op + " × 2겹"; n++;
        }
    }
    var o = []; for (var k in L) o.push(k + " (" + L[k] + ")");
    THICK_RESULT = s.name + " | 겹친 클립 " + n + " | " + o.join(" / ");
})();
