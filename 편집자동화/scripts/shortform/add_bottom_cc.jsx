// 숏폼 에이전트 — 숏폼에 ① 안내 박스 구간까지 포함한 대사 자막 트랙(새 자막 트랙) ② 하단 검정 영역 고정 안내(새 비디오 트랙) 추가 (2026-10-14)
// 사용자: "안내자막 들어간 곳도 캡션 자막 추가 (최대 15자 동일한 규칙)" — 기존 자막 트랙과 비교해 하나만 쓸 것, 겹쳐도 됨
//         "하단에 2가지 안내자막 고정해서 추가 (기존 것은 그대로 두고, 새로운 트랙에 추가)" — 예시처럼 단톡방 → 플레오라, png, 마지막 6초(라이브 안내)는 뺌
// 사용: (function(){ SEQ_NAME="<숏폼>_샷"; SRT="<srt>"; SW=<바뀌는 초>; END=<끝 초>; PNG_DIR="<템플릿_v2 폴더>"; AB_RESULT=""; $.evalFile("<이 파일>"); return AB_RESULT; })()
// 기존 클립·트랙은 건드리지 않는다. 하단 안내는 V7부터 위로 처음 비어 있는 비디오 트랙에 (없으면 하나 추가)
(function () {
    var P = app.project, s = null, log = [];
    for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == SEQ_NAME) s = P.sequences[i];
    if (!s) { AB_RESULT = "없음 " + SEQ_NAME; return; }
    function findBin(root, name) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == name) return c; var r = findBin(c, name); if (r) return r; } } return null; }
    function inBin(bin, name) { for (var i = 0; i < bin.children.numItems; i++) if (bin.children[i].name == name) return bin.children[i]; return null; }
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    var par = findBin(P.rootItem, "숏폼_첫작업") || P.rootItem;
    // ① 자막 트랙
    var cb = findBin(par, "자막_srt_15자_전체") || par.createBin("자막_srt_15자_전체");
    var fn = new File(SRT).displayName, it = inBin(cb, fn);
    if (!it) { P.importFiles([new File(SRT).fsName], true, cb, false); it = inBin(cb, fn); }
    log.push(it ? "자막 트랙 " + s.createCaptionTrack(it, 0) : "srt 못 가져옴");
    // ② 하단 안내
    var bb = findBin(par, "하단안내") || par.createBin("하단안내");
    var names = ["15_하단_단톡방.png", "16_하단_플레오라.png"], items = [];
    for (var k = 0; k < 2; k++) { var x = inBin(bb, names[k]); if (!x) { P.importFiles([new File(PNG_DIR + "/" + names[k]).fsName], true, bb, false); x = inBin(bb, names[k]); } items.push(x); }
    var tr = -1;
    for (var v = 6; v < s.videoTracks.numTracks; v++) if (s.videoTracks[v].clips.numItems == 0) { tr = v; break; }
    if (tr < 0) { app.enableQE(); P.openSequence(s.sequenceID); P.activeSequence = s; qe.project.getActiveSequence().addTracks(1, s.videoTracks.numTracks, 0); tr = s.videoTracks.numTracks - 1; log.push("트랙 추가"); }
    var V = s.videoTracks[tr], span = [[0, SW], [SW, END]];
    for (var k = 0; k < 2; k++) {
        V.overwriteClip(items[k], span[k][0]);
        var cs = V.clips, ok = false;
        for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - span[k][0]) < 0.05) { cs[c].end = T(span[k][1]); ok = true; }
        if (!ok) log.push("배치 실패 " + names[k]);
    }
    if (V.clips.numItems == 2) { var g = (Number(V.clips[1].start.ticks) - Number(V.clips[0].end.ticks)) / 254016000000; if (g > 0 && g < 0.1) { var e2 = new Time(); e2.ticks = V.clips[1].start.ticks; V.clips[0].end = e2; } }   // 프레임 반올림 1프레임 틈
    try { V.setName("하단 안내"); } catch (e) {}
    P.save();
    var r = []; for (var c = 0; c < V.clips.numItems; c++) r.push(V.clips[c].name + " " + V.clips[c].start.seconds.toFixed(2) + "-" + V.clips[c].end.seconds.toFixed(2));
    AB_RESULT = SEQ_NAME + " | " + log.join("; ") + " | V" + (tr + 1) + ": " + r.join(", ");
})();
