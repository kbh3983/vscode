// 포인트 에이전트 — 프리미어 템플릿 "10_분노 화나는 모션자막" → 애프터이펙트 템플릿 (playbook_AE변환.md)
// 원본 측정 (work/포인트/ae_templates/10_분노/pr_NN.png, 29.97fps, 2.002초):
//   - 0~6프레임(0.2초): 300% → 100% 크기로 줄어듦 (원본 "변형" 높이 비율 키 300→100, 셔터 120° 모션 블러)
//   - 그 뒤 문구 전체가 함께 흔들림 (단어끼리 상관 1.0): 중심 표준편차 x 3.2 / y 3.1px, 앞 프레임과 상관 ~0.37
//   - 채움 그라데이션 위 (228,169,124) → 아래 (185,1,1), 검은 테두리 ~5px + 흰 바깥 테두리 ~4px + 회색 그림자
//   - 최종 상자 x 351~1556, y 881~1000. 원본 폰트 JSArirangHON 대신 페이퍼로지 7Bold
(function () {
    var OUT_DIR = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\포인트\\ae_templates\\10_분노";
    var EXPORT_DIR = OUT_DIR + "\\export";
    var FPS = 29.97, FR = 1 / FPS;
    // 3차: 흔들림 2.7→3.2·상관 0.25→0.37 (15/초, 6.6), 그라데이션 끝 0.86·위 색 밝게. 2차: 프레임별 높이 비율(원본/새 것)로 크기 키 보정, 폭 46px 넓힘(자간 93), 흔들림 4.0→3.2·상관 0.73→0.37 맞춤(20/초, 5.8)
    var P = { size: 92, track: 93, x: 953, y: 941, black: 10, white: 18,
              scale: [300, 284, 214, 173, 137, 112, 100], wigF: 15, wigA: 6.6, rampEnd: 0.86 };
    var log = [];
    function w(s) { log.push(s); }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        app.newProject();
        var comp = app.project.items.addComp("분노_화나는2_AE", 1920, 1080, 1, 2.002, FPS);
        comp.motionBlur = true; comp.shutterAngle = 120;

        // 조절용 널: 크기 줄어듦 + 전체 흔들림. 모든 레이어가 이 널을 부모로 둔다
        var N = comp.layers.addNull(); N.name = "조절";
        var tN = N.property("ADBE Transform Group");
        tN.property("ADBE Anchor Point").setValue([50, 50]);
        tN.property("ADBE Position").setValue([P.x, P.y]);
        tN.property("ADBE Position").expression = "var t=Math.max(0,time-" + (6 * FR) + "); value + (time<" + (6 * FR) + "?[0,0]:wiggle(" + P.wigF + "," + P.wigA + ",1,0.5,t+thisComp.frameDuration*6)-value)";
        var sc = tN.property("ADBE Scale");
        for (var k = 0; k < P.scale.length; k++) sc.setValueAtTime(k * FR, [P.scale[k], P.scale[k]]);
        for (var h = 1; h <= sc.numKeys; h++) sc.setInterpolationTypeAtKey(h, KeyframeInterpolationType.LINEAR);

        function textLayer(name) {
            var T = comp.layers.addText("분노, 화나는 모션자막 템플릿");
            T.name = name;
            var tr = T.property("ADBE Transform Group");
            tr.property("ADBE Anchor Point").expression = "var r=sourceRectAtTime(0,false);[r.left+r.width/2, r.top+r.height/2]";
            T.parent = N;   // 부모를 붙이면 AE가 널의 300% 크기를 상쇄하려고 자식 크기를 33%로 바꿈 → 100%로 되돌림
            tr.property("ADBE Position").setValue([50, 50]);
            tr.property("ADBE Scale").setValue([100, 100]);
            T.motionBlur = true;
            return T;
        }
        // 위: 문구 (그라데이션 매트 원본)
        var L = textLayer("자막");
        var st = L.property("ADBE Text Properties").property("ADBE Text Document");
        var td = st.value;
        td.font = "Paperlogy-7Bold"; td.fontSize = P.size; td.tracking = P.track;
        td.fillColor = [1, 1, 1]; td.applyFill = true; td.applyStroke = false;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        st.setValue(td);
        w("font=" + st.value.font);
        // 아래: 검은 테두리, 그 아래 흰 바깥 테두리 + 회색 그림자 (문구·폰트는 "자막"을 따라감)
        function outline(name, col, width, after) {
            var T = textLayer(name);
            T.property("ADBE Text Properties").property("ADBE Text Document").expression =
                "var s=thisComp.layer(\"자막\").text.sourceText; s.style.setText(s.value).setFillColor([" + col + "]).setApplyStroke(true).setStrokeColor([" + col + "]).setStrokeWidth(" + width + ")";
            T.moveAfter(after);
            return T;
        }
        var B = outline("검은 테두리", "0.02,0.02,0.02", P.black, L);
        var Wt = outline("흰 테두리", "1,1,1", P.white, B);
        var ds = Wt.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
        ds.property("ADBE Drop Shadow-0001").setValue([0.4, 0.4, 0.4]);
        ds.property("ADBE Drop Shadow-0002").setValue(60 * 2.55);
        ds.property("ADBE Drop Shadow-0003").setValue(135);
        ds.property("ADBE Drop Shadow-0004").setValue(6);
        ds.property("ADBE Drop Shadow-0005").setValue(4);

        // 맨 위: 그라데이션 판 (위 살구 → 아래 빨강), "자막" 알파 매트
        var G = comp.layers.addSolid([1, 1, 1], "그라데이션", 1920, 1080, 1, 2.002);
        G.moveBefore(L);
        var ramp = G.property("ADBE Effect Parade").addProperty("ADBE Ramp");
        ramp.property(1).expression = "var L=thisComp.layer(\"자막\"); var r=L.sourceRectAtTime(time,false); fromComp(L.toComp([r.left+r.width/2, r.top]))";
        ramp.property(2).setValue([240 / 255, 188 / 255, 138 / 255]);
        ramp.property(3).expression = "var L=thisComp.layer(\"자막\"); var r=L.sourceRectAtTime(time,false); fromComp(L.toComp([r.left+r.width/2, r.top+r.height*" + P.rampEnd + "]))";  // 원본은 글자 높이 ~3/4에서 이미 빨강
        ramp.property(4).setValue([180 / 255, 0, 0]);
        G.setTrackMatte(L, TrackMatteType.ALPHA);
        G.motionBlur = true;
        w("layers=" + comp.numLayers);

        comp.motionGraphicTemplateName = "분노_화나는2_AE";
        w("addToMGT=" + st.addToMotionGraphicsTemplateAs(comp, "자막 텍스트"));
        app.project.save(new File(OUT_DIR + "\\10_분노_AE.aep"));
        new Folder(EXPORT_DIR).create();
        w("export=" + comp.exportAsMotionGraphicsTemplate(true, EXPORT_DIR));
    } catch (e) {
        w("ERROR line " + e.line + ": " + e.toString());
    }
    var f = new File(OUT_DIR + "\\result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close();
    app.endSuppressDialogs(false);
})();
