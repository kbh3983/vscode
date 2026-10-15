// 숏폼 에이전트 — 상단 제목을 자막 트랙으로 넣기 → 사용자가 "그래픽으로 업그레이드"해 프리미어 그래픽(글자 레이어)으로 바꿈
// 2026-10-14 사용자: "숏폼 상단 제목을 첨부한 이미지와 같은 형식의 텍스트 파일로 비디오 트랙에 넣고 싶은데" → 방법 A "A로 진행해줘"
//   (프리미어 그래픽 글자 레이어는 스크립트로 문구를 못 넣음 — 소스 텍스트 값이 읽히지도 써지지도 않음. 자막 → 그래픽 업그레이드는 프리미어 기본 기능)
// 사용: (function(){ SEQ_NAME="<숏폼>_텍스트2"; OUT_DIR="<srt 폴더>"; TC_RESULT=""; $.evalFile("<이 파일>"); return TC_RESULT; })()
// - 제목 문구는 V6 "상단 제목" 템플릿(숏폼_상단제목_AE)에서 읽음 (사용자가 고친 문구 그대로)
// - srt 한 줄: 0초 ~ 시퀀스 끝, 윗줄 흰 / 아랫줄 노랑(<font color="#FCE001">)
// - V6 템플릿 제목은 지우지 않고 끔(업그레이드 끝나면 사용자가 지움)
(function () {
    var P = app.project, s = null;
    for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == SEQ_NAME) s = P.sequences[i];
    if (!s) { TC_RESULT = "시퀀스 없음 " + SEQ_NAME; return; }
    function findBin(root, name) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == name) return c; var r = findBin(c, name); if (r) return r; } } return null; }
    function tc(sec) { var ms = Math.round(sec * 1000), h = Math.floor(ms / 3600000); ms -= h * 3600000; var m = Math.floor(ms / 60000); ms -= m * 60000; var ss = Math.floor(ms / 1000); ms -= ss * 1000;
        function z(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; } return z(h, 2) + ":" + z(m, 2) + ":" + z(ss, 2) + "," + z(ms, 3); }
    var clip = s.videoTracks[5].clips.numItems ? s.videoTracks[5].clips[0] : null, L1 = "", L2 = "";
    var m = clip ? clip.getMGTComponent() : null;
    if (!m) { TC_RESULT = SEQ_NAME + " V6 제목 템플릿 없음"; return; }
    for (var q = 0; q < m.properties.numItems; q++) {
        var v = ""; try { v = String(m.properties[q].getValue()); } catch (e) {}
        if (v.indexOf("textEditValue") < 0) continue;
        var tx = JSON.parse(v).textEditValue;
        if (m.properties[q].displayName == "윗줄 텍스트") L1 = tx; else if (m.properties[q].displayName == "아랫줄 텍스트") L2 = tx;
    }
    var dur = s.end / 254016000000;
    var base = SEQ_NAME.replace(/_텍스트\d*$/, "");
    var f = new File(OUT_DIR + "/" + base + "_제목.srt"); f.encoding = "UTF-8"; f.lineFeed = "Windows"; f.open("w");
    f.write("﻿1\n" + tc(0) + " --> " + tc(dur) + "\n" + L1 + "\n<font color=\"#FCE001\">" + L2 + "</font>\n"); f.close();
    var par = findBin(P.rootItem, "숏폼_첫작업") || P.rootItem;
    var bin = findBin(par, "제목_srt") || par.createBin("제목_srt");
    var it = null; for (var i = 0; i < bin.children.numItems; i++) if (bin.children[i].name == f.displayName) it = bin.children[i];
    if (!it) { P.importFiles([f.fsName], true, bin, false); for (var i = 0; i < bin.children.numItems; i++) if (bin.children[i].name == f.displayName) it = bin.children[i]; }
    if (!it) { TC_RESULT = SEQ_NAME + " srt 못 가져옴"; return; }
    var ok = s.createCaptionTrack(it, 0);
    clip.disabled = true;
    P.save();
    TC_RESULT = SEQ_NAME + " | 제목 자막 트랙 " + ok + " | " + L1 + " / " + L2 + " | V6 끔";
})();
