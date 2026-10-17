// 확인용: 44 찢긴 액자의 거친 가장자리 효과 속성 목록 (저장 안 함)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\정보성\\템플릿\\ae", log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_dbg.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        var c = null;
        for (var k = 1; k <= app.project.numItems; k++) { var it = app.project.item(k); if (it instanceof CompItem && it.name.indexOf("44_") == 0) c = it; }
        var E = c.layer("찢긴 액자").property("ADBE Effect Parade").property("ADBE Roughen Edges");
        for (var i = 1; i <= E.numProperties; i++) {
            var p = E.property(i), v = "";
            try { v = p.value; } catch (e) {}
            w(i + " " + p.matchName + " " + p.name + " = " + v + (p.canSetExpression && p.expression ? " 식:" + p.expression : ""));
        }
        w("DBG 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
