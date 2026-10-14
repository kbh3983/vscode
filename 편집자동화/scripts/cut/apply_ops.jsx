// 컷편집 에이전트 — ops.txt를 Premiere 시퀀스에 적용 (ExtendScript)
// 사용: execute_extendscript code =
//   var SEQ_ID="<시퀀스 ID>"; var OPS="<ops.txt 절대경로>"; $.evalFile("<이 파일 절대경로>"); return APPLY_RESULT;
// 순서: R razor → X 지우기 → D 비활성화 → M 마커 → (X가 있으면) 빈 구간 닫기 (트랙·마커 모두 같은 양만큼 당김)
// 29.97 드롭프레임 시퀀스 기준. 2026-10-06 옆구리살_가편_오디오2_컷2에서 동작 확인한 코드를 옮김
(function () {
    app.enableQE();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) {
        if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    }
    app.project.activeSequence = seq;
    var q = qe.project.getActiveSequence();
    var FPS = 30000 / 1001, TPF = 8475667200;
    function fr(t) { return Math.round(parseFloat(t.ticks) / TPF); }
    var f = new File(OPS); f.encoding = "UTF-8"; f.open("r"); var L = f.read().split("\n"); f.close();
    var R = [], X = [], D = [], M = [];
    for (var i = 0; i < L.length; i++) {
        var p = L[i].split("|");
        if (p[0] == "R") R.push(p[1]);
        else if (p[0] == "X") X.push([parseInt(p[1]), parseInt(p[2])]);
        else if (p[0] == "D") D.push([parseInt(p[1]), parseInt(p[2])]);
        else if (p[0] == "M") M.push(p);
    }
    for (var i = 0; i < R.length; i++) q.razor(R[i]);

    function inR(a, b, rs) {
        for (var k = 0; k < rs.length; k++) {
            if (a >= rs[k][0] && b <= rs[k][1]) return 1;
            if (a < rs[k][1] && b > rs[k][0]) return -1;
        }
        return 0;
    }
    var groups = [seq.videoTracks, seq.audioTracks], rem = [], dis = 0, bad = 0;
    for (var g = 0; g < 2; g++) for (var t = 0; t < groups[g].numTracks; t++) {
        var cs = groups[g][t].clips;
        for (var c = 0; c < cs.numItems; c++) {
            var a = fr(cs[c].start), b = fr(cs[c].end), x = inR(a, b, X), d = inR(a, b, D);
            if (x == 1) rem.push(cs[c]); else if (d == 1) { cs[c].disabled = true; dis++; }
            if (x == -1 || d == -1) bad++;
        }
    }
    for (var i = 0; i < rem.length; i++) rem[i].remove(false, true);

    for (var i = 0; i < M.length; i++) {
        var p = M[i], s = parseFloat(p[1]), du = parseFloat(p[2]);
        var m = seq.markers.createMarker(s); m.name = p[4]; m.comments = p.slice(5).join("|");
        if (du > 0) m.end = s + du;   // Time 객체를 넣으면 실패함
        m.setColorByIndex(parseInt(p[3]));
    }

    // 빈 구간 닫기: 지운 구간(X)을 기준으로, 각 클립·마커를 앞에서 닫힌 길이만큼 당긴다.
    // trackItem.move()는 상대 이동이고 연결된 클립을 따라 옮기지 않으므로 트랙마다 따로 옮긴다.
    X.sort(function (u, v) { return u[0] - v[0]; });
    function cum(fm) { var s = 0; for (var k = 0; k < X.length; k++) if (X[k][1] <= fm) s += X[k][1] - X[k][0]; return s; }
    var moved = 0;
    if (X.length) {
        for (var g = 0; g < 2; g++) for (var t = 0; t < groups[g].numTracks; t++) {
            var cs = groups[g][t].clips;
            for (var c = 0; c < cs.numItems; c++) {
                var off = cum(fr(cs[c].start));
                if (off > 0) { var tt = new Time(); tt.ticks = String(-off * TPF); cs[c].move(tt); moved++; }
            }
        }
        var mk = [], m = seq.markers.getFirstMarker();
        while (m) { mk.push(m); m = seq.markers.getNextMarker(m); }
        for (var i = 0; i < mk.length; i++) {
            var s = Math.round(mk[i].start.seconds * FPS), e = Math.round(mk[i].end.seconds * FPS), o = cum(s);
            if (o > 0) { mk[i].start = (s - o) / FPS; mk[i].end = (e - o) / FPS; }
        }
    }
    APPLY_RESULT = "razor " + R.length + ", removed " + rem.length + ", disabled " + dis + ", partial " + bad
        + ", markers " + M.length + ", moved " + moved;
})();
