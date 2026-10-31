// 포인트 에이전트 — 포인트 자막 끝에 크로스 디졸브 넣기 (이미 끝 디졸브가 있는 클립은 그대로, 자막 끝에서 컷전환·샷사이즈가 바뀌면 넣지 않음) (2026-10-26 criteria "끝 디졸브")
// 사용: var SEQ_ID="<ID>"; var FIRST=<첫 포인트 트랙 index>; [var LAST=<마지막 포인트 트랙 index>;] var FRAMES=10; var DISSOLVE_RESULT=""; $.evalFile("<이 파일>"); return DISSOLVE_RESULT;
//   LAST: 위쪽 트랙에 프로필·테두리·소제목 같은 사용자 그래픽이 있으면 포인트 트랙까지만 (2026-10-26 노년 — V5 프로필, V6 테두리·소제목)
// QE addTransition(tr, false, "<프레임>", "0", 0.5, true, true) — 두 번째 인자 false가 클립 끝 (true는 시작에 붙음, 2026-10-26 누워서 시험)
// 트랜지션 이름은 한국어 프리미어 "크로스 디졸브", 없으면 "Cross Dissolve"
(function () {
    app.enableQE();
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    app.project.openSequence(s.sequenceID); app.project.activeSequence = s;
    var q = qe.project.getActiveSequence(), tr = null;
    try { tr = qe.project.getVideoTransitionByName("크로스 디졸브"); } catch (e) {}
    if (!tr) { try { tr = qe.project.getVideoTransitionByName("Cross Dissolve"); } catch (e) {} }
    if (!tr) { DISSOLVE_RESULT = "트랜지션 없음"; return; }
    // 자막 끝에서 보이는 화면(포인트 트랙 아래 맨 위 켜진 클립의 원본·비율·위치)이 바뀌면(컷전환·샷사이즈 변경) 디졸브를 넣지 않음
    // (2026-10-26 사용자: "포인트 자막에 디졸브가 안 들어가는 경우는 컷전환이 될때, 샷사이즈가 바뀔 때야")
    function shot(t) {
        for (var vv = FIRST - 1; vv >= 0; vv--) {
            var cc = s.videoTracks[vv].clips;
            for (var i2 = 0; i2 < cc.numItems; i2++) {
                var x2 = cc[i2]; if (x2.disabled || x2.start.seconds > t || x2.end.seconds <= t) continue;
                var mo = "";
                for (var z = 0; z < x2.components.numItems; z++) if (x2.components[z].matchName == "AE.ADBE Motion") { var mp = x2.components[z].properties; mo = String(mp[0].getValue()) + "|" + String(mp[1].getValue()); }
                return x2.projectItem.nodeId + "|" + mo;
            }
        }
        return "";
    }
    var added = [], skip = 0, shotSkip = [], fail = [];
    var last = (typeof LAST == "number") ? LAST : s.videoTracks.numTracks - 1;
    for (var v = FIRST; v <= last; v++) {
        var cs = s.videoTracks[v].clips, T = s.videoTracks[v].transitions, targets = [];
        for (var c = 0; c < cs.numItems; c++) {
            var k = cs[c], has = false;
            for (var t = 0; t < T.numItems; t++) if (T[t].end.seconds > k.end.seconds - 0.02 && T[t].start.seconds < k.end.seconds - 0.01 && T[t].start.seconds > k.start.seconds - 0.01) has = true;
            if (has) { skip++; continue; }
            if (shot(k.end.seconds - 0.05) != shot(k.end.seconds + 0.05)) { shotSkip.push("V" + (v + 1) + " " + k.start.seconds.toFixed(2)); continue; }
            targets.push(k.start.seconds);
        }
        var qt = q.getVideoTrackAt(v);
        for (var n = 0; n < targets.length; n++) {
            var it = null;
            for (var j = 0; j < qt.numItems; j++) { var x = qt.getItemAt(j); if (x.type == "Empty") continue; if (Math.abs(x.start.secs - targets[n]) < 0.02) it = x; }
            if (!it) { fail.push("V" + (v + 1) + " " + targets[n].toFixed(2)); continue; }
            it.addTransition(tr, false, String(FRAMES), "0", 0.5, true, true);
            added.push("V" + (v + 1) + " " + targets[n].toFixed(2));
        }
    }
    DISSOLVE_RESULT = JSON.stringify({ added: added.length, skipped: skip, shot_change: shotSkip, fail: fail });
})();
