// 썸네일 PSD 조립 — layers.py가 내보낸 레이어 PNG + texts.json → 레이어 PSD (글자는 포토샵 텍스트 레이어)
// 사용: var DIR="<레이어 폴더>"; var OUT="<저장할 .psd>"; var PREVIEW="<확인용 .png 또는 ''>"; $.evalFile("<이 파일>"); → BUILD_RESULT
var BUILD_RESULT = "";
(function () {
    app.displayDialogs = DialogModes.NO;
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits = TypeUnits.PIXELS;
    function readText(p) { var f = new File(p); f.encoding = "UTF-8"; f.open("r"); var s = f.read(); f.close(); return s; }
    var meta = eval("(" + readText(DIR + "/texts.json") + ")");
    var c = function (s) { return charIDToTypeID(s); }, sid = function (s) { return stringIDToTypeID(s); };

    // 바탕 사진
    var doc = app.open(new File(DIR + "/" + meta.layers[0].file));
    if (doc.resolution != 72) doc.resizeImage(undefined, undefined, 72, ResampleMethod.NONE);
    var bg = doc.activeLayer;
    if (bg.isBackgroundLayer) bg.isBackgroundLayer = false;
    bg.name = meta.layers[0].name;
    // 그래픽 레이어 (아래에서 위로)
    for (var i = 1; i < meta.layers.length; i++) {
        var m = meta.layers[i];
        var d2 = app.open(new File(DIR + "/" + m.file));
        d2.activeLayer.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
        d2.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = doc;
        var L = doc.layers[0];
        L.name = m.name;
        if (m.blend == "screen") L.blendMode = BlendMode.SCREEN;
    }

    function rgb(a) { var d = new ActionDescriptor(); d.putDouble(c("Rd  "), a[0]); d.putDouble(c("Grn "), a[1]); d.putDouble(c("Bl  "), a[2]); return d; }

    function makeText(t) {
        var full = "", ranges = [];
        for (var k = 0; k < t.runs.length; k++) { ranges.push([full.length, full.length + t.runs[k][0].length, t.runs[k][1]]); full += t.runs[k][0]; }
        var d = new ActionDescriptor(); var r = new ActionReference(); r.putClass(c("TxLr")); d.putReference(c("null"), r);
        var tx = new ActionDescriptor();
        tx.putString(c("Txt "), full);
        var p = new ActionDescriptor(); p.putUnitDouble(c("Hrzn"), c("#Pxl"), t.bbox[0]); p.putUnitDouble(c("Vrtc"), c("#Pxl"), t.bbox[3]);
        tx.putObject(c("TxtC"), c("Pnt "), p);
        var list = new ActionList();
        for (var k = 0; k < ranges.length; k++) {
            var rg = new ActionDescriptor(); rg.putInteger(c("From"), ranges[k][0]); rg.putInteger(c("T   "), ranges[k][1]);
            var st = new ActionDescriptor();
            st.putString(sid("fontPostScriptName"), t.font);
            st.putUnitDouble(c("Sz  "), c("#Pnt"), t.size);
            st.putInteger(sid("tracking"), t.track || 0);
            st.putBoolean(sid("syntheticItalic"), !!t.italic);
            st.putBoolean(sid("autoLeading"), true);
            st.putObject(c("Clr "), c("RGBC"), rgb(ranges[k][2]));
            rg.putObject(c("TxtS"), c("TxtS"), st);
            list.putObject(c("Txtt"), rg);
        }
        tx.putList(c("Txtt"), list);
        d.putObject(c("Usng"), c("TxLr"), tx);
        executeAction(c("Mk  "), d, DialogModes.NO);
        return doc.activeLayer;
    }

    function bnd(L) { var b; try { b = L.boundsNoEffects; } catch (e) { b = L.bounds; } return [b[0].as("px"), b[1].as("px"), b[2].as("px"), b[3].as("px")]; }

    function setFx(t) {
        var d = new ActionDescriptor(); var r = new ActionReference();
        r.putProperty(c("Prpr"), c("Lefx")); r.putEnumerated(c("Lyr "), c("Ordn"), c("Trgt")); d.putReference(c("null"), r);
        var fx = new ActionDescriptor(); fx.putUnitDouble(c("Scl "), c("#Prc"), 100);
        if (t.shadow) {
            var s = new ActionDescriptor();
            s.putBoolean(c("enab"), true); s.putEnumerated(c("Md  "), c("BlnM"), c("Mltp"));
            s.putObject(c("Clr "), c("RGBC"), rgb([0, 0, 0]));
            s.putUnitDouble(c("Opct"), c("#Prc"), t.shadow.opacity); s.putBoolean(c("uglg"), false);
            s.putUnitDouble(c("lagl"), c("#Ang"), 90); s.putUnitDouble(c("Dstn"), c("#Pxl"), 0);
            s.putUnitDouble(c("Ckmt"), c("#Prc"), t.shadow.spread); s.putUnitDouble(c("blur"), c("#Pxl"), t.shadow.size);
            fx.putObject(c("DrSh"), c("DrSh"), s);
        }
        if (t.stroke) {
            var k = new ActionDescriptor();
            k.putBoolean(c("enab"), true); k.putEnumerated(c("Styl"), c("FStl"), c("OutF"));
            k.putEnumerated(c("PntT"), c("FrFl"), c("SClr")); k.putEnumerated(c("Md  "), c("BlnM"), c("Nrml"));
            k.putUnitDouble(c("Opct"), c("#Prc"), 100); k.putUnitDouble(c("Sz  "), c("#Pxl"), t.stroke.size);
            k.putObject(c("Clr "), c("RGBC"), rgb(t.stroke.color));
            fx.putObject(c("FrFX"), c("FrFX"), k);
        }
        d.putObject(c("T   "), c("Lefx"), fx);
        executeAction(c("setd"), d, DialogModes.NO);
    }

    var log = [];
    for (var i = 0; i < meta.texts.length; i++) {
        var t = meta.texts[i];
        app.activeDocument = doc; doc.activeLayer = doc.layers[0];
        var L = makeText(t);
        // 폭을 목표에 맞추고(크기 비율) 위치 맞춤 — 두 번
        for (var it = 0; it < 2; it++) {
            var b = bnd(L), tw = t.bbox[2] - t.bbox[0], cw = b[2] - b[0];
            if (cw > 0 && Math.abs(cw - tw) > 3) L.textItem.size = new UnitValue(L.textItem.size.as("px") * tw / cw, "px");
            b = bnd(L);
            L.translate((t.bbox[0] + t.bbox[2]) / 2 - (b[0] + b[2]) / 2, (t.bbox[1] + t.bbox[3]) / 2 - (b[1] + b[3]) / 2);
        }
        if (t.rotate) L.rotate(-t.rotate, AnchorPosition.MIDDLECENTER);
        if (t.shadow || t.stroke) setFx(t);
        L.name = t.name;
        var b = bnd(L);
        log.push(t.name + " " + Math.round(b[0]) + "," + Math.round(b[1]) + " (목표 " + Math.round(t.bbox[0]) + "," + Math.round(t.bbox[1]) + ")");
    }
    var so = new PhotoshopSaveOptions(); so.layers = true; so.embedColorProfile = true;
    doc.saveAs(new File(OUT), so, true);
    if (PREVIEW) { var po = new PNGSaveOptions(); doc.saveAs(new File(PREVIEW), po, true); }
    doc.close(SaveOptions.DONOTSAVECHANGES);
    BUILD_RESULT = "ok | " + log.join(" / ");
})();
