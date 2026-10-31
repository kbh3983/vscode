// 시퀀스 복제 — 원본 시퀀스가 들어 있는 빈에 새 이름으로 넣는다 (모든 에이전트 공용)
// 사용: var SRC_ID="cafbc272"; var NEW_NAME="근감소증 학회_컷편집"; $.evalFile(".../clone_seq.jsx"); → CLONE (새 시퀀스), CLONE_RESULT (확인 문자열)
// 빈을 rootItem.children[번호]로 찾지 않는다: 최상위 빈은 가나다순이라 영상마다 번호가 다름 (2026-10-27 근감소증 `_컷편집_rough`가 터틀볼 빈으로 들어감, docs/failures.md)
var CLONE = null, CLONE_RESULT = "";
(function () {
    function binOf(target, it) {   // target 프로젝트 항목을 가진 빈 (nodeId로 비교)
        for (var k = 0; k < it.children.numItems; k++) {
            var c = it.children[k];
            if (c.nodeId == target.nodeId) return it;
            if (c.type == 2) { var x = binOf(target, c); if (x) return x; }
        }
        return null;
    }
    var src = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID.indexOf(SRC_ID) == 0) src = app.project.sequences[i];
    if (!src) { CLONE_RESULT = "원본 없음 " + SRC_ID; return; }
    var bin = binOf(src.projectItem, app.project.rootItem);
    if (!bin) { CLONE_RESULT = "원본 빈을 못 찾음 — 복제 안 함"; return; }
    var before = {};
    for (var i = 0; i < app.project.sequences.numSequences; i++) before[app.project.sequences[i].sequenceID] = 1;
    src.clone();
    for (var i = 0; i < app.project.sequences.numSequences; i++) { var q = app.project.sequences[i]; if (!before[q.sequenceID]) CLONE = q; }
    CLONE.name = NEW_NAME; CLONE.projectItem.name = NEW_NAME;
    CLONE.projectItem.moveBin(bin);
    // 넣은 뒤 확인: 새 시퀀스가 원본과 같은 빈에 있는지
    var got = binOf(CLONE.projectItem, app.project.rootItem);
    var parent = binOf(bin, app.project.rootItem);
    CLONE_RESULT = NEW_NAME + " → " + (parent && parent.nodeId != app.project.rootItem.nodeId ? parent.name + "/" : "") + bin.name + (got && got.nodeId == bin.nodeId ? " (확인)" : " !! 빈 확인 실패");
})();
