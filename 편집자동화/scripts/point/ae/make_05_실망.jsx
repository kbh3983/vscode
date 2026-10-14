// 포인트 에이전트 — 프리미어 템플릿 "05_실망 우울 좌절 모션자막"을 애프터이펙트 템플릿으로 다시 만들기
// 실행: AfterFX.exe -r <이 파일>  (한글 경로면 ASCII 경로로 복사해서 실행). 결과 OUT_DIR\result.txt, 내보내기 OUT_DIR\export → finish_mogrt.py
// 4차 (사용자: "프레임 단위로 비교해서 똑같이 만들어줄수있어?") — 프리미어 비교 시퀀스에서 원본(PR)을 프레임별로 뽑아 잰 값
//   (work/포인트/ae_templates/05_실망/cmp/pr_NN.png, 29.97fps):
//   - 불투명도 0프레임 0% → 9프레임 100% 일정하게 (알파로 측정)
//   - 1프레임에 제자리보다 56px 위, 프레임별 위 오프셋 아래 DROP, 20프레임에 제자리 (처음 빠르고 끝 느림)
//   - 글자 채움: 위 밝기 228 → 아래 150 그라데이션, 바깥에 어두운 회색 테두리 + 오른쪽 아래 그림자
//   - 글자 폭 1085px (가운데 정렬), 글자 세로 가운데 y≈935
//   - 원본 폰트 ZWOTMogujasusimgyeolR 대신 페이퍼로지 7Bold (포인트 기준 폰트)
(function () {
    var OUT_DIR = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\포인트\\ae_templates\\05_실망";
    var EXPORT_DIR = OUT_DIR + "\\export";
    var FPS = 29.97, FR = 1 / FPS;
    var DROP = [56, 50, 45, 40, 35, 30, 26, 22, 18, 15, 12, 9, 7, 5, 4, 3, 2, 1, 1, 0]; // 1~20프레임
    var X = 960, Y = 934;  // 프리미어 비교에서 1px 맞춤
    var log = [];
    function w(s) { log.push(s); }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);  // 이전 임시 프로젝트 저장 창이 뜨면 스크립트가 멈춤
        app.newProject();
        var comp = app.project.items.addComp("실망_우울_좌절_AE", 1920, 1080, 1, 3.003, FPS);

        // ── 위: 문구 레이어 (사용자가 바꾸는 칸). 채움만, 그라데이션은 효과로
        var L = comp.layers.addText("실망, 우울, 좌절 모션자막 템플릿");
        L.name = "자막";
        var st = L.property("ADBE Text Properties").property("ADBE Text Document");
        var td = st.value;
        td.font = "Paperlogy-7Bold";
        td.fontSize = 90;
        td.fillColor = [1, 1, 1];
        td.applyFill = true;
        td.applyStroke = false;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        st.setValue(td);
        w("font=" + st.value.font);

        var tr = L.property("ADBE Transform Group");
        tr.property("ADBE Anchor Point").expression = "var r=sourceRectAtTime(time,false);[r.left+r.width/2, r.top+r.height/2]";
        var pos = tr.property("ADBE Position");
        pos.setValueAtTime(0, [X, Y - DROP[0]]);
        for (var k = 0; k < DROP.length; k++) pos.setValueAtTime((k + 1) * FR, [X, Y - DROP[k]]);
        var op = tr.property("ADBE Opacity");
        // 불투명도 (6차, 사용자: "투명도도 프래임 단위로 분석해서 똑같게해줘"): 원본 알파를 프레임별로 재면
        // 0프레임 0% → 1프레임마다 약 11%씩 → 9프레임(0.3초) 100%, 일정한 속도
        // 레이어 3개(그라데이션·글자·테두리)가 겹쳐서 같은 값이면 원본보다 진해짐 → 겹친 결과가 원본 알파(0,11,22…100%)가 되도록 프레임별 값
        var OPA = [0.0,7.7,15.8,24.2,33.3,43.5,54.2,66.5,81.4,100.0];
        for (var o = 0; o < OPA.length; o++) op.setValueAtTime(o * FR, OPA[o]);
        for (var h = 1; h <= op.numKeys; h++) op.setInterpolationTypeAtKey(h, KeyframeInterpolationType.LINEAR);

        var fx = L.property("ADBE Effect Parade");
        var tdA = fx.addProperty("ADBE Turbulent Displace");
        tdA.property(2).setValue(10); tdA.property(3).setValue(20); tdA.property(5).setValue(1);
        // 일렁임 (5차, 사용자: "모션 꿀렁거림이 원본에 비해 부자연스러운데"): 원본과 같은 양 10, 모양은 10프레임마다 1·11·21…프레임에 바뀜
        // (원본 프리미어 비교에서 측정. 이전 버전은 양 20이라 한 번에 두 배로 출렁이고 0·10·20…프레임에 바뀌었음)
        tdA.property(6).expression = "var f=Math.max(0, Math.floor((timeToFrames(time)-1)/10)*10+1); framesToTime(f)*943.8";

        // ── 아래: 테두리·그림자 레이어 (문구·폰트는 위 레이어를 따라감)
        var B = comp.layers.addText("x");
        B.name = "테두리";
        B.moveAfter(L);
        B.property("ADBE Text Properties").property("ADBE Text Document").expression =
            "var s=thisComp.layer(\"자막\").text.sourceText; s.style.setText(s.value).setFillColor([0.12,0.12,0.12]).setApplyStroke(true).setStrokeColor([0.12,0.12,0.12]).setStrokeWidth(12)";
        var trB = B.property("ADBE Transform Group");
        trB.property("ADBE Anchor Point").expression = "var r=sourceRectAtTime(time,false);[r.left+r.width/2, r.top+r.height/2]";
        trB.property("ADBE Position").expression = "thisComp.layer(\"자막\").transform.position";
        trB.property("ADBE Opacity").expression = "thisComp.layer(\"자막\").transform.opacity";
        var fxB = B.property("ADBE Effect Parade");
        var tdB = fxB.addProperty("ADBE Turbulent Displace");
        tdB.property(2).setValue(10); tdB.property(3).setValue(20); tdB.property(5).setValue(1);
        tdB.property(6).expression = "var f=Math.max(0, Math.floor((timeToFrames(time)-1)/10)*10+1); framesToTime(f)*943.8";
        var ds = fxB.addProperty("ADBE Drop Shadow");
        ds.property("ADBE Drop Shadow-0002").setValue(60 * 2.55);
        ds.property("ADBE Drop Shadow-0003").setValue(135);
        ds.property("ADBE Drop Shadow-0004").setValue(8);
        ds.property("ADBE Drop Shadow-0005").setValue(10);
        // ── 맨 위: 그라데이션 판 (위 228 → 아래 135). "자막" 글자 모양으로만 보이게 알파 매트
        //    (텍스트 레이어에 Ramp를 직접 걸면 효과 좌표가 맞지 않아 한 색으로 나옴 — 2026-10-11 확인)
        var G = comp.layers.addSolid([1, 1, 1], "그라데이션", 1920, 1080, 1, 3.003);
        G.moveBefore(L);
        var ramp = G.property("ADBE Effect Parade").addProperty("ADBE Ramp");
        ramp.property(1).expression = "var L=thisComp.layer(\"자막\"); var r=L.sourceRectAtTime(time,false); [960, L.toComp([r.left, r.top])[1]]";
        ramp.property(2).setValue([236 / 255, 236 / 255, 236 / 255]);  // 프리미어 비교에서 위쪽 밝기 맞춤 (228→236)
        ramp.property(3).expression = "var L=thisComp.layer(\"자막\"); var r=L.sourceRectAtTime(time,false); [960, L.toComp([r.left, r.top+r.height])[1]]";
        ramp.property(4).setValue([150 / 255, 150 / 255, 150 / 255]);  // 원본 아래쪽 밝기 측정값 ~150
        G.setTrackMatte(L, TrackMatteType.ALPHA);
        w("layers=" + comp.numLayers);

        comp.motionGraphicTemplateName = "실망_우울_좌절_AE";
        w("addToMGT=" + st.addToMotionGraphicsTemplateAs(comp, "자막 텍스트"));
        app.project.save(new File(OUT_DIR + "\\05_실망_AE.aep"));
        // 확인용 프레임은 따로 (saveFrameToPng를 여기서 여러 번 부르면 첫 장만 저장됨)
        new Folder(EXPORT_DIR).create();
        w("export=" + comp.exportAsMotionGraphicsTemplate(true, EXPORT_DIR));
    } catch (e) {
        w("ERROR line " + e.line + ": " + e.toString());
    }
    var f = new File(OUT_DIR + "\\result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close();
    app.endSuppressDialogs(false);
})();
