// 숏폼 에이전트 — 숏폼의 자막·제목 이미지를 고칠 수 있는 글자로 바꾸기 (2026-10-14 사용자: "수정 가능하도록 텍스트 파일로")
// 사용: (function(){ SRC_ID="<숏폼 시퀀스 ID>"; SRT="<자막 srt>"; MOGRT="<숏폼_상단제목_AE.mogrt>"; L1="윗줄"; L2="아랫줄"; DUR=<초>; TT_RESULT=""; $.evalFile("<이 파일>"); return TT_RESULT; })()
// 원본은 두고 복제본 <이름>_텍스트 에서: V4 자막 이미지 지움 → 자막(캡션) 트랙(srt, 핵심어 <font color>) / V6 제목 이미지 → 상단 제목 템플릿(문구 칸 2개)
// SUFFIX(선택): 복제 이름 접미 (기본 "_텍스트"). 같은 숏폼을 다시 만들 때 "_텍스트2" 등 — 자막 트랙은 스크립트로 못 지워 새 복제에서 다시 넣는다
// 자막 트랙 모양(Pretendard 60·검정 띠·위치)은 스크립트로 못 정함 → 사용자가 트랙 스타일로 한 번 지정
(function () {
    var P = app.project;
    function seqById(id) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].sequenceID == id) return P.sequences[i]; return null; }
    function findItem(root, name) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { var r = findItem(c, name); if (r) return r; } else if (c.name == name) return c; } return null; }
    function findBin(root, name) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == name) return c; var r = findBin(c, name); if (r) return r; } } return null; }   // findItem은 빈 자체를 못 찾음 (첫 실행 때 빈이 15개 생김)
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    var src = seqById(SRC_ID), log = [];
    var nm = src.name + (typeof SUFFIX == "string" ? SUFFIX : "_텍스트");
    for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == nm) { TT_RESULT = "이미 있음 " + nm; return; }
    var before = {}; for (var i = 0; i < P.sequences.numSequences; i++) before[P.sequences[i].sequenceID] = 1;
    src.clone(); var s = null; for (var i = 0; i < P.sequences.numSequences; i++) if (!before[P.sequences[i].sequenceID]) s = P.sequences[i];
    s.name = nm;
    // 1. 자막·제목 이미지 지우기
    var cs = s.videoTracks[3].clips, nsub = cs.numItems; for (var c = cs.numItems - 1; c >= 0; c--) cs[c].remove(false, false);
    cs = s.videoTracks[5].clips; for (var c = cs.numItems - 1; c >= 0; c--) cs[c].remove(false, false);
    // 2. 상단 제목 템플릿
    var item = s.importMGT(MOGRT, T(0).ticks, 5, s.audioTracks.numTracks - 1);
    if (!item) log.push("제목 템플릿 넣기 실패");
    else {
        var m = item.getMGTComponent(), set = 0;
        for (var q = 0; q < m.properties.numItems; q++) {
            var pr = m.properties[q], v = ""; try { v = String(pr.getValue()); } catch (e) {}
            if (v.indexOf("textEditValue") < 0) continue;
            var tx = pr.displayName == "윗줄 텍스트" ? L1 : (pr.displayName == "아랫줄 텍스트" ? L2 : null); if (tx === null) continue;
            var j = JSON.parse(v); j.textEditValue = tx; j.fontTextRunLength = [tx.length]; j.capPropTextRunCount = 1;
            var A_ = ["fontEditValue", "fontFSAllCapsValue", "fontFSBoldValue", "fontFSItalicValue", "fontFSSmallCapsValue", "fontSizeEditValue"];
            for (var a = 0; a < A_.length; a++) if (j[A_[a]] && j[A_[a]].length) j[A_[a]] = [j[A_[a]][0]];
            pr.setValue(JSON.stringify(j), true); set++;
        }
        item.end = T(DUR); try { item.name = "상단 제목"; } catch (e) {}
        if (set != 2) log.push("제목 칸 " + set + "개만 채움");
    }
    // 3. 자막 트랙
    var BN = (typeof SRT_BIN == "string") ? SRT_BIN : "자막_srt";   // 같은 이름 srt를 새로 만들면 빈 이름을 바꿔야 옛 것을 다시 쓰지 않음
    var par = findBin(P.rootItem, "숏폼_첫작업") || P.rootItem;
    var bin = findBin(par, BN) || par.createBin(BN);
    var fname = new File(SRT).name; fname = decodeURI(fname);
    var it = null; for (var i = 0; i < bin.children.numItems; i++) if (bin.children[i].name == fname) it = bin.children[i];
    if (!it) { P.importFiles([SRT], true, bin, false); for (var i = 0; i < bin.children.numItems; i++) if (bin.children[i].name == fname) it = bin.children[i]; }
    if (!it) log.push("srt 못 가져옴 " + fname);
    else log.push("자막 트랙 " + s.createCaptionTrack(it, 0));
    P.save();
    TT_RESULT = nm + " " + s.sequenceID + " | 지운 자막 이미지 " + nsub + " | V4:" + s.videoTracks[3].clips.numItems + " V6:" + s.videoTracks[5].clips.numItems + " | " + log.join("; ");
})();
