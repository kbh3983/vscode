// 숏폼 에이전트 — unnest.jsx를 여러 숏폼에 차례로 (MCP 45초 제한을 넘겨도 프리미어는 계속 돌므로 진행은 LOG 파일로 확인)
// 사용: (function(){ NAMES=["목교정기_숏폼2", …]; LOG="<로그 txt>"; $.evalFile("<이 파일>"); return "시작"; })()
// 숏폼마다: _정리4 없으면 init+video, A1 비었으면 audio, 그다음 verify → LOG에 한 줄
(function () {
    var F = "C:/DADA/9.AI/vscode/편집자동화/scripts/shortform/unnest.jsx", P = app.project;
    function w(s) { var f = new File(LOG); f.encoding = "UTF-8"; f.open("a"); f.writeln(s); f.close(); }
    function seq(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function run(m) { MODE = m; UN_RESULT = ""; try { $.evalFile(F); } catch (e) { UN_RESULT = "오류 " + m + " " + e.message + " line " + e.line; } return UN_RESULT; }
    for (var i = 0; i < NAMES.length; i++) {
        SRC_NAME = NAMES[i] + "_정리3"; DST_NAME = NAMES[i] + "_정리4";
        var r = [];
        if (!seq(DST_NAME)) { r.push(run("init")); r.push(run("video")); }
        var d = seq(DST_NAME);
        if (d && d.audioTracks[0].clips.numItems == 0) r.push(run("audio"));
        r.push(run("verify"));
        d = seq(DST_NAME);
        w(NAMES[i] + " | V1 " + d.videoTracks[0].clips.numItems + " A1 " + d.audioTracks[0].clips.numItems + " | " + r.join(" / "));
    }
    P.save();
    w("끝");
})();
