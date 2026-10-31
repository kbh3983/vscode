// 구간 [A, B) 프레임을 모든 트랙에서 추출(리플 삭제, 캡션 트랙 포함) — QE extract (2026-10-29 놀심 구성수정2)
// 사용: var SEQ_ID="<ID>"; var RANGES=[[A프레임,B프레임], ...]; var EXR=""; $.evalFile("<이 파일>"); EXR
// - 뒤 구간부터 처리. 시퀀스 in/out은 1ms 단위로 반올림돼 in이 프레임 경계보다 조금 앞에 놓임
//   → 비디오는 A-1 프레임까지 같이 지워져 1프레임 빈칸이 생김(2026-10-29 확인). out=B로 넣으면 B-1까지 지워짐(③에서 확인)
// - 그래서 추출 전에 A에서 끝나던 클립을 기억했다가, 추출 뒤 끝·outPoint를 A로 되돌린다
// - 모든 트랙을 대상(target)으로 켬 (꺼진 트랙은 추출 안 됨)
// ⚠ 2026-10-29 실제 결과 (놀심 구성수정2):
//   · 캡션 트랙도 같이 당겨짐 (ExtendScript로 못 옮기는 기본 자막을 옮길 유일한 방법)
//   · 5구간 중 2구간은 1프레임 덜 지워짐(경계에 빈 프레임) → 반드시 프레임 지도 대조(work/261027_놀심_최종비교/framecmp*.py)
//   · 경계에 길이 0에 가까운 클립·캡션 조각이 남음 → 오디오 조각은 지우고, 캡션 조각은 사용자가 텍스트 패널에서 지움(빈 자리에서는 1프레임 보임)
//   · 1프레임 구간은 리플 없이 '들어내기'처럼 될 때가 있음 → 1프레임 추출 금지, 자를 구간 끝을 처음부터 자막 경계에 맞출 것
//   · 지운 구간 안(경계 직전 포함)의 마커는 지워짐 → 다시 만들 것
(function () {
    var FR = 8475667200, s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    app.project.activeSequence = s; app.enableQE(); var q = qe.project.getActiveSequence();
    var T = [];
    for (var v = 0; v < s.videoTracks.numTracks; v++) { s.videoTracks[v].setTargeted(true, true); T.push(["V" + (v + 1), s.videoTracks[v], 1]); }
    for (var a = 0; a < s.audioTracks.numTracks; a++) { s.audioTracks[a].setTargeted(true, true); T.push(["A" + (a + 1), s.audioTracks[a], 0]); }
    function fr(t) { return Number(t.ticks) / FR; }
    var R = RANGES.slice().sort(function (x, y) { return y[0] - x[0]; }), log = [];
    for (var r = 0; r < R.length; r++) {
        var A = R[r][0], B = R[r][1], keep = [];
        for (var t = 0; t < T.length; t++) { var cs = T[t][1].clips;
            for (var c = 0; c < cs.numItems; c++) if (Math.abs(fr(cs[c].end) - A) < 0.01) keep.push([t, fr(cs[c].start), fr(cs[c].inPoint)]); }
        var e0 = Number(s.end), ti = new Time(), to = new Time();
        ti.ticks = String(A * FR); to.ticks = String(B * FR);
        s.setInPoint(ti); s.setOutPoint(to); q.extract();
        var fixed = 0;
        for (var k = 0; k < keep.length; k++) { var cs = T[keep[k][0]][1].clips;
            for (var c = 0; c < cs.numItems; c++) if (Math.abs(fr(cs[c].start) - keep[k][1]) < 0.01) {
                if (Math.abs(fr(cs[c].end) - A) > 0.0001) {
                    var te = new Time(); te.ticks = String(A * FR); cs[c].end = te;
                    if (T[keep[k][0]][2]) { var tp = new Time(); tp.ticks = String(Math.round((keep[k][2] + A - keep[k][1]) * FR)); cs[c].outPoint = tp; }
                    fixed++;
                } } }
        log.push(A + "-" + B + " 지움 " + Math.round((e0 - Number(s.end)) / FR) + "f 맞춤 " + fixed + "/" + keep.length);
    }
    s.setInPoint(0); s.setOutPoint(s.end);
    EXR = log.join(" | ");
})();
