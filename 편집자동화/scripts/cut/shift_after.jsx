// 넣을 지점 뒤의 모든 클립을 뒤로 밀기 (끼워 넣기 준비, 2026-10-14 강연 풀영상_교육추가)
// 사용: var SEQ_ID="<ID>"; var PLAN="<plan_insert.json: [{p:초, L:초}, ...]>"; var PROG="<progress.json>"; var LIMIT=600; var SHIFT_RESULT=""; $.evalFile("<이 파일>"); SHIFT_RESULT;
// - 클립마다 밀 양 = 시작 시간이 p 이상인 지점들의 L 합 (지점에 걸친 클립은 미리 razor로 잘라 둘 것)
// - 트랙마다 뒤에서부터 민다 (앞 클립과 겹치지 않게). trackItem.move()는 상대 이동
// - LIMIT개씩, 진행 상태(트랙별 처리한 개수)를 PROG에 저장 → 다시 실행하면 이어서
(function () {
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    function rd(p) { var f = new File(p); if (!f.exists) return null; f.encoding = "UTF-8"; f.open("r"); var t = f.read(); f.close(); return JSON.parse(t); }
    var P = rd(PLAN), G = rd(PROG) || {};
    var tr = [];
    for (var v = 0; v < s.videoTracks.numTracks; v++) tr.push(["V" + (v + 1), s.videoTracks[v]]);
    for (var a = 0; a < s.audioTracks.numTracks; a++) tr.push(["A" + (a + 1), s.audioTracks[a]]);
    var moved = 0, t0 = new Date().getTime();
    for (var t = 0; t < tr.length && moved < LIMIT; t++) {
        var key = tr[t][0], cs = tr[t][1].clips, done = G[key] || 0;
        for (var c = cs.numItems - 1 - done; c >= 0 && moved < LIMIT; c--) {
            var k = cs[c], st = k.start.seconds, off = 0;
            for (var j = 0; j < P.length; j++) if (st >= P[j].p - 0.02) off += P[j].L;
            if (off > 0) { var tm = new Time(); tm.seconds = off; k.move(tm); moved++; }
            G[key] = (G[key] || 0) + 1;
        }
    }
    var f = new File(PROG); f.encoding = "UTF-8"; f.open("w"); f.write(JSON.stringify(G)); f.close();
    var left = 0;
    for (var t2 = 0; t2 < tr.length; t2++) left += tr[t2][1].clips.numItems - (G[tr[t2][0]] || 0);
    SHIFT_RESULT = "moved " + moved + " in " + ((new Date().getTime() - t0) / 1000) + "s, left " + left;
})();
