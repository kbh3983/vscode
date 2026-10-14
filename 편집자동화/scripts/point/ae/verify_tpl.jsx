// 포인트 에이전트 — upgrade_tpl.jsx 결과 확인 (2026-10-13): 백업(전) vs 정리 후 같은 시각 PNG, 9.5초 PNG, 조절 칸을 바꾼 PNG. 저장 안 함
(function () {
    var R = "C:\\DADA\\9.AI\\vscode\\편집자동화\\";
    var OUT = R + "work\\포인트\\ae_templates\\verify\\";
    var LOG = OUT + "verify_result.txt";
    new Folder(OUT).create();
    var log = [];
    function w(s) { log.push(s); var f = new File(LOG); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    var P = ["work\\포인트\\ae_templates\\05_실망\\05_실망_AE.aep", "work\\포인트\\ae_templates\\08_분노\\08_분노_AE.aep",
             "work\\포인트\\ae_templates\\10_분노\\10_분노_AE.aep", "work\\포인트\\ae_templates\\봄03\\봄03_AE.aep",
             "work\\포인트\\ae_templates\\봄04\\봄04_AE.aep", "work\\포인트\\ae_templates\\봄06\\봄06_AE.aep",
             "work\\포인트\\ae_templates\\봄12\\봄12_AE.aep", "work\\포인트\\ae_templates\\봄13\\봄13_AE.aep",
             "work\\회고\\tpl\\ae\\info4.aep", "work\\회고\\목교정기\\tpl\\ae\\info2.aep", "work\\회고\\자세교정\\tpl\\ae\\sum2.aep"];
    var T = 1.5;
    function comps() { var a = []; for (var i = 1; i <= app.project.numItems; i++) { var c = app.project.item(i); if (c instanceof CompItem && c.motionGraphicsTemplateControllerCount > 0) a.push(c); } return a; }
    function png(c, t, name) { var f = new File(OUT + name + ".png"); if (f.exists) f.remove(); c.saveFrameToPng(t, f); for (var i = 0; i < 300 && !f.exists; i++) $.sleep(100); $.sleep(300); if (!f.exists) w("  PNG 안 생김 " + name); }   // 비동기 — 생길 때까지 기다림
    function fx(c, n) { for (var i = 1; i <= c.numLayers; i++) if (c.layer(i).name == "템플릿 조절") { var e = c.layer(i).property("ADBE Effect Parade").property(n); return e ? e.property(1) : null; } return null; }
    try {
        app.beginSuppressDialogs();
        for (var k = 0; k < P.length; k++) {
            var path = R + P[k];
            if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            app.open(new File(path.replace(".aep", "_백업1013.aep")));
            var A = comps(); for (var i = 0; i < A.length; i++) png(A[i], Math.min(T, A[i].duration - 0.1), "before_" + A[i].name);
            app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            app.open(new File(path));
            var B = comps();
            for (var j = 0; j < B.length; j++) {
                var c = B[j];
                png(c, Math.min(T, 1.7), "after_" + c.name); png(c, 9.5, "late_" + c.name);
                // 조절 시험: 색 칸 하나를 파랑, 2줄이면 아랫줄 130%·윗줄 (60,-40) 이동
                var names = [];
                for (var m = 1; m <= c.motionGraphicsTemplateControllerCount; m++) names.push(c.getMotionGraphicsTemplateControllerName(m));
                var col = null;
                for (var q = 0; q < names.length; q++) if (/테두리 색|상자 색|글자 위 색|아랫줄 위 색/.test(names[q])) { col = names[q]; break; }
                if (col) fx(c, col).setValue([0.1, 0.4, 1, 1]);
                if (fx(c, "아랫줄 크기")) { fx(c, "아랫줄 크기").setValue(130); fx(c, "윗줄 위치 이동").setValue([60, -40]); }
                png(c, Math.min(T, 1.7), "test_" + c.name);
                w(c.name + " 칸: " + names.join(", ") + " | 시험 색 " + col);
            }
        }
        app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        w("VERIFY END");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
