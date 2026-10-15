// 숏폼 에이전트 — 숏폼 시퀀스를 자막 트랙 없는 새 시퀀스로 그대로 옮기기 + 트랙 붙이기 + 자막 트랙 새로 (2026-10-16)
// - 영상(V1)은 원본 클립 그대로(중첩 소스의 in/out·비율·위치), 오디오 A1은 연결돼 같이 들어옴
// - 요소 트랙은 V1 위 한 칸 띄우고 빈칸 없이: V3, V4, V5 … (사용자: "비디오클립 기준으로 한 칸만 위에 띄워서 추가된 요소들은 모두 쭉 이어서")
// - 자막 트랙은 SRTS 순서대로 (스크립트로 지울 수 없어 한 번에 최종 것만)
// 사용: (function(){ SRC_NAME="…_정리2"; DST_NAME="…_정리3"; SRTS=[…]; BINS=[…]; CS_RESULT=""; $.evalFile("<이 파일>"); return CS_RESULT; })()
(function () {
    var P = app.project, log = [];
    function seqByName(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function fi(root, n) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { var r = fi(c, n); if (r) return r; } else if (c.name == n) return c; } return null; }
    function fb(root, n) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == n) return c; var r = fb(c, n); if (r) return r; } } return null; }
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    function TK(tk) { var t = new Time(); t.ticks = tk; return t; }
    function motion(k) { var r = {}; for (var z = 0; z < k.components.numItems; z++) if (k.components[z].matchName == "AE.ADBE Motion") { var mp = k.components[z].properties; for (var y = 0; y < mp.numItems; y++) { if (mp[y].displayName == "비율 조정") r.sc = mp[y]; if (mp[y].displayName == "위치") r.pos = mp[y]; } } return r; }
    var src = seqByName(SRC_NAME);
    if (seqByName(DST_NAME)) { CS_RESULT = "이미 있음 " + DST_NAME; return; }
    var bin = fb(P.rootItem, "숏폼_첫작업");
    var s = P.createNewSequenceFromClips(DST_NAME, [fi(P.rootItem, "00_프레임.png")], bin);
    var c0 = s.videoTracks[0].clips; for (var c = c0.numItems - 1; c >= 0; c--) c0[c].remove(false, false);
    var a0 = s.audioTracks[0].clips; for (var c = a0.numItems - 1; c >= 0; c--) a0[c].remove(false, false);
    var used = []; for (var v = 1; v < src.videoTracks.numTracks; v++) if (src.videoTracks[v].clips.numItems) used.push(v);
    P.openSequence(s.sequenceID); P.activeSequence = s; app.enableQE(); var q = qe.project.getActiveSequence();
    var need = 2 + used.length; if (s.videoTracks.numTracks < need) q.addTracks(need - s.videoTracks.numTracks, s.videoTracks.numTracks, 0);
    // V1
    var V = s.videoTracks[0], A = s.audioTracks[0], sv = src.videoTracks[0].clips, n1 = 0;
    for (var c = 0; c < sv.numItems; c++) {
        var k = sv[c], it = k.projectItem, st = k.start.seconds, inp = k.inPoint.seconds, op = k.outPoint.seconds;
        try { it.clearInPoint(4); it.clearOutPoint(4); } catch (e) {}
        it.setInPoint(inp, 4); it.setOutPoint(op, 4);
        V.overwriteClip(it, st);
        for (var t2 = 0; t2 < 2; t2++) { var cs = [V, A][t2].clips, mv = null; for (var j = 0; j < cs.numItems; j++) if (Math.abs(cs[j].inPoint.seconds - inp) < 0.02 && cs[j].start.seconds > st + 0.01) mv = cs[j]; if (mv) mv.move(T(st - mv.start.seconds)); }
        var nk = null, d = V.clips; for (var j = 0; j < d.numItems; j++) if (Math.abs(d[j].start.seconds - st) < 0.02) nk = d[j];
        if (!nk) { log.push("V1 못 놓음 " + st); continue; }
        nk.end = TK(k.end.ticks);
        var m0 = motion(k), m1 = motion(nk); try { m1.sc.setValue(m0.sc.getValue(), true); m1.pos.setValue(m0.pos.getValue(), true); } catch (e) { log.push("움직임 " + e.message); }
        n1++;
    }
    try { var it0 = sv[0].projectItem; it0.clearInPoint(4); it0.clearOutPoint(4); } catch (e) {}
    // 오디오 끝·틈 맞추기
    var se = src.audioTracks[0].clips; var la = A.clips;
    if (la.numItems && se.numItems) la[la.numItems - 1].end = TK(se[se.numItems - 1].end.ticks);
    for (var t3 = 0; t3 < 2; t3++) { var c4 = [V, A][t3].clips; for (var j = 0; j < c4.numItems - 1; j++) { var gap = (Number(c4[j + 1].start.ticks) - Number(c4[j].end.ticks)) / 254016000000; if (gap > 0.0001 && gap < 0.1) c4[j].end = TK(c4[j + 1].start.ticks); } }
    // 요소 트랙 (한 칸 띄우고 이어서)
    var n2 = 0;
    for (var u = 0; u < used.length; u++) {
        var cs = src.videoTracks[used[u]].clips, D = s.videoTracks[2 + u];
        for (var c = 0; c < cs.numItems; c++) {
            var k = cs[c], st = k.start.seconds; D.overwriteClip(k.projectItem, st);
            var d = D.clips, nk = null; for (var j = 0; j < d.numItems; j++) if (Math.abs(d[j].start.seconds - st) < 0.02) nk = d[j];
            if (nk) { nk.end = TK(k.end.ticks); n2++; } else log.push("못 놓음 V" + (3 + u) + " " + st);
        }
    }
    // 자막 트랙
    for (var i = 0; i < SRTS.length; i++) {
        var f = new File(SRTS[i]), b = fb(P.rootItem, BINS[i]) || bin.createBin(BINS[i]), it = null;
        for (var j = 0; j < b.children.numItems; j++) if (b.children[j].name == f.displayName) it = b.children[j];
        if (!it) { P.importFiles([f.fsName], true, b, false); for (var j = 0; j < b.children.numItems; j++) if (b.children[j].name == f.displayName) it = b.children[j]; }
        log.push(it ? "자막" + (i + 1) + " " + s.createCaptionTrack(it, 0) : "자막" + (i + 1) + " 없음");
    }
    P.save();
    var cnt = []; for (var v = 0; v < s.videoTracks.numTracks; v++) cnt.push(s.videoTracks[v].clips.numItems);
    CS_RESULT = DST_NAME + " | V1 " + n1 + "/" + sv.numItems + " 요소 " + n2 + " | " + log.join("; ") + " | V " + cnt.join(",") + " A1 " + A.clips.numItems + " | 끝 " + (s.end / 254016000000).toFixed(2) + "/" + (src.end / 254016000000).toFixed(2);
})();
