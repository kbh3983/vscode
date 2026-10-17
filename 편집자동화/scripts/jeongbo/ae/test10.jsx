// 10번 확인: 대사를 짧게 바꿔 5초 프레임 저장 (저장 안 함)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\정보성\\템플릿\\ae", log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_t10.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        var aep = new File(OUT + "\\jeongbo32.aep");
        if (!(app.project && app.project.file && app.project.file.fsName == aep.fsName)) app.open(aep);
        var c = null; for (var k = 1; k <= app.project.numItems; k++) { var it = app.project.item(k); if (it instanceof CompItem && it.name.indexOf("10_") == 0) c = it; }
        var T = ["바보가 아니잖아", "나는 이러이러한 소리가 난다고 얘기를 하시기 때문에"];
        for (var i = 0; i < 2; i++) {
            var L = c.layer("대사"), st = L.property("ADBE Text Properties").property("ADBE Text Document"), td = st.value; td.text = T[i]; st.setValue(td);
            var f = new File(OUT + "\\t10_" + i + ".png"); if (f.exists) f.remove(); c.saveFrameToPng(5, f); for (var z = 0; z < 60 && !f.exists; z++) $.sleep(300);
        }
        app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        w("T10 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
