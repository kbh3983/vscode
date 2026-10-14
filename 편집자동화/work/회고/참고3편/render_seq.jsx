// 참고 3편 — render_jobs.json의 한 시퀀스(NM) 구간 프레임을 그래픽 트랙(V3~) 숨기고 렌더 (FROM~TO 번호만)
// 사용: var NM="기초체력"; var FROM=0; var TO=99; var RS_RESULT=""; $.evalFile("<이 파일>"); return RS_RESULT;
(function () {
    var D = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\회고\\참고3편\\";
    var f = new File(D + "render_jobs.json"); f.encoding = "UTF-8"; f.open("r"); var J = JSON.parse(f.read()); f.close();
    var x = J[NM];
    SEQ_ID = x[0]; FIRST = 2; LAST = x[1] - 1; JOBS = [];
    for (var i = FROM; i <= Math.min(TO, x[2].length - 1); i++) JOBS.push([x[2][i][0], x[2][i][1], D + SUB + x[2][i][2] + ".png"]);
    SOLO_RESULT = "";
    $.evalFile("C:\\DADA\\9.AI\\vscode\\편집자동화\\scripts\\point\\render_solo.jsx");
    RS_RESULT = NM + " " + FROM + "~" + TO + ": " + SOLO_RESULT;
})();
