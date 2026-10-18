// 브이로그 자막 템플릿 확인용 — 레퍼런스의 자막 없는 장면 위에 템플릿 컴프를 올린 "확인_XX" 컴프 + 렌더 대기열 (처음 1.5초 mp4)
// 실행: run_ae.ps1 <이 파일> <OUT\result_preview.txt> "Preview 끝" 300  → aerender -rqindex (7번부터)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\브이로그예능\\템플릿\\ae";
    var BG = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\브이로그예능\\템플릿\\bg2\\";
    var FPS = 29.97, FR = 1 / FPS;
    var P = [["01", "02_r3.png"], ["02", "14_r8.png"], ["03", "14_r8.png"], ["04", "02_r3.png"], ["05", "13_r9.png"], ["06", "02_r3.png"]];
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_preview.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function byName(n) { for (var k = 1; k <= app.project.numItems; k++) if (app.project.item(k).name == n) return app.project.item(k); return null; }
    function byPrefix(p) { for (var k = 1; k <= app.project.numItems; k++) { var it = app.project.item(k); if (it instanceof CompItem && it.name.indexOf(p) == 0) return it; } return null; }
    try {
        app.beginSuppressDialogs();
        var f = new File(OUT + "\\vlog5.aep");
        if (!app.project || !app.project.file || app.project.file.fsName != f.fsName) app.open(f);
        // 이전 확인 컴프·대기열 정리
        for (var q = app.project.renderQueue.numItems; q >= 1; q--) { var it = app.project.renderQueue.item(q); if (it.comp.name.indexOf("확인_") == 0) it.remove(); }
        for (var k = app.project.numItems; k >= 1; k--) { var x = app.project.item(k); if (x.name.indexOf("확인_") == 0) x.remove(); }
        var imgs = {};
        for (var i = 0; i < P.length; i++) {
            var tpl = byPrefix("브이로그_" + P[i][0] + "_");
            if (!imgs[P[i][1]]) imgs[P[i][1]] = app.project.importFile(new ImportOptions(new File(BG + P[i][1])));
            var c = app.project.items.addComp("확인_" + P[i][0], 1920, 1080, 1, 45 * FR, FPS);
            c.layers.add(imgs[P[i][1]]);
            c.layers.add(tpl);
            var rq = app.project.renderQueue.items.add(c);
            rq.outputModule(1).file = new File(OUT + "\\render\\확인_" + P[i][0] + ".mp4");
            w("확인_" + P[i][0] + " ← " + tpl.name + " / " + P[i][1] + " 대기열 #" + app.project.renderQueue.numItems);
        }
        app.project.save();
        w("Preview 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
