// 브이로그 에이전트 — 레퍼런스 공통 자막 1~5번을 AE 템플릿으로 (2026-10-16, 사용자: "우선 1-5번을 먼저 만들자. 폰트는 프리텐다드로")
// 근거: work/브이로그예능/분석/통합분석.md 1-2 표, 측정 장면 work/브이로그예능/템플릿/ref/sheet_*.jpg (1920×1080 기준)
//   01 대사_그림자  : 흰 글자 약 44~50px, 아래 가운데 y≈950, 그림자만 (10채널)
//   02 대사_박스    : 흰 글자 약 46px + 검은 상자 높이 약 70px (r1·r7·r8)
//   03 손글씨_감탄  : 약 60~70px, 인물 옆, 기울어짐, 얇은 검은 테두리 (10채널) — 손글씨 폰트는 나중에 사용자가 고름
//   04 빨간_강조    : 약 100~110px, 빨강 + 어두운 테두리, 튀어나오는 등장 (9채널)
//   05 괄호_속마음  : 대사보다 조금 작고 가늘게, 흰 + 그림자 (9채널) — 괄호는 문구에 직접 씀
//   06 큰_해설      : 약 80~100px, 흰 굵은 고딕 + 검은 테두리 + 그림자, 짧은 페이드 (예능형)
// 표준 (포인트 playbook_AE변환 12장): 450프레임(15초), 맨 아래 널 "템플릿 조절"에 색·크기·위치 칸 → 필수 그래픽
// 실행: powershell -File scripts/point/ae/run_ae.ps1 <이 파일> <OUT\result_vlog5.txt> "Vlog5 끝" 600
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\브이로그예능\\템플릿\\ae";
    var RENDER = OUT + "\\render";
    var FPS = 29.97, FR = 1 / FPS, NF = 450, DUR = NF / FPS;
    var CTL = "템플릿 조절";
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_vlog5.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function c255(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function tp(L) { return L.property("ADBE Transform Group"); }
    function ref(n) { return 'thisComp.layer("' + CTL + '").effect("' + n + '")(1)'; }

    // 템플릿 정의: 이름, 표시 이름, 폰트, 크기, 글자 색, 테두리(색, 두께 / null), 그림자(투명도, 거리, 번짐 / null), 위치(눈에 보이는 글자 가운데), 기본 문구, 등장
    var T = [
        { id: "01", name: "대사_그림자", disp: "브이로그 01 대사 (그림자)", font: "Pretendard-SemiBold", size: 50, fill: [255, 255, 255],
          stroke: null, shadow: [65, 3, 8], pos: [960, 950], text: "이제 출근해야 되니까", anim: "none" },
        { id: "02", name: "대사_박스", disp: "브이로그 02 대사 (검은 상자)", font: "Pretendard-SemiBold", size: 48, fill: [255, 255, 255],
          stroke: null, shadow: null, pos: [960, 950], text: "안녕하세요", anim: "none", box: { color: [0, 0, 0], op: 75, padX: 18, h: 1.5 } },
        { id: "03", name: "손글씨_감탄", disp: "브이로그 03 손글씨 감탄", font: "Pretendard-Medium", size: 68, fill: [255, 255, 255],
          stroke: [[20, 20, 20], 4], shadow: [50, 2, 6], pos: [1380, 420], text: "맥주가 지기네~", anim: "pop_small", rot: -8 },
        { id: "04", name: "빨간_강조", disp: "브이로그 04 빨간 강조", font: "Pretendard-ExtraBold", size: 110, fill: [235, 30, 35],
          stroke: [[25, 0, 0], 6], shadow: [55, 4, 10], pos: [960, 880], text: "필요 없으세요", anim: "pop_big" },
        { id: "05", name: "괄호_속마음", disp: "브이로그 05 괄호 속마음", font: "Pretendard-Regular", size: 46, fill: [255, 255, 255],
          stroke: null, shadow: [65, 3, 8], pos: [960, 950], text: "(이번엔 전화 업무)", anim: "fade" },
        { id: "06", name: "큰_해설", disp: "브이로그 06 큰 해설", font: "Pretendard-ExtraBold", size: 92, fill: [255, 255, 255],
          stroke: [[15, 15, 15], 6], shadow: [50, 4, 10], pos: [960, 905], text: "외로운 이쓴 혼자 출발...", anim: "fade_up" }
    ];

    function addCtl(c) { var N = c.layers.addNull(DUR); N.name = CTL; N.moveToEnd(); return N; }   // 맨 아래 (playbook 12장: 맨 위면 난수가 바뀜)
    function fx(c) { return c.layer(CTL).property("ADBE Effect Parade"); }
    function colorC(c, n, v) { var e = fx(c).addProperty("ADBE Color Control"); e.name = n; var k = c255(v); e.property(1).setValue([k[0], k[1], k[2], 1]); return ref(n); }
    function slider(c, n, v) { var e = fx(c).addProperty("ADBE Slider Control"); e.name = n; e.property(1).setValue(v); return ref(n); }
    function point(c, n) { var e = fx(c).addProperty("ADBE Point Control"); e.name = n; e.property(1).setValue([0, 0]); return ref(n); }
    function angle(c, n, v) { var e = fx(c).addProperty("ADBE Angle Control"); e.name = n; e.property(1).setValue(v); return ref(n); }

    function build(t) {
        var c = app.project.items.addComp("브이로그_" + t.id + "_" + t.name, 1920, 1080, 1, DUR, FPS);
        addCtl(c);
        var ORDER = [];
        w(t.id + " 컴프");
        // 글자
        var L = c.layers.addText(t.text); L.name = "글자";
        var st = tdoc(L), td = st.value;
        td.font = t.font; td.fontSize = t.size; td.fillColor = c255(t.fill); td.applyFill = true;
        td.justification = ParagraphJustification.CENTER_JUSTIFY; td.tracking = -10;
        if (t.stroke) { td.applyStroke = true; td.strokeColor = c255(t.stroke[0]); td.strokeWidth = t.stroke[1]; td.strokeOverFill = false; } else td.applyStroke = false;
        st.setValue(td);
        w("  폰트 " + st.value.font + " " + st.value.fontSize);
        // 색: 맨 앞 애니메이터 "색 바꾸기" (playbook 12장)
        var A = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
        A.name = "색 바꾸기";
        A.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        var P = A.property("ADBE Text Animator Properties");
        P.addProperty("ADBE Text Fill Color").expression = colorC(c, "글자 색", t.fill); ORDER.push("글자 색");
        if (t.stroke) { P = A.property("ADBE Text Animator Properties"); P.addProperty("ADBE Text Stroke Color").expression = colorC(c, "테두리 색", t.stroke[0]); ORDER.push("테두리 색"); }
        w("  색");
        // 크기·위치·기울기 칸
        var kS = slider(c, "글자 크기", 100); ORDER.push("글자 크기");
        var kP = point(c, "위치 이동"); ORDER.push("위치 이동");
        var kR = null; if (t.rot !== undefined) { kR = angle(c, "기울기", t.rot); ORDER.push("기울기"); }
        // 기준점 = 글자 가운데 → 위치 = 눈에 보이는 가운데 (문구가 바뀌어도 가운데 고정)
        tp(L).property("ADBE Anchor Point").expression = 'var r=sourceRectAtTime(time,false); [r.left+r.width/2, r.top+r.height/2]';
        var pos = tp(L).property("ADBE Position"); pos.setValue(t.pos);
        var sc = tp(L).property("ADBE Scale");
        // 등장
        if (t.anim == "pop_small") {   // 85 → 104 → 100 (6프레임), 투명도 0 → 100 (3프레임)
            var a1 = [[0, 85], [3, 104], [6, 100]]; for (var i = 0; i < a1.length; i++) sc.setValueAtTime(a1[i][0] * FR, [a1[i][1], a1[i][1]]);
        } else if (t.anim == "pop_big") {   // 140 → 92 → 103 → 100 (8프레임)
            var a2 = [[0, 140], [3, 92], [6, 103], [8, 100]]; for (var j = 0; j < a2.length; j++) sc.setValueAtTime(a2[j][0] * FR, [a2[j][1], a2[j][1]]);
        } else if (t.anim == "fade_up") {   // 아래 12px에서 6프레임 감속
            pos.setValueAtTime(0, [t.pos[0], t.pos[1] + 12]); pos.setValueAtTime(6 * FR, t.pos);
            var ease = new KeyframeEase(0, 75); pos.setTemporalEaseAtKey(2, [ease], [ease]);
        }
        sc.expression = 'var k=' + kS + '/100; [value[0]*k, value[1]*k]';
        pos.expression = 'value + ' + kP;
        if (kR) tp(L).property("ADBE Rotate Z").expression = kR;
        var op = tp(L).property("ADBE Opacity");
        if (t.anim == "pop_small") { op.setValueAtTime(0, 0); op.setValueAtTime(3 * FR, 100); }
        else if (t.anim == "pop_big") { op.setValueAtTime(0, 0); op.setValueAtTime(2 * FR, 100); }
        else if (t.anim == "fade" || t.anim == "fade_up") { op.setValueAtTime(0, 0); op.setValueAtTime(5 * FR, 100); }
        w("  변형·등장");
        // 그림자
        if (t.shadow) {
            var kD = colorC(c, "그림자 색", [0, 0, 0]); ORDER.push("그림자 색");
            c.layer("글자").property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
            var D = c.layer("글자").property("ADBE Effect Parade").property("ADBE Drop Shadow");
            D.property("ADBE Drop Shadow-0001").expression = kD;
            D.property("ADBE Drop Shadow-0002").setValue(t.shadow[0] * 2.55);
            D.property("ADBE Drop Shadow-0003").setValue(135);
            D.property("ADBE Drop Shadow-0004").setValue(t.shadow[1]);
            D.property("ADBE Drop Shadow-0005").setValue(t.shadow[2]);
            w("  그림자");
        }
        // 상자 (글자 폭 + 좌우 여백, 높이는 글자 크기 × h — 문구마다 높이가 흔들리지 않게)
        if (t.box) {
            var kC = colorC(c, "상자 색", t.box.color); ORDER.push("상자 색");   // 칸을 먼저 (효과를 더하면 앞 참조가 무효)
            var kO = slider(c, "상자 투명도", t.box.op); ORDER.push("상자 투명도");
            var B = c.layers.addShape(); B.name = "상자";
            var g = B.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
            g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
            g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
            B = c.layer("상자");
            var vg = B.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
            var rc = vg.property(1), fl = vg.property(2);
            fl.property("ADBE Vector Fill Color").expression = kC;
            fl.property("ADBE Vector Fill Opacity").expression = kO;
            var LL = 'var L=thisComp.layer("글자"), r=L.sourceRectAtTime(time,false), s=L.transform.scale[0]/100, fs=L.text.sourceText.style.fontSize;';
            rc.property("ADBE Vector Rect Size").expression = LL + ' [r.width*s+' + (2 * t.box.padX) + ', fs*s*' + t.box.h + ']';
            rc.property("ADBE Vector Rect Position").expression = 'thisComp.layer("글자").toComp(thisComp.layer("글자").transform.anchorPoint)';
            tp(B).property("ADBE Anchor Point").setValue([0, 0]); tp(B).property("ADBE Position").setValue([0, 0]);
            B.moveAfter(c.layer("글자"));
            tp(B).property("ADBE Opacity").expression = 'thisComp.layer("글자").transform.opacity';
            w("  상자");
        }
        // 필수 그래픽 칸 (효과를 더하면 앞 참조가 무효 → 이름으로 다시 찾음)
        var ok = [];
        ok.push("텍스트" + (tdoc(c.layer("글자")).addToMotionGraphicsTemplateAs(c, "텍스트") ? "" : "(실패)"));
        for (var m = 0; m < ORDER.length; m++) {
            var pp = fx(c).property(ORDER[m]).property(1);
            ok.push(ORDER[m] + (pp.addToMotionGraphicsTemplateAs(c, ORDER[m]) ? "" : "(실패)"));
        }
        w("  칸 " + ok.join(", "));
        return c.name;
    }

    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        new Folder(OUT).create(); new Folder(RENDER).create();
        app.newProject();
        app.project.save(new File(OUT + "\\vlog5.aep"));
        w("프로젝트 저장");
        var names = [];
        for (var i = 0; i < T.length; i++) names.push(build(T[i]));
        app.project.save(new File(OUT + "\\vlog5.aep"));
        // 확인용 렌더 대기열 (aerender가 한글 컴프 이름을 못 찾아 번호로 렌더 — playbook 13장): 처음 1.5초, PNG
        for (var q = 0; q < names.length; q++) {
            var cc = null; for (var k = 1; k <= app.project.numItems; k++) if (app.project.item(k).name == names[q]) cc = app.project.item(k);
            var rq = app.project.renderQueue.items.add(cc);
            rq.timeSpanStart = 0; rq.timeSpanDuration = 45 * FR;
            var om = rq.outputModule(1), tpls = om.templates, png = false;
            for (var ti = 0; ti < tpls.length; ti++) if (/png/i.test(tpls[ti])) { try { om.applyTemplate(tpls[ti]); png = true; break; } catch (e) {} }
            try { om.setSettings({ "Video Output": { "Channels": "RGB + Alpha" } }); } catch (e) {}
            om.file = new File(RENDER + "\\" + T[q].id + "_[##].png");
            w("렌더 대기열 #" + app.project.renderQueue.numItems + " " + names[q] + (png ? "" : " (PNG 템플릿 없음)"));
        }
        app.project.save(new File(OUT + "\\vlog5.aep"));
        w("Vlog5 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
