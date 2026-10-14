// 포인트 에이전트 — 비교 시퀀스에 템플릿을 놓고 프레임 내보내기 (playbook_AE변환.md 2)
// 사용: var SEQ_ID="<비교 시퀀스>"; var TRACK=<0 원본 / 1 새 것>; var MOGRT="<경로>"; var TEXT="<문구 또는 빈칸>"; var LEN=<초>;
//       var N=<프레임 수>; var OUT="<폴더\\접두>"; var PC_RESULT=""; $.evalFile("<이 파일>"); return PC_RESULT;
// 12:25(745.0109초, 자막 없는 곳)에 놓는다. TEXT가 있으면 AE 템플릿 문구·페이퍼로지 7Bold 넣기
(function () {
    var S = 745.0109;
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    var tpf = Number(seq.timebase), t = new Time();
    t.ticks = String(Math.round(S * 254016000000 / tpf) * tpf);
    // 이 위치(745초 근처)에 있는 클립만 지운다 — 트랙 전체를 비우면 사용자 확인용 배치가 지워짐 (2026-10-11 사고)
    var cs = seq.videoTracks[TRACK].clips;
    for (var c = cs.numItems - 1; c >= 0; c--) if (cs[c].start.seconds < S + 5 && cs[c].end.seconds > S - 0.1) cs[c].remove(false, false);
    seq.importMGT(MOGRT, t.ticks, TRACK, seq.audioTracks.numTracks - 1);
    var B = null, cl = seq.videoTracks[TRACK].clips;
    for (var c2 = 0; c2 < cl.numItems; c2++) if (Math.abs(cl[c2].start.seconds - t.seconds) < 0.02) B = cl[c2];
    if (!B) { PC_RESULT = "import 실패"; return; }
    var e = new Time(); e.seconds = t.seconds + LEN; B.end = e;
    var m = B.getMGTComponent();
    if (m && TEXT) for (var p = 0; p < m.properties.numItems; p++) {
        var pr = m.properties[p], s = String(pr.getValue());
        if (s.indexOf("textEditValue") >= 0) { var j = JSON.parse(s); j.textEditValue = TEXT; j.fontEditValue = ["Paperlogy-7Bold"]; pr.setValue(JSON.stringify(j), true); }
    }
    SOLO = TRACK; START = t.seconds; EF_RESULT = "";  // $.evalFile은 전역에서 돌아서 전역 변수로 넘긴다
    $.evalFile("C:\\DADA\\9.AI\\vscode\\편집자동화\\scripts\\point\\ae\\export_frames.jsx");
    PC_RESULT = B.name + " " + B.start.seconds.toFixed(4) + "-" + B.end.seconds.toFixed(4) + " " + EF_RESULT;
})();
