// 명강의모음 — 채널 포인트 자막(프리미어 템플릿)을 AE판으로 다시 만들기 (agents/포인트/playbook_AE변환.md 방식)
// 2026-10-31 사용자: "응 5개 AE판으로 만들자, 이 때 프레임 단위로 세세히 분석해서, 싱크로율 100%가 되도록 신경써서 제작하자."
// 설정: CFG 파일(JSON) 경로를 /Users/bbong/dada/vscode/편집자동화/scripts/myeong/ae/cfg_path.txt 에 한 줄로 → 실행:
//   osascript -e 'tell application "Adobe After Effects 2026" to DoScriptFile "<이 파일>"'
// CFG: { name, out, dur_frames, fps, layers:[...], group:{dy:[프레임별], opacity:[프레임별]}, render:true, export_mogrt:false }
// 결과: <out>/result.txt, <out>/ae/fNN.png (렌더), export_mogrt면 <out>/mogrt/
(function () {
    var BASE = "/Users/bbong/dada/vscode/편집자동화/scripts/myeong/ae/";
    function rd(p) { var f = new File(p); f.encoding = "UTF-8"; f.open("r"); var s = f.read(); f.close(); return s; }
    var cfgPath = rd(BASE + "cfg_path.txt").replace(/[\r\n]+$/, "");
    var C = eval("(" + rd(cfgPath) + ")");
    var log = [];
    function w(s) { log.push(s); var f = new File(C.out + "/result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        app.newProject();
        w("start");
        var fps = C.fps, dur = C.dur_frames / fps;
        var comp = app.project.items.addComp(C.name, 1920, 1080, 1, dur, fps);
        var grp = comp.layers.addNull(dur); grp.name = "그룹"; grp.enabled = false;
        grp.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([50, 50]);   // 널 기본 100x100 → 기준점 가운데
        grp.property("ADBE Transform Group").property("ADBE Position").setValue([960, 540]);
        var made = [];
        for (var i = C.layers.length - 1; i >= 0; i--) {   // 아래 레이어부터 (나중에 만든 것이 위)
            var L = C.layers[i], ly;
            if (L.type == "gradient") {
                ly = comp.layers.addSolid([0, 0, 0], L.name, 1920, L.h, 1, dur);
                ly.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
                ly.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
                var ramp = ly.property("ADBE Effect Parade").addProperty("ADBE Ramp");
                ramp.property(1).setValue(L.start); ramp.property(2).setValue([0, 0, 0, 1]);
                ramp.property(3).setValue(L.end); ramp.property(4).setValue([1, 1, 1, 1]); ramp.property(5).setValue(1);
                var sh = ly.property("ADBE Effect Parade").addProperty("ADBE Shift Channels");
                // 알파 ← 밝기, 빨강·초록·파랑 ← 끔(0)
                sh.property(1).setValue(L.alpha_from || 5); sh.property(2).setValue(L.rgb_from || 10); sh.property(3).setValue(L.rgb_from || 10); sh.property(4).setValue(L.rgb_from || 10);
            } else if (L.type == "text") {
                w("text " + L.name); ly = comp.layers.addText(L.text);
                var st = ly.property("ADBE Text Properties").property("ADBE Text Document");
                var d = st.value;
                d.resetCharStyle(); d.resetParagraphStyle();
                d.font = L.font; d.fontSize = L.size; d.applyFill = true; d.fillColor = L.color; d.applyStroke = !!L.stroke_w; if (L.stroke_w) { d.strokeColor = L.color; d.strokeWidth = L.stroke_w; d.strokeOverFill = false; }   // 프리미어가 조금 더 굵게 그림 → 같은 색 얇은 테두리로 맞춤
                d.tracking = L.tracking || 0; d.justification = L.justify == "center" ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
                if (L.leading) { d.autoLeading = false; d.leading = L.leading; }
                if (L.faux_italic) d.fauxItalic = true;
                w("set font"); st.setValue(d); w("doc ok");
                if (L.runs) {   // 글자 묶음별 색 [[시작, 끝(포함 안 함), [r,g,b]], ...]
                    d = st.value;
                    for (var r = 0; r < L.runs.length; r++) { var cr = d.characterRange(L.runs[r][0], L.runs[r][1]); cr.fillColor = L.runs[r][2]; if (L.stroke_w) cr.strokeColor = L.runs[r][2]; }
                    st.setValue(d);
                }
                if (L.markup) {   // 문구 안 표시 → 그 글자만 색·폰트 바꾸고 괄호는 지움 (2026-10-31 — 템플릿 문구만 바꿔도 단어별 꾸밈 유지)
                    // 표시: C.markup_colors {"{":"r,g,b","[":"r,g,b"} (포인트 자막 색) 또는 L.markup_fonts {"{":"폰트"} (중앙 자막 굵게)
                    var MP = [], cl = { "{": "}", "[": "]" };
                    var MC = C.markup_colors || {}, MF = L.markup_fonts || {};
                    for (var mk in cl) { if (MC[mk] && !L.markup_fonts) MP.push('"' + mk + '":{c:[' + MC[mk] + ']}'); else if (MF[mk]) MP.push('"' + mk + '":{f:"' + MF[mk] + '"}'); }
                    st.expression = 'var M={' + MP.join(",") + '},E={"}":1,"]":1};var s=value.toString(),out="",sp=[],cur=null;' +
                        'for(var i=0;i<s.length;i++){var ch=s[i];if(M[ch]){cur=M[ch];continue;}if(E[ch]){cur=null;continue;}if(cur)sp.push([out.length,cur]);out+=ch;}' +
                        'var r=style.setText(out);for(var k=0;k<sp.length;k++){var q=sp[k][1];if(q.c)r=r.setFillColor(q.c,sp[k][0],1);if(q.f)r=r.setFont(q.f,sp[k][0],1);}r;';
                    d = st.value; d.text = L.markup; st.setValue(d);
                }
                if (L.egp) { st.addToMotionGraphicsTemplateAs(comp, L.egp); }   // 기본 그래픽 패널 문구 칸
                ly.property("ADBE Transform Group").property("ADBE Position").setValue(L.pos);
                if (L.blur) {   // 프리미어 글자 가장자리가 조금 더 부드러움 → 아주 약한 흐림
                    var gb = ly.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
                    gb.property(1).setValue(L.blur); gb.property(3).setValue(1);   // 가장자리 픽셀 반복
                }
                if (L.shadow) {
                    var ds = ly.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
                    ds.property(1).setValue([0, 0, 0, 1]); ds.property(2).setValue(L.shadow.opacity * 2.55);   // 0~255 값 (화면 %)
                    ds.property(3).setValue(L.shadow.direction); ds.property(4).setValue(L.shadow.distance); ds.property(5).setValue(L.shadow.softness);
                    w("shadow opacity value " + ds.property(2).value + " max " + ds.property(2).maxValue);
                }
            }
            ly.name = L.name; w("layer " + L.name);
            made.push(ly);
            var SL = L.type == "text" ? (L.shadows || (L.shadow2 ? [L.shadow2] : [])) : [];
            var above = ly;
            for (var si = 0; si < SL.length; si++) {   // 그림자 레이어(위→아래 순): 글자 복제 → 테두리로 퍼짐 → 흐림 → 이동·불투명도·색 (명조·중앙, 2026-10-31)
                var S2 = SL[si], sl = comp.layers.addText("x");
                var sst = sl.property("ADBE Text Properties").property("ADBE Text Document");
                var sc = S2.color || [0, 0, 0]; if (S2.gray) sc = [sc[0], sc[0], sc[0]]; var scs = sc.join(",");   // 배열을 문자열에 바로 붙이면 AE 26이 오류 없이 스크립트를 멈춤 → join (2026-10-31)
                var sd = sst.value; sd.resetCharStyle(); sd.font = L.font; sd.fontSize = L.size; sd.applyFill = true; sd.fillColor = sc;
                sd.tracking = L.tracking || 0; if (L.leading) { sd.autoLeading = false; sd.leading = L.leading; }
                sd.applyStroke = S2.spread > 0; if (S2.spread > 0) { sd.strokeColor = sc; sd.strokeWidth = S2.spread * 2; sd.strokeOverFill = false; }
                sd.justification = L.justify == "center" ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
                if (L.faux_italic) sd.fauxItalic = true;
                sst.setValue(sd);
                // 문구·굵기는 글자 레이어를 따라감 (괄호 표시를 지운 결과)
                var EX = 'var s=thisComp.layer("' + L.name + '").text.sourceText; var r=s.style.setText(s.toString()).setFillColor([' + scs + ']).setApplyStroke(' + (S2.spread > 0) + ')' + (S2.spread > 0 ? '.setStrokeColor([' + scs + ']).setStrokeWidth(' + (S2.spread * 2) + ')' : '') + '; r'; sst.expression = EX;
                sl.property("ADBE Transform Group").property("ADBE Position").setValue([L.pos[0] + S2.dx, L.pos[1] + S2.dy]);
                sl.property("ADBE Transform Group").property("ADBE Opacity").setValue(S2.opacity);
                if (S2.box) { var bb2 = sl.property("ADBE Effect Parade").addProperty("ADBE Box Blur2"); bb2.property(1).setValue(S2.box); bb2.property(2).setValue(S2.iter || 3); bb2.property(4).setValue(0); }   // 상자 흐림 — 끝이 유한하게 떨어짐
                else if (S2.blur) { var gb2 = sl.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2"); gb2.property(1).setValue(S2.blur); gb2.property(3).setValue(0); }   // 가장자리 반복 켜면 글자 영역에서 잘려 사각 경계 (2026-10-31)
                sl.name = L.name + " 그림자" + (si + 1); sl.moveAfter(above); above = sl;
                made.push(sl); w("shadow " + sl.name + " err[" + sst.expressionError + "]");
            }
        }
        for (var m = 0; m < made.length; m++) made[m].parent = grp;
        // 위치: 프레임마다 정지 키 (원본 측정값 — 프리미어는 정수 픽셀로 움직임)
        var gp = grp.property("ADBE Transform Group").property("ADBE Position");
        for (var k = 0; k < C.group.dy.length; k++) {
            gp.setValueAtTime(k / fps, [960, 540 + C.group.dy[k]]);
        }
        for (var k2 = 1; k2 <= gp.numKeys; k2++) { gp.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.HOLD); }
        // 불투명도: 맨 위 조정 레이어의 변형 효과 → 전체를 한 덩어리로 (프리미어 그래픽 전체에 건 변형과 같음)
        var adj = comp.layers.addSolid([1, 1, 1], "전체 불투명도", 1920, 1080, 1, dur); adj.adjustmentLayer = true;
        var tf = adj.property("ADBE Effect Parade").addProperty("ADBE Geometry2");
        var op = tf.property(9);
        for (var k3 = 0; k3 < C.group.opacity.length; k3++) op.setValueAtTime(k3 / fps, C.group.opacity[k3]);
        for (var k4 = 1; k4 <= op.numKeys; k4++) op.setInterpolationTypeAtKey(k4, KeyframeInterpolationType.HOLD);
        if (C.group.blur) {   // 전체 흐림 (중앙 포인트 자막: 프리미어 그래픽 전체에 가우시안 흐림 86→0) — 프레임마다 정지 키
            var gbl = adj.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2"); gbl.property(3).setValue(1);
            for (var k5 = 0; k5 < C.group.blur.length; k5++) gbl.property(1).setValueAtTime(k5 / fps, C.group.blur[k5]);
            for (var k6 = 1; k6 <= gbl.property(1).numKeys; k6++) gbl.property(1).setInterpolationTypeAtKey(k6, KeyframeInterpolationType.HOLD);
        }
        w("built " + comp.name + " layers " + comp.numLayers);
        if (C.render) {
            var dir = new Folder(C.out + "/ae"); if (!dir.exists) dir.create();
            var old = dir.getFiles("*.tif"); for (var o = 0; o < old.length; o++) old[o].remove();
            var rq = app.project.renderQueue.items.add(comp);
            if (C.render_range) { rq.timeSpanStart = (C.render_range[0] + 0.01) * comp.frameDuration; rq.timeSpanDuration = C.render_range[1] * comp.frameDuration; }   // /fps로 주면 1프레임이 0프레임으로 반올림됨 (2026-10-31)   // 시험: [시작 프레임, 프레임 수]
            var om = rq.outputModule(1);
            om.applyTemplate("알파가 포함된 TIFF 시퀀스");   // 한국어 AE — setSettings 영문 키는 멈춤 (2026-10-31)
            om.file = new File(C.out + "/ae/f[###].tif");
            app.project.renderQueue.render();
            w("rendered " + dir.getFiles("*.tif").length);
        }
        app.project.save(new File(C.out + "/" + C.name + ".aep"));   // 저장 안 된 프로젝트면 내보내기 때 저장 창이 떠 멈춤 (2026-10-27)
        if (C.export_mogrt) {
            var md = new Folder(C.out + "/mogrt"); if (!md.exists) md.create();
            var oldm = md.getFiles("*.mogrt"); for (var q = 0; q < oldm.length; q++) oldm[q].remove();
            comp.motionGraphicsTemplateName = C.display;
            var ok = comp.exportAsMotionGraphicsTemplate(true, md.fsName);
            w("mogrt " + ok + " " + md.getFiles("*.mogrt").length);
        }
        app.endSuppressDialogs(false);
    } catch (e) { w("ERR " + e.toString() + " line " + e.line); }   // 객체를 바로 붙이면 AE 26이 오류 창을 띄우고 멈춤
})();
