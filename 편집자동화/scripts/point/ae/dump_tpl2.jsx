// 포인트 에이전트 — 템플릿 키프레임(시간·값)·식 덤프 (2026-10-13 길이·색·2줄 조절 정리 전 조사). 수정 안 함
(function () {
    var R = "C:\\DADA\\9.AI\\vscode\\편집자동화\\";
    var LOG = R + "work\\포인트\\ae_templates\\dump_tpl2.txt";
    var P = ["work\\포인트\\ae_templates\\05_실망\\05_실망_AE.aep", "work\\포인트\\ae_templates\\08_분노\\08_분노_AE.aep",
             "work\\포인트\\ae_templates\\10_분노\\10_분노_AE.aep", "work\\포인트\\ae_templates\\봄03\\봄03_AE.aep",
             "work\\포인트\\ae_templates\\봄04\\봄04_AE.aep", "work\\포인트\\ae_templates\\봄06\\봄06_AE.aep",
             "work\\포인트\\ae_templates\\봄12\\봄12_AE.aep", "work\\포인트\\ae_templates\\봄13\\봄13_AE.aep",
             "work\\회고\\tpl\\ae\\info4.aep", "work\\회고\\목교정기\\tpl\\ae\\info2.aep", "work\\회고\\자세교정\\tpl\\ae\\sum2.aep"];
    var out = [];
    function w(s) { out.push(s); }
    function fl() { var f = new File(LOG); f.encoding = "UTF-8"; f.open("w"); f.write(out.join("\n")); f.close(); }
    function r(v) { if (v instanceof Array) { var a = []; for (var i = 0; i < v.length; i++) a.push(Math.round(v[i] * 100) / 100); return "[" + a.join(",") + "]"; } return typeof v == "number" ? Math.round(v * 1000) / 1000 : String(v).slice(0, 20); }
    function walk(g, path) {
        for (var i = 1; i <= g.numProperties; i++) {
            var p = g.property(i), nm = path + "/" + p.name;
            if (p.propertyType == PropertyType.PROPERTY) {
                if (p.expressionEnabled && p.expression) w("     식 " + nm + ": " + p.expression.replace(/[\r\n]+/g, " ⏎ "));
                if (p.numKeys) {
                    var ks = [];
                    for (var k = 1; k <= p.numKeys; k++) { var v = ""; try { v = r(p.keyValue(k)); } catch (e) { v = "?"; } ks.push(r(p.keyTime(k)) + "s=" + v); }
                    w("     키 " + nm + " (" + p.numKeys + "): " + (ks.length > 8 ? ks.slice(0, 3).join(" ") + " … " + ks.slice(-3).join(" ") : ks.join(" ")));
                }
            } else if (p.numProperties) walk(p, nm);
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
                w("== COMP " + c.name + " dur " + r(c.duration));
                for (var j = 1; j <= c.numLayers; j++) { w("  L" + j + " " + c.layer(j).name); walk(c.layer(j), ""); }
            }
            fl();
        }
        w("DUMP2 END"); fl();
    } catch (e) { w("ERR " + e.message + " line " + e.line); fl(); }
})();
