// 숏폼 에이전트 — 새 숏폼 1개를 한 번에: 새 시퀀스(프레임 png, 자막 트랙 없음) → V1 조각(rebuild_v1.jsx) → 요소 V3~ 이어서 (2026-10-16)
// 사용: (function(){ SEQ_NAME="<숏폼>_중첩"; SRC_NAME="<롱폼>_숏폼소스_샷"; PARTS="<parts.json>"; ELEMS="<elems.json: [{v:3, file:'00_프레임.png', s, e}]>"; NS_RESULT=""; $.evalFile("<이 파일>"); return NS_RESULT; })()
// 그다음 unnest.jsx(init→video→audio→verify)로 V1·A1을 원본 클립으로 풀고, 자막은 숏폼 오디오를 받아써서 만든다 (playbook 1장)
(function () {
    var P = app.project, log = [];
    function seqByName(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function fb(root, n) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == n) return c; var r = fb(c, n); if (r) return r; } } return null; }
    function fi(root, n) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { var r = fi(c, n); if (r) return r; } else if (c.name == n) { var p = ""; try { p = c.getMediaPath(); } catch (e) {} if (p.indexOf("템플릿_v2") >= 0) return c; } } return null; }
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    function rd(p) { var f = new File(p); f.encoding = "UTF-8"; f.open("r"); var s = f.read(); f.close(); return JSON.parse(s); }
    if (seqByName(SEQ_NAME)) { NS_RESULT = "이미 있음 " + SEQ_NAME; return; }
    var E = rd(ELEMS), bin = fb(P.rootItem, "숏폼") || P.rootItem;
    var frame = fi(P.rootItem, "00_프레임.png");
    if (!frame) { NS_RESULT = "00_프레임.png 없음"; return; }
    var s = P.createNewSequenceFromClips(SEQ_NAME, [frame], bin);
    var c0 = s.videoTracks[0].clips; for (var c = c0.numItems - 1; c >= 0; c--) c0[c].remove(false, false);
    var a0 = s.audioTracks[0].clips; for (var c = a0.numItems - 1; c >= 0; c--) a0[c].remove(false, false);
    var need = 0; for (var i = 0; i < E.length; i++) need = Math.max(need, E[i].v);
    P.openSequence(s.sequenceID); P.activeSequence = s; app.enableQE();
    if (s.videoTracks.numTracks < need) qe.project.getActiveSequence().addTracks(need - s.videoTracks.numTracks, s.videoTracks.numTracks, 0);
    // V1 조각 (중첩)
    RV_RESULT = ""; $.evalFile(new File($.fileName).path + "/rebuild_v1.jsx"); log.push(RV_RESULT);
    // 요소
    var n = 0;
    for (var i = 0; i < E.length; i++) {
        var e = E[i], it = fi(P.rootItem, e.file);
        if (!it) { log.push("없음 " + e.file); continue; }
        var V = s.videoTracks[e.v - 1]; V.overwriteClip(it, e.s);
        var cs = V.clips, ok = false;
        for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - e.s) < 0.02) { cs[c].end = T(e.e); ok = true; }
        if (ok) n++; else log.push("못 놓음 " + e.file);
    }
    P.save();
    NS_RESULT = SEQ_NAME + " | 요소 " + n + "/" + E.length + " | " + log.join(" | ");
})();
