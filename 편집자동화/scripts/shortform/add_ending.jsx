// 숏폼 에이전트 — 숏폼 끝에 공통 엔딩 영상 붙이기 (2026-10-16)
// 사용자: "숏폼 영상 각 끝부분에 엔딩 영상을 공통적으로 추가" / "그대로 두고 뒤에 붙여줘" (마지막 6초 빈 하단 구간은 그대로, 그 뒤에)
// 사용: (function(){ NAMES=["목교정기_숏폼1", …]; SRC_SUFFIX="_정리4"; DST_SUFFIX="_엔딩"; ENDING="<엔딩 mp4>"; GAIN_DB=7.5; AE_RESULT=""; $.evalFile("<이 파일>"); return AE_RESULT; })()
// - SRC를 복제해 DST (자막·요소 그대로), 엔딩은 V1·A1 마지막 클립 바로 뒤
// - GAIN_DB: 엔딩 소리를 숏폼 본편 음량에 맞춤 (본편 −15.5 LUFS, 엔딩 −23 LUFS → +7.5dB). 프리미어 볼륨 레벨 = 10^((dB−15)/20)
(function () {
    var P = app.project, out = [];
    function seqByName(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function fb(root, n) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == n) return c; var r = fb(c, n); if (r) return r; } } return null; }
    function comp(k, name) { for (var z = 0; z < k.components.numItems; z++) if (k.components[z].displayName == name) return k.components[z]; return null; }
    var par = fb(P.rootItem, "숏폼") || P.rootItem, bin = fb(par, "엔딩") || par.createBin("엔딩");
    var f = new File(ENDING), item = null;
    function find() { for (var j = 0; j < bin.children.numItems; j++) if (bin.children[j].name == f.displayName) return bin.children[j]; return null; }
    item = find(); if (!item) { P.importFiles([f.fsName], true, bin, false); item = find(); }
    if (!item) { AE_RESULT = "엔딩 못 가져옴"; return; }
    var lvl = Math.pow(10, (GAIN_DB - 15) / 20);
    for (var i = 0; i < NAMES.length; i++) {
        var src = seqByName(NAMES[i] + SRC_SUFFIX), dn = NAMES[i] + DST_SUFFIX;
        if (!src) { out.push("없음 " + NAMES[i]); continue; }
        if (seqByName(dn)) { out.push("이미 있음 " + dn); continue; }
        var before = {}; for (var q = 0; q < P.sequences.numSequences; q++) before[P.sequences[q].sequenceID] = 1;
        src.clone();
        var d = null; for (var q = 0; q < P.sequences.numSequences; q++) if (!before[P.sequences[q].sequenceID]) d = P.sequences[q];
        if (!d) { out.push("복제 실패 " + NAMES[i]); continue; }
        d.name = dn;
        var V = d.videoTracks[0], A = d.audioTracks[0], vc = V.clips, ac = A.clips;
        var endT = Math.max(Number(vc[vc.numItems - 1].end.ticks), Number(ac[ac.numItems - 1].end.ticks)), es = endT / 254016000000;
        try { item.clearInPoint(4); item.clearOutPoint(4); } catch (e) {}
        V.overwriteClip(item, es);
        var nv = null, na = null;
        for (var j = 0; j < V.clips.numItems; j++) if (V.clips[j].projectItem.nodeId == item.nodeId) nv = V.clips[j];
        for (var j = 0; j < A.clips.numItems; j++) if (A.clips[j].projectItem.nodeId == item.nodeId) na = A.clips[j];
        var vol = na ? comp(na, "볼륨") : null; if (vol) vol.properties[1].setValue(lvl, true);
        out.push(dn + " 엔딩 " + (nv ? nv.start.seconds.toFixed(3) + "-" + nv.end.seconds.toFixed(3) : "영상X") + (na ? " 소리O" : " 소리X") + " 끝 " + (d.end / 254016000000).toFixed(2));
    }
    P.save();
    AE_RESULT = out.join("\n");
})();
