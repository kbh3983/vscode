// 시퀀스 한 구간만 남긴 새 시퀀스 만들기 (편 나누기, 2026-10-29 261020_최박사)
// 사용: var SRC_ID="<원본 ID 앞부분>"; var NEW_NAME="..."; var BIN_NAME="<시퀀스 빈 안에 만들 하위 빈, 없으면 \"\">"; var A=<시작 프레임>; var B=<끝 프레임>;
//       $.evalFile(".../split_range.jsx"); return SPLIT_RESULT;
// 구간 경계는 클립 경계여야 함 (걸친 클립은 남기지 않고 결과에 bad로 셈). 남은 클립·마커를 A만큼 앞으로 당김. 원본은 그대로
var SPLIT_RESULT = "";
(function () {
    $.evalFile(File($.fileName).path + "/clone_seq.jsx");
    if (!CLONE) { SPLIT_RESULT = CLONE_RESULT; return; }
    var seq = CLONE, TPF = 8475667200, FPS = 30000 / 1001;
    function fr(t) { return Math.round(parseFloat(t.ticks) / TPF); }
    var groups = [seq.videoTracks, seq.audioTracks], rem = [], keep = [], bad = 0;
    for (var g = 0; g < 2; g++) for (var t = 0; t < groups[g].numTracks; t++) {
        var cs = groups[g][t].clips;
        for (var c = 0; c < cs.numItems; c++) {
            var a = fr(cs[c].start), b = fr(cs[c].end);
            if (a >= A && b <= B) keep.push(cs[c]); else { rem.push(cs[c]); if (a < B && b > A) bad++; }
        }
    }
    for (var i = 0; i < rem.length; i++) rem[i].remove(false, true);
    if (A > 0) for (var i = 0; i < keep.length; i++) { var tt = new Time(); tt.ticks = String(-A * TPF); keep[i].move(tt); }
    var mk = [], m = seq.markers.getFirstMarker();
    while (m) { mk.push(m); m = seq.markers.getNextMarker(m); }
    var nm = 0;
    for (var i = 0; i < mk.length; i++) {
        var s = Math.round(mk[i].start.seconds * FPS), e = Math.round(mk[i].end.seconds * FPS);
        if (s < A || s >= B) { seq.markers.deleteMarker(mk[i]); continue; }
        mk[i].start = (s - A) / FPS; mk[i].end = (Math.min(e, B) - A) / FPS; nm++;
    }
    var moved = "";
    if (BIN_NAME) {   // 시퀀스가 들어간 빈 안에 하위 빈을 만들어 옮김
        function binOf(target, it) {
            for (var k = 0; k < it.children.numItems; k++) {
                var c = it.children[k];
                if (c.nodeId == target.nodeId) return it;
                if (c.type == 2) { var x = binOf(target, c); if (x) return x; }
            }
            return null;
        }
        var item = seq.projectItem, parent = binOf(item, app.project.rootItem), sub = null;
        for (var k = 0; k < parent.children.numItems; k++) if (parent.children[k].type == 2 && parent.children[k].name == BIN_NAME) sub = parent.children[k];
        if (!sub) sub = parent.createBin(BIN_NAME);
        item.moveBin(sub); moved = " → 빈 " + BIN_NAME;
    }
    SPLIT_RESULT = seq.name + " " + seq.sequenceID + " | 남김 " + keep.length + " 지움 " + rem.length + " 걸침 " + bad + " 마커 " + nm + " 끝 " + (fr(seq.end)) + moved;
})();
