// 포인트 에이전트 — 우리가 만든 AE 템플릿(.aep) 구조 덤프 (길이·레이어·색·효과·필수 그래픽 칸). 수정 안 함 (2026-10-13 템플릿 길이·색 정리 전 조사)
// 실행: run_ae.ps1 <이 파일> <결과 txt> "DUMP END" 600
(function () {
    var R = "C:\\DADA\\9.AI\\vscode\\편집자동화\\";
    var LOG = R + "work\\포인트\\ae_templates\\dump_tpl.txt";
    var P = ["work\\포인트\\ae_templates\\05_실망\\05_실망_AE.aep", "work\\포인트\\ae_templates\\08_분노\\08_분노_AE.aep",
             "work\\포인트\\ae_templates\\10_분노\\10_분노_AE.aep", "work\\포인트\\ae_templates\\봄03\\봄03_AE.aep",
             "work\\포인트\\ae_templates\\봄04\\봄04_AE.aep", "work\\포인트\\ae_templates\\봄06\\봄06_AE.aep",
             "work\\포인트\\ae_templates\\봄12\\봄12_AE.aep", "work\\포인트\\ae_templates\\봄13\\봄13_AE.aep",
             "work\\회고\\tpl\\ae\\info4.aep", "work\\회고\\목교정기\\tpl\\ae\\info2.aep", "work\\회고\\자세교정\\tpl\\ae\\sum2.aep"];
    var out = [];
    function w(s) { out.push(s); var f = new File(LOG); f.encoding = "UTF-8"; f.open("w"); f.write(out.join("\n")); f.close(); }
    function r(v) { return Math.round(v * 1000) / 1000; }
    function col(c) { return "[" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + "]"; }
    function kind(L) {
        if (L instanceof TextLayer) return "text";
        if (L instanceof ShapeLayer) return "shape";
        if (L.nullLayer) return "null";
        if (L.adjustmentLayer) return "adj";
        if (L.source instanceof CompItem) return "precomp(" + L.source.name + " " + r(L.source.duration) + "s)";
        if (L.source && L.source.mainSource instanceof SolidSource) return "solid";
        return "av";
    }
    function colorsIn(g, path, acc) {   // 색 속성(효과·도형 채움/선) 찾기
        for (var i = 1; i <= g.numProperties; i++) {
            var p = g.property(i);
            if (p.propertyType == PropertyType.PROPERTY) {
                if (p.propertyValueType == PropertyValueType.COLOR)
                    acc.push(path + "/" + p.name + "=" + col(p.value) + (p.numKeys ? "(키" + p.numKeys + ")" : "") + (p.expressionEnabled ? "(식)" : ""));
            } else if (p.numProperties !== undefined) colorsIn(p, path + "/" + p.name, acc);
        }
    }
    try {
        app.beginSuppressDialogs();
        for (var k = 0; k < P.length; k++) {
            if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            app.open(new File(R + P[k]));
            w("##### " + P[k]);
            for (var i = 1; i <= app.project.numItems; i++) {
                var c = app.project.item(i);
                if (!(c instanceof CompItem)) continue;
                var eg = 0; try { eg = c.motionGraphicsTemplateControllerCount; } catch (e) {}
                w("== COMP " + c.name + " dur " + r(c.duration) + " fps " + r(c.frameRate) + " " + c.width + "x" + c.height + " EGP " + eg);
                for (var e2 = 1; e2 <= eg; e2++) { try { w("   EGP: " + c.getMotionGraphicsTemplateControllerName(e2)); } catch (x) {} }
                for (var j = 1; j <= c.numLayers; j++) {
                    var L = c.layer(j), s = "  L" + j + " " + L.name + " [" + kind(L) + "] in " + r(L.inPoint) + " out " + r(L.outPoint) + (L.enabled ? "" : " OFF") + (L.parent ? " parent=" + L.parent.name : "") + (L.hasTrackMatte ? " matte" : "");
                    if (L instanceof TextLayer) {
                        var td = L.property("ADBE Text Properties").property("ADBE Text Document").value;
                        s += " font " + td.font + " " + r(td.fontSize) + " fill " + (td.applyFill ? col(td.fillColor) : "-") + " stroke " + (td.applyStroke ? col(td.strokeColor) + "×" + r(td.strokeWidth) : "-") + " \"" + String(td.text).replace(/[\r\n]/g, "⏎").slice(0, 30) + "\"";
                        var an = L.property("ADBE Text Properties").property("ADBE Text Animators");
                        if (an && an.numProperties) s += " animators " + an.numProperties;
                    }
                    var fx = L.property("ADBE Effect Parade"), fl = [];
                    if (fx) for (var q = 1; q <= fx.numProperties; q++) fl.push(fx.property(q).matchName);
                    if (fl.length) s += " fx " + fl.join(",");
                    var tr = L.property("ADBE Transform Group"), kt = [];
                    for (var t = 1; t <= tr.numProperties; t++) { var tp = tr.property(t); if (tp.numKeys) kt.push(tp.name + tp.numKeys); if (tp.expressionEnabled) kt.push(tp.name + "(식)"); }
                    if (kt.length) s += " tr " + kt.join(",");
                    w(s);
                    var acc = []; colorsIn(L, "", acc);
                    if (acc.length) w("     색: " + acc.slice(0, 12).join(" ; "));
                }
            }
        }
        w("DUMP END");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
