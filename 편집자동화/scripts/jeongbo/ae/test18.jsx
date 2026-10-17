// 18번 확인: 0·2·4·6·8프레임 저장 (저장 안 함)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\정보성\\템플릿\\ae", log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_t18.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        var aep = new File(OUT + "\\jeongbo32.aep");
        if (!(app.project && app.project.file && app.project.file.fsName == aep.fsName)) app.open(aep);
        var c = null; for (var k = 1; k <= app.project.numItems; k++) { var it = app.project.item(k); if (it instanceof CompItem && it.name.indexOf("18_") == 0) c = it; }
        var F = [0, 2, 4, 6, 8];
        for (var i = 0; i < F.length; i++) { var f = new File(OUT + "\\t18_" + i + ".png"); if (f.exists) f.remove(); c.saveFrameToPng(F[i] / 29.97, f); for (var z = 0; z < 60 && !f.exists; z++) $.sleep(300); }
        w("T18 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
