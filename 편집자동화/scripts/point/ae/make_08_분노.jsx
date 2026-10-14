// 포인트 에이전트 — 프리미어 템플릿 "08_분노 화나는 모션자막" → 애프터이펙트 템플릿 (playbook_AE변환.md)
// 실행: AfterFX.exe -r <ASCII 경로 사본>. 결과 OUT_DIR\result.txt, 내보내기 OUT_DIR\export → finish_mogrt.py
// 원본 측정 (work/포인트/ae_templates/08_분노/pr_NN.png, 29.97fps, 2.002초):
//   - 처음부터 100% (나타나는 효과 없음), 빨강 채움 (245,0,0) + 검은 거친 테두리
//   - 띄어쓰기로 나뉜 단어마다 따로 매 프레임 흔들림 (플러그인 "Wiggle", 단어 단위): 단어 중심 가로·세로 표준편차 ~3.3px, 최대 ~9px,
//     바로 앞 프레임과 상관 ~0.4, 단어끼리는 따로 움직임
//   - 글자 상자 x 341~1565 (폭 ~1224), y 870~995
//   - 원본 폰트 BMEuljiro10yearslaterOTF 대신 페이퍼로지 7Bold
(function () {
    var OUT_DIR = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\포인트\\ae_templates\\08_분노";
    var EXPORT_DIR = OUT_DIR + "\\export";
    var FPS = 29.97;
    var P = { size: 100, track: 44, vscale: 1.09, x: 953, y: 930, stroke: 7.5, wigAmt: 8, wigFreq: 13, rough: 3 };  // 5차: 테두리 7.5 (어두운/빨강 비율 9px 0.71, 6px 0.49 → 원본 0.59)
    var log = [];
    function w(s) { log.push(s); }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);  // 이전 임시 프로젝트 저장 창이 뜨면 스크립트가 멈춤
        app.newProject();
        var comp = app.project.items.addComp("분노_화나는_AE", 1920, 1080, 1, 2.002, FPS);
        var L = comp.layers.addText("분노, 화나는 모션자막 템플릿");
        L.name = "자막";
        var st = L.property("ADBE Text Properties").property("ADBE Text Document");
        var td = st.value;
        td.font = "Paperlogy-7Bold"; td.fontSize = P.size; td.tracking = P.track; td.verticalScale = P.vscale;
        td.fillColor = [245 / 255, 0, 0]; td.applyFill = true;
        td.applyStroke = true; td.strokeColor = [0.01, 0, 0]; td.strokeWidth = P.stroke; td.strokeOverFill = false;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        st.setValue(td);
        w("font=" + st.value.font);
        var tr = L.property("ADBE Transform Group");
        tr.property("ADBE Anchor Point").expression = "var r=sourceRectAtTime(0,false);[r.left+r.width/2, r.top+r.height/2]";
        tr.property("ADBE Position").setValue([P.x, P.y]);

        // 단어마다 따로 흔들기: 애니메이터 위치 + Wiggly 선택기 (단어 기준)
        var anims = L.property("ADBE Text Properties").property("ADBE Text Animators");
        var an = anims.addProperty("ADBE Text Animator");
        an.name = "단어 흔들기";
        an.property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D").setValue([P.wigAmt, P.wigAmt, 0]);
        var sels = an.property("ADBE Text Selectors");
        var ws = sels.addProperty("ADBE Text Wiggly Selector");
        ws.property("ADBE Text Wiggly Max Amount").setValue(100);
        ws.property("ADBE Text Wiggly Min Amount").setValue(-100);
        ws.property("ADBE Text Range Type2").setValue(2);          // 기준: 글자(공백 제외) — 사용자 지정 2026-10-11 "한글자한글자 단위로 흔들리게" (원본 측정은 단어 단위)
        ws.property("ADBE Text Temporal Freq").setValue(P.wigFreq); // 초당 흔들림
        ws.property("ADBE Text Character Correlation").setValue(0); // 단어끼리 따로
        ws.property("ADBE Text Wiggly Lock Dim").setValue(0);       // 가로·세로 따로
        w("animator ok");

        // 거친 가장자리 (원본 붓 느낌 테두리): 고정된 거칠기
        var fx = L.property("ADBE Effect Parade");
        var rg = fx.addProperty("ADBE Roughen Edges");
        rg.property("ADBE Roughen Edges-0001").setValue(1);       // 가장자리 유형: 거칠게
        rg.property("ADBE Roughen Edges-0002").setValue(P.rough);  // 테두리
        w("effects=" + fx.numProperties);

        // (안쪽 선 레이어 시도 — 원본 붓 질감은 원본 폰트 모양이라 따로 레이어로 흉내 내면 위치·흔들림이 어긋나 뺌, 2026-10-11)
        comp.motionGraphicTemplateName = "분노_화나는_AE";
        w("addToMGT=" + st.addToMotionGraphicsTemplateAs(comp, "자막 텍스트"));
        app.project.save(new File(OUT_DIR + "\\08_분노_AE.aep"));
        new Folder(EXPORT_DIR).create();
        w("export=" + comp.exportAsMotionGraphicsTemplate(true, EXPORT_DIR));
    } catch (e) {
        w("ERROR line " + e.line + ": " + e.toString());
    }
    var f = new File(OUT_DIR + "\\result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close();
    app.endSuppressDialogs(false);
})();
