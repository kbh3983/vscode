// 디버그: 왼쪽 정렬 글자 위치 확인 (저장 안 함)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\정보성\\템플릿\\ae", log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_debug.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        var aep = new File(OUT + "\\jeongbo32.aep");
        if (!(app.project && app.project.file && app.project.file.fsName == aep.fsName)) app.open(aep);
        var N = ["02_장제목_왼쪽2줄", "07_손글씨_속마음"];
        for (var i = 1; i <= app.project.numItems; i++) {
            var c = app.project.item(i); if (!(c instanceof CompItem)) continue;
            var ok = false; for (var k = 0; k < N.length; k++) if (c.name == N[k]) ok = true; if (!ok) continue;
            for (var j = 1; j <= c.numLayers; j++) {
                var L = c.layer(j), t = L.property("ADBE Transform Group");
                var s = c.name + " | " + L.name; try { var P = t.property("ADBE Position"), A = t.property("ADBE Anchor Point"); var v = P.value, p2 = P.valueAtTime(2, false), a2 = A.valueAtTime(2, false);
                    s += " val=" + v[0].toFixed(1) + "," + v[1].toFixed(1) + " parent=" + (L.parent ? L.parent.name : "-") + " pos@2=" + p2[0].toFixed(1) + "," + p2[1].toFixed(1) + " anchor@2=" + a2[0].toFixed(1) + "," + a2[1].toFixed(1) + " expr=" + P.expression.substr(0, 60);
                } catch (e) { s += " ERR " + e.message; }
                try { var r = L.sourceRectAtTime(2, false); s += " rect=" + r.left.toFixed(1) + "," + r.top.toFixed(1) + "," + r.width.toFixed(1) + "," + r.height.toFixed(1); var td = L.property("ADBE Text Properties").property("ADBE Text Document").value; s += " just=" + td.justification + " (L=" + ParagraphJustification.LEFT_JUSTIFY + ") anchorExpr=" + L.property("ADBE Transform Group").property("ADBE Anchor Point").expression; } catch (e) { s += " rectERR " + e.message; }
                w(s);
            }
        }
        w("Debug 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
