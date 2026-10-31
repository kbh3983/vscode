// 명강의모음 — 채널 "설명,다용도박스"(프리미어 템플릿)를 AE판으로 (make_point.jsx와 같은 방식, 상자는 본문 길이에 맞춰 늘어남)
// 2026-10-31 사용자: "응 5개 AE판으로 만들자, 이 때 프레임 단위로 세세히 분석해서, 싱크로율 100%가 되도록 신경써서 제작하자."
// 실행: cfg_path.txt 에 설정 JSON 경로 → osascript … DoScriptFile <이 파일> (run.py가 make_box로 부름: "script": "make_box.jsx")
// 구성(위→아래): 등장 닦기(조정 레이어, 선형 지우기) / 이름표 글자 / 이름표 바탕 / 위 선 / 아래 선 / 본문 / 검정 상자
// 주의: AE 26은 배열을 문자열에 바로 붙이면 오류 없이 멈춤 → 식 문자열은 숫자만 붙인다 (2026-10-31)
(function () {
    var BASE = "/Users/bbong/dada/vscode/편집자동화/scripts/myeong/ae/";
    function rd(p) { var f = new File(p); f.encoding = "UTF-8"; f.open("r"); var s = f.read(); f.close(); return s; }
    var C = eval("(" + rd(rd(BASE + "cfg_path.txt").replace(/[\r\n]+$/, "")) + ")");
    var log = [];
    function w(s) { log.push(s); var f = new File(C.out + "/result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function c3(a) { return a[0] + "," + a[1] + "," + a[2]; }
    function text(comp, name, T) {
        var ly = comp.layers.addText("x"), st = ly.property("ADBE Text Properties").property("ADBE Text Document"), d = st.value;
        d.resetCharStyle(); d.resetParagraphStyle(); d.font = T.font; d.fontSize = T.size; d.applyFill = true; d.fillColor = T.color; d.applyStroke = !!T.stroke_w; if (T.stroke_w) { d.strokeColor = T.color; d.strokeWidth = T.stroke_w; d.strokeOverFill = false; }   // 프리미어가 글자를 조금 더 굵게 그림
        d.tracking = T.tracking || 0; d.justification = ParagraphJustification.LEFT_JUSTIFY;
        if (T.leading) { d.autoLeading = false; d.leading = T.leading; }
        d.text = T.text; st.setValue(d);
        ly.property("ADBE Transform Group").property("ADBE Position").setValue(T.pos);
        if (T.scale) ly.property("ADBE Transform Group").property("ADBE Scale").setValue([T.scale, T.scale]);   // 원본처럼 작은 글자를 키움 (프리미어 텍스트 비율 조정 120.4%)
        if (T.egp) st.addToMotionGraphicsTemplateAs(comp, T.egp);
        ly.name = name; return ly;
    }
    // 모양 레이어 사각형: 왼·위·오른·아래 경계를 식으로 (comp 좌표)
    function rect(comp, name, color, opacity, L, T, R, B) {
        var sl = comp.layers.addShape(); sl.name = name;
        sl.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
        sl.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
        var g = sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var v = g.property("ADBE Vectors Group");
        v.addProperty("ADBE Vector Shape - Rect");
        var f = v.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue(color);
        var r = sl.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property("ADBE Vector Shape - Rect");   // 속성을 더하면 앞서 받은 참조가 끊김 → 다시 찾기
        var pre = 'var b=thisComp.layer("본문"),rb=b.sourceRectAtTime(time,false),bR=b.toComp([rb.left+rb.width,0])[0],bB=b.toComp([0,rb.top+rb.height])[1];' +
                  'var l=thisComp.layer("이름표"),rl=l.sourceRectAtTime(time,false),lR=l.toComp([rl.left+rl.width,0])[0];' +
                  'var x0=' + L + ',y0=' + T + ',x1=' + R + ',y1=' + B + ';';
        r.property("ADBE Vector Rect Size").expression = pre + '[x1-x0,y1-y0]';
        r.property("ADBE Vector Rect Position").expression = pre + '[(x0+x1)/2,(y0+y1)/2]';
        sl.property("ADBE Transform Group").property("ADBE Opacity").setValue(opacity);
        return sl;
    }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        app.newProject();
        var fps = C.fps, dur = C.dur_frames / fps;
        var comp = app.project.items.addComp(C.name, 1920, 1080, 1, dur, fps);
        var P = C.pad;
        // 아래부터: 상자 → 본문 → 선 → 이름표 바탕 → 이름표 → 닦기
        // 식이 참조하는 글자 레이어를 먼저 만듦 (나중에 만들면 식이 꺼짐 — 2026-10-27)
        var bodyL = text(comp, "본문", C.body);
        var lab = text(comp, "이름표", C.label);
        var box = rect(comp, "검정 상자", [0, 0, 0], C.box_opacity, P.box_l, P.box_t, "bR+" + P.box_r, "bB+" + P.box_b); box.moveAfter(bodyL);
        var lb = rect(comp, "이름표 바탕", C.label_bg, 100, P.lab_l, P.lab_t, "lR+" + P.lab_r, P.lab_b); lb.moveAfter(lab);
        var tl = rect(comp, "위 선", [1, 1, 1], 100, "lR+" + P.lab_r + "+" + P.top_gap, P.top_t, "bR+" + P.top_r, P.top_b); tl.moveAfter(lb);
        var bl = rect(comp, "아래 선", [1, 1, 1], 100, P.bot_l, "bB+" + P.bot_t, "bR+" + P.bot_r, "bB+" + P.bot_b); bl.moveAfter(tl);
        var rb = bodyL.sourceRectAtTime(1, false), rl = lab.sourceRectAtTime(1, false);
        w("body rect " + rb.left + " " + rb.top + " " + rb.width + " " + rb.height + " / label rect " + rl.left + " " + rl.top + " " + rl.width + " " + rl.height);
        // 등장: 왼→오 닦기 (프레임마다 오른쪽 경계 x, 원본 측정) — 조정 레이어의 선형 지우기
        var adj = comp.layers.addSolid([1, 1, 1], "등장 닦기", 1920, 1080, 1, dur); adj.adjustmentLayer = true;
        var lw = adj.property("ADBE Effect Parade").addProperty("ADBE Linear Wipe");
        lw.property(2).setValue(C.wipe.angle); lw.property(3).setValue(C.wipe.feather);
        var cp = lw.property(1);
        for (var k = 0; k < C.wipe.completion.length; k++) { var cv = C.wipe.completion[k]; if (cv > 0 && cv < 100) cv = Math.min(100, cv + (C.wipe.offset_px || 0) / 19.2); cp.setValueAtTime(k / fps, cv); }   // offset_px: 경계를 왼쪽으로 (부드러운 가장자리 가운데 맞춤)
        for (var k2 = 1; k2 <= cp.numKeys; k2++) cp.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.HOLD);
        w("built " + comp.numLayers);
        if (C.render) {
            var dir = new Folder(C.out + "/ae"); if (!dir.exists) dir.create();
            var rq = app.project.renderQueue.items.add(comp);
            if (C.render_range) { rq.timeSpanStart = (C.render_range[0] + 0.01) * comp.frameDuration; rq.timeSpanDuration = C.render_range[1] * comp.frameDuration; }   // /fps로 주면 1프레임이 0프레임으로 반올림됨 (2026-10-31)
            var om = rq.outputModule(1); om.applyTemplate("알파가 포함된 TIFF 시퀀스");
            om.file = new File(C.out + "/ae/f[###].tif");
            app.project.renderQueue.render();
            w("rendered " + dir.getFiles("*.tif").length);
        }
        app.project.save(new File(C.out + "/" + C.name + ".aep"));
        if (C.export_mogrt) {
            var md = new Folder(C.out + "/mogrt"); if (!md.exists) md.create();
            var oldm = md.getFiles("*.mogrt"); for (var q = 0; q < oldm.length; q++) oldm[q].remove();
            comp.motionGraphicsTemplateName = C.display;
            w("mogrt " + comp.exportAsMotionGraphicsTemplate(true, md.fsName) + " " + md.getFiles("*.mogrt").length);
        }
        app.endSuppressDialogs(false);
    } catch (e) { w("ERR " + e.toString() + " line " + e.line); }
})();
