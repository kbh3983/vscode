// 정보성 템플릿 확인용: 다 나타난 뒤(5초) 프레임을 OUT\v_NN.png 로 (only.txt 범위, 없으면 전부) — 저장 안 함
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\정보성\\템플릿\\ae", log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_still.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        var aep = new File(OUT + "\\jeongbo32.aep");
        if (!(app.project && app.project.file && app.project.file.fsName == aep.fsName)) app.open(aep);
        var a = 1, b = 32, of = new File(OUT + "\\only.txt");
        if (of.exists) { of.open("r"); var m = of.read().match(/(\d+)\s*-\s*(\d+)/); of.close(); a = +m[1]; b = +m[2]; }
        for (var i = a; i <= b; i++) {
            var p = (i < 10 ? "0" : "") + i, c = null;
            for (var k = 1; k <= app.project.numItems; k++) { var it = app.project.item(k); if (it instanceof CompItem && it.name.indexOf(p + "_") == 0) c = it; }
            if (!c) { w(p + " 없음"); continue; } if ({"05":1,"06":1,"08":1,"09":1,"16":1,"22":1,"23":1,"25":1,"27":1,"28":1,"29":1,"30":1,"32":1}[p]) continue;
            var f = new File(OUT + "\\v_" + p + ".png"); if (f.exists) f.remove();
            c.saveFrameToPng(5, f); for (var z = 0; z < 60 && !f.exists; z++) $.sleep(300);
            w(p + (f.exists ? " ok" : " 실패"));
        }
        w("Still 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();

