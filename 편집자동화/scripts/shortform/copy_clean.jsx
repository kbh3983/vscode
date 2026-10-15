// 숏폼 에이전트 — <숏폼>_샷 을 자막 트랙 없는 새 시퀀스 <숏폼>_정리 로 옮기기 (빈 자막 트랙 C1·C2 정리용, 2026-10-16)
// 자막(캡션) 트랙은 스크립트로 지우거나 고칠 수 없어 복제하면 따라옴 → 프레임 png로 새 시퀀스를 만들고(1080×1920·29.97, 자막 트랙 없음)
// V1은 rebuild_v1.jsx(샷사이즈 조각), V2~ 이미지 클립은 같은 시간에 다시 놓고, 자막 트랙은 srt로 다시 만든다 (대사 15자 → 대사 전체 → 제목 순)
// 선택: SUFFIX(기본 "_정리"), BINS(SRTS와 같은 순서의 빈 이름). 2026-10-16 "_정리2" = 대사 전체 + 제목 두 트랙만
// 사용: (function(){ NAME="<숏폼>"; LONG="<롱폼>"; PARTS_DIR="…"; RV_FILE="…/rebuild_v1.jsx"; SRTS=["…","…","…"]; CC_RESULT=""; $.evalFile("<이 파일>"); return CC_RESULT; })()
(function () {
    var P = app.project, log = [];
    function seqByName(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function fi(root, n) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { var r = fi(c, n); if (r) return r; } else if (c.name == n) return c; } return null; }
    function fb(root, n) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == n) return c; var r = fb(c, n); if (r) return r; } } return null; }
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    var src = seqByName(NAME + "_샷"), nm = NAME + (typeof SUFFIX == "string" ? SUFFIX : "_정리");
    if (seqByName(nm)) { CC_RESULT = "이미 있음 " + nm; return; }
    var bin = fb(P.rootItem, "숏폼_첫작업");
    var s = P.createNewSequenceFromClips(nm, [fi(P.rootItem, "00_프레임.png")], bin);
    var c0 = s.videoTracks[0].clips; for (var c = c0.numItems - 1; c >= 0; c--) c0[c].remove(false, false);
    var a0 = s.audioTracks[0].clips; for (var c = a0.numItems - 1; c >= 0; c--) a0[c].remove(false, false);
    P.openSequence(s.sequenceID); P.activeSequence = s;
    app.enableQE(); var q = qe.project.getActiveSequence();
    if (s.videoTracks.numTracks < src.videoTracks.numTracks) q.addTracks(src.videoTracks.numTracks - s.videoTracks.numTracks, s.videoTracks.numTracks, 0);
    // V1: 샷사이즈 조각
    SEQ_NAME = nm; SRC_NAME = LONG + "_숏폼소스_샷"; PARTS = PARTS_DIR + "/" + NAME + ".json"; RV_RESULT = "";
    $.evalFile(RV_FILE); log.push("V1 " + RV_RESULT.split(" | ")[1]);
    // V2~: 이미지 클립 같은 시간
    var n = 0;
    for (var v = 1; v < src.videoTracks.numTracks; v++) {
        var cs = src.videoTracks[v].clips;
        for (var c = 0; c < cs.numItems; c++) {
            var k = cs[c], st = k.start.seconds;
            s.videoTracks[v].overwriteClip(k.projectItem, st);
            var d = s.videoTracks[v].clips, nk = null;
            for (var j = 0; j < d.numItems; j++) if (Math.abs(d[j].start.seconds - st) < 0.02) nk = d[j];
            if (!nk) { log.push("못 놓음 V" + (v + 1) + " " + st); continue; }
            var e = new Time(); e.ticks = k.end.ticks; nk.end = e; n++;
        }
    }
    log.push("이미지 " + n);
    // 자막 트랙
    for (var i = 0; i < SRTS.length; i++) {
        var f = new File(SRTS[i]), it = null;
        var b = fb(P.rootItem, (typeof BINS != "undefined" ? BINS : ["자막_srt_15자", "자막_srt_15자_전체", "제목_srt"])[i]);
        if (b) for (var j = 0; j < b.children.numItems; j++) if (b.children[j].name == f.displayName) it = b.children[j];
        if (!it) { P.importFiles([f.fsName], true, b || bin, false); for (var j = 0; j < (b || bin).children.numItems; j++) if ((b || bin).children[j].name == f.displayName) it = (b || bin).children[j]; }
        log.push(it ? "자막 " + (i + 1) + " " + s.createCaptionTrack(it, 0) : "자막 " + (i + 1) + " srt 없음");
    }
    P.save();
    var cnt = []; for (var v = 0; v < s.videoTracks.numTracks; v++) cnt.push(s.videoTracks[v].clips.numItems);
    var sc = []; for (var v = 0; v < src.videoTracks.numTracks; v++) sc.push(src.videoTracks[v].clips.numItems);
    CC_RESULT = nm + " | " + log.join("; ") + " | V " + cnt.join(",") + " (원본 " + sc.join(",") + ") A1 " + s.audioTracks[0].clips.numItems + "/" + src.audioTracks[0].clips.numItems + " | 끝 " + (s.end / 254016000000).toFixed(2) + "/" + (src.end / 254016000000).toFixed(2);
})();
