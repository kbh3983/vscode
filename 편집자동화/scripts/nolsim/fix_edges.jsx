// 놀심 — 포인트 자막 '그림자 효과' 값을 순서대로 다시 맞춤 (2026-10-31)
// 이유: QE addVideoEffect 직후 cl.components가 갱신 안 돼 '마지막 효과'가 새 효과가 아니었음 → 설정값이 기존 효과(B 빨간 빛)에 들어가고 새 효과는 기본값(거리 5·부드러움 0)으로 남음
// 불투명도 getValue/setValue는 0~255 (100% = 255)
// 사용: var SEQ_ID="<ID>"; var FIX_RESULT=""; $.evalFile("<이 파일>"); 시퀀스를 새로 찾아 읽은 뒤 클립별 그림자 효과를 앞에서부터: 검정 테두리 N개, B 붓글씨(빨간 빛 있던 것)는 마지막을 빨간 빛으로
(function () {
    var s = null; for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    function P(c, nm) { for (var k = 0; k < c.properties.numItems; k++) if (c.properties[k].displayName == nm) return c.properties[k]; }
    // 종류별 테두리 [부드러움, 불투명도(0~255)] — 앞서 넣은 값 그대로 (sharpen_points.jsx)
    var EDGE = { "놀심_A_흰고딕": [5, 70], "놀심_B_붓글씨": [4, 55], "놀심_D_노란빛": [5, 50], "놀심_D2_노란빛2줄": [5, 50], "놀심_E_노랑박스": [6, 45], "놀심_E2_연두박스": [6, 45] };
    if (typeof OPA_X != "undefined") for (var k in EDGE) EDGE[k][1] = Math.round(EDGE[k][1] * OPA_X);   // OPA_X=2.55 → 처음 의도한 %
    var n = 0, L = {};
    for (var t = 0; t < s.videoTracks.numTracks; t++) {
        var cs = s.videoTracks[t].clips;
        for (var j = 0; j < cs.numItems; j++) {
            var cl = cs[j], key = cl.name.split(" · ")[0], e = EDGE[key], ds = [];
            for (var z = 0; z < cl.components.numItems; z++) if (cl.components[z].displayName == "그림자 효과") ds.push(cl.components[z]);
            if (!e || !ds.length) continue;
            var red = (key == "놀심_B_붓글씨" && ds.length == RED_IF);   // 빨간 빛 있던 B = 효과 수로 구분
            if (key == "놀심_B_붓글씨" && !red) e = EDGE["놀심_A_흰고딕"];   // 흰고딕식 B 하나
            for (var d = 0; d < ds.length; d++) {
                var c = ds[d];
                if (red && d == ds.length - 1) { P(c, "그림자 색상").setColorValue(255, 210, 0, 0, true); P(c, "불투명도").setValue(255, true); P(c, "거리").setValue(0, true); P(c, "부드러움").setValue(100, true); }
                else { P(c, "그림자 색상").setColorValue(255, 0, 0, 0, true); P(c, "불투명도").setValue(e[1], true); P(c, "거리").setValue(0, true); P(c, "부드러움").setValue(e[0], true); }
            }
            L[key + (red ? "(빨간 빛)" : "")] = (red ? ds.length - 1 : ds.length) + "겹"; n++;
        }
    }
    var o = []; for (var k in L) o.push(k + " " + L[k]);
    FIX_RESULT = s.name + " | " + n + " | " + o.join(" / ");
})();
