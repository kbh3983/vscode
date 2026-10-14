// 포인트 에이전트 — 템플릿 일부를 4배로 다시 그려 PNG (테두리·그림자 두께 정밀 측정용, 2026-10-13)
// 아래 변수를 바꿔 run_ae.ps1로 실행: 프로젝트 · 컴포지션 · 시각 · 잘라 볼 영역(원래 좌표) · 배율 · 출력
(function () {
    var PROJ = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\회고\\tpl\\ae\\info4.aep";
    var COMP = "Tip_동작요령_2단", T = 2.0, X0 = 30, Y0 = 860, W = 470, H = 180, K = 4;
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\포인트\\하체루틴_추가_fit\\tip\\zoom4.png";
    var LOG = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\포인트\\하체루틴_추가_fit\\tip\\zoom_result.txt";
    function w(s) { var f = new File(LOG); f.encoding = "UTF-8"; f.open("a"); f.writeln(s); f.close(); }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        app.open(new File(PROJ)); w("열림");
        var src = null;
        for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem && app.project.item(i).name == COMP) src = app.project.item(i);
        var z = app.project.items.addComp("zoom", W * K, H * K, 1, 1, 29.97);
        var L = z.layers.add(src); L.collapseTransformation = true;   // 확대해도 글자를 벡터로 다시 그림
        L.startTime = -T;
        L.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([X0, Y0]);
        L.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([K * 100, K * 100]);
        z.bgColor = [0, 0, 0];
        w("저장 시작");
        z.saveFrameToPng(0, new File(OUT));
        w("저장 요청 끝 Zoom done");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
