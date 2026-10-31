// 놀심 — 포인트 자막 선명하게 (사용자 2026-10-31: "포인트 자막이 흐리게 보인다고 해서, 테두리와 그림자 효과를 조금씩 더 강하게 다 수정")
// 사용: var SEQ_ID="<ID>"; var SHARP_RESULT=""; $.evalFile("<이 파일>"); return SHARP_RESULT;
// 템플릿에 테두리 칸이 없음 → 테두리 = 클립에 '그림자 효과'(검정·거리 0·부드러움 작게)를 새로 붙여 글자 둘레를 진하게. 그림자 = 템플릿 칸 값을 올림
// ⚠ 2026-10-31 버그: addVideoEffect 직후 cl.components가 갱신 안 돼 "마지막 그림자 효과"가 새 효과가 아님(B 빨간 빛이 덮어써짐), 불투명도는 0~255 단위 → 값 맞추기는 fix_edges.jsx로 다시 해야 함
// 그림자 효과 속성 순서: [0] 색 [1] 불투명도 [2] 방향 [3] 거리 [4] 부드러움 (2026-10-29 B 붓글씨에서 확인)
(function () {
    app.enableQE();
    var s = null; for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    app.project.activeSequence = s;
    var q = qe.project.getActiveSequence(), DS = qe.project.getVideoEffectByName("그림자 효과");
    // 종류별 값 — 템플릿 칸(이름: 값)과 테두리(그림자 효과: 불투명도, 부드러움). null이면 테두리 안 붙임
    var RULE = {
        "놀심_A_흰고딕": { mg: { "그림자 거리": 2, "그림자 부드러움": 14, "그림자 진하기(%)": 75 }, edge: [70, 5] },
        "놀심_B_붓글씨": { mg: { "그림자 부드러움": 40 }, edge: [55, 4], redSoft: 100 },
        "놀심_D_노란빛": { mg: { "번짐 크기": 36 }, edge: [50, 5] },
        "놀심_D2_노란빛2줄": { mg: { "번짐 크기": 36 }, edge: [50, 5] },
        "놀심_E_노랑박스": { mg: { "상자 투명도(%)": 82 }, edge: [45, 6] },   // 글자 칸 없음 → 상자를 덜 비치게 + 상자 둘레 어둡게
        "놀심_E2_연두박스": { mg: { "상자 투명도(%)": 82 }, edge: [45, 6] },
        "놀심_Q_카드": { mg: { "그림자 부드러움": 14, "그림자 진하기(%)": 55 }, edge: null },
        "놀심_H_PD사선": { mg: { "그림자 부드러움": 6, "그림자 진하기(%)": 65 }, edge: null }
    };
    // B 중 빨간 빛이 아닌 것(그림자 거리 1 = 흰고딕식)은 A 값으로
    var done = {}, edges = 0, skipped = [];
    function rule(cl) {
        var key = cl.name.split(" · ")[0], r = RULE[key];
        if (!r) return null;
        if (key == "놀심_B_붓글씨") {
            var mg = cl.getMGTComponent(), d = null;
            for (var p = 0; p < mg.properties.numItems; p++) if (mg.properties[p].displayName == "그림자 거리") d = mg.properties[p].getValue();
            if (d != 0) return RULE["놀심_A_흰고딕"];
        }
        return r;
    }
    for (var t = 0; t < s.videoTracks.numTracks; t++) {
        var cs = s.videoTracks[t].clips, qt = q.getVideoTrackAt(t), idx = -1;
        for (var j = 0; j < qt.numItems; j++) {
            var it = qt.getItemAt(j); if (it.type == "Empty") continue; idx++;
            var cl = cs[idx], r = rule(cl);
            if (!r) { if (cl.name.indexOf("놀심_") == 0 || cl.name == "그래픽") skipped.push(cl.name); continue; }
            var mg = cl.getMGTComponent();
            for (var p = 0; p < mg.properties.numItems; p++) { var pr = mg.properties[p]; if (r.mg[pr.displayName] !== undefined) pr.setValue(r.mg[pr.displayName], true); }
            if (r.redSoft) {   // 기존 빨간 그림자 효과(부드러움 120 → 100, 더 진하게)
                for (var z = 0; z < cl.components.numItems; z++) if (cl.components[z].displayName == "그림자 효과") cl.components[z].properties[4].setValue(r.redSoft, true);
            }
            if (r.edge) {
                it.addVideoEffect(DS);
                var co = null; for (var z = 0; z < cl.components.numItems; z++) if (cl.components[z].displayName == "그림자 효과") co = cl.components[z];   // 방금 붙인 것 = 마지막
                co.properties[0].setColorValue(255, 0, 0, 0, true); co.properties[1].setValue(r.edge[0], true); co.properties[3].setValue(0, true); co.properties[4].setValue(r.edge[1], true);
                edges++;
            }
            var k = cl.name.split(" · ")[0]; done[k] = (done[k] || 0) + 1;
        }
    }
    var L = []; for (var k in done) L.push(k + " " + done[k]);
    SHARP_RESULT = s.name + " | " + L.join(", ") + " | 테두리 붙임 " + edges + (skipped.length ? " | 건드리지 않음: " + skipped.join(", ") : "");
})();
