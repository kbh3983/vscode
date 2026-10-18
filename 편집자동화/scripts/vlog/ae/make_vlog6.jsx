// 브이로그 에이전트 — 레퍼런스 공통 자막 6~10번을 AE 템플릿으로 (2026-10-16, 사용자: "6-10도 마저 제작해줘. 동일하게 프리텐다드 폰트로")
// 근거: work/브이로그예능/분석/통합분석.md 1-2 표, 측정 장면 work/브이로그예능/템플릿/ref/sheet_6~10.jpg (1920×1080 기준)
//   07 2단_자막      : 큰 자막 위 작은 보충 한 줄 — 윗줄 약 30px, 아랫줄 대사 크기, 간격 약 10px (6채널)
//   08 사람별_색_대사 : 대사 크기, 노랑·초록·분홍 + 얇은 어두운 테두리 (6채널) — "말하는 사람" 고르기 칸
//   09 대괄호_라벨    : [상황 설명], 주황 굵은 글씨 + 어두운 테두리(r9), 흰 작은 것(r10)까지 (5채널) — 괄호는 문구에 직접
//   10 큰_반투명_해설 : 80~100px, 80~90% 투명도, 얇은 글꼴 (4채널) — 명조는 나중에 사용자가 고름
//   11 이름_카드      : 왼쪽 아래, 윗줄 약 44px + 이름 약 90px (r11 "오늘의 일일알바 / 민와와")
//   12 날짜_표시      : 왼쪽 위 작게 ("다음날", r1·r7)
// 표준 (포인트 playbook_AE변환 12장): 450프레임, 맨 아래 널 "템플릿 조절", 2줄은 줄마다 크기·위치 칸
// 실행: powershell -File scripts/point/ae/run_ae.ps1 <이 파일> <OUT\result_vlog6.txt> "Vlog6 끝" 600
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\브이로그예능\\템플릿\\ae";
    var RENDER = OUT + "\\render";
    var FPS = 29.97, FR = 1 / FPS, NF = 450, DUR = NF / FPS;
    var CTL = "템플릿 조절";
    var CEN = ParagraphJustification.CENTER_JUSTIFY, LEFT = ParagraphJustification.LEFT_JUSTIFY;
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_vlog6.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function c255(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function tp(L) { return L.property("ADBE Transform Group"); }
    function ref(n) { return 'thisComp.layer("' + CTL + '").effect("' + n + '")(1)'; }
    function fx(c) { return c.layer(CTL).property("ADBE Effect Parade"); }
    var ORDER;
    function colorC(c, n, v) { var e = fx(c).addProperty("ADBE Color Control"); e.name = n; var k = c255(v); e.property(1).setValue([k[0], k[1], k[2], 1]); ORDER.push(n); return ref(n); }
    function slider(c, n, v) { var e = fx(c).addProperty("ADBE Slider Control"); e.name = n; e.property(1).setValue(v); ORDER.push(n); return ref(n); }
    function point(c, n) { var e = fx(c).addProperty("ADBE Point Control"); e.name = n; e.property(1).setValue([0, 0]); ORDER.push(n); return ref(n); }

    function newComp(id, name) {
        var c = app.project.items.addComp("브이로그_" + id + "_" + name, 1920, 1080, 1, DUR, FPS);
        var N = c.layers.addNull(DUR); N.name = CTL; N.moveToEnd();
        ORDER = [];
        w(id + " 컴프");
        return c;
    }
    // 글자 레이어: o = {name, text, font, size, fill, stroke:[색,두께]|null, just, tracking}
    function addText(c, o) {
        var L = c.layers.addText(o.text); L.name = o.name;
        var st = tdoc(L), td = st.value;
        td.font = o.font; td.fontSize = o.size; td.fillColor = c255(o.fill); td.applyFill = true;
        td.justification = o.just || CEN; td.tracking = (o.tracking === undefined ? -10 : o.tracking);
        if (o.stroke) { td.applyStroke = true; td.strokeColor = c255(o.stroke[0]); td.strokeWidth = o.stroke[1]; td.strokeOverFill = false; } else td.applyStroke = false;
        st.setValue(td);
        // 기준점: 가운데 정렬 = 글자 가운데, 왼쪽 정렬 = 왼쪽 끝 세로 가운데
        tp(L).property("ADBE Anchor Point").expression = (o.just == LEFT) ? 'var r=sourceRectAtTime(time,false); [r.left, r.top+r.height/2]' : 'var r=sourceRectAtTime(time,false); [r.left+r.width/2, r.top+r.height/2]';
        w("  " + o.name + " 폰트 " + st.value.font + " " + st.value.fontSize);
        return L;
    }
    // 색 애니메이터 (맨 앞, playbook 12장). fillExpr·strokeExpr = 식 글 (없으면 건너뜀)
    function animColor(c, name, fillExpr, strokeExpr) {
        var L = c.layer(name);
        var A = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
        A.name = "색 바꾸기";
        A.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        L = c.layer(name);
        var g = L.property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기");
        if (fillExpr) g.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");
        g = c.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기");
        if (strokeExpr) g.property("ADBE Text Animator Properties").addProperty("ADBE Text Stroke Color");
        g = c.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").property("ADBE Text Animator Properties");
        if (fillExpr) g.property("ADBE Text Fill Color").expression = fillExpr;
        if (strokeExpr) g.property("ADBE Text Stroke Color").expression = strokeExpr;
    }
    function shadow(c, name, colorExpr, op, dist, soft) {
        c.layer(name).property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
        var D = c.layer(name).property("ADBE Effect Parade").property("ADBE Drop Shadow");
        D.property("ADBE Drop Shadow-0001").expression = colorExpr;
        D.property("ADBE Drop Shadow-0002").setValue(op * 2.55);
        D.property("ADBE Drop Shadow-0003").setValue(135);
        D.property("ADBE Drop Shadow-0004").setValue(dist);
        D.property("ADBE Drop Shadow-0005").setValue(soft);
    }
    function fadeIn(L, n) { var op = tp(L).property("ADBE Opacity"); op.setValueAtTime(0, 0); op.setValueAtTime(n * FR, 100); }
    function mgt(c, texts) {
        var ok = [];
        for (var i = 0; i < texts.length; i++) ok.push(texts[i][1] + (tdoc(c.layer(texts[i][0])).addToMotionGraphicsTemplateAs(c, texts[i][1]) ? "" : "(실패)"));
        for (var m = 0; m < ORDER.length; m++) { var pp = fx(c).property(ORDER[m]).property(1); ok.push(ORDER[m] + (pp.addToMotionGraphicsTemplateAs(c, ORDER[m]) ? "" : "(실패)")); }
        w("  칸 " + ok.join(", "));
    }

    // 07 2단 자막 — 아랫줄 = 대사(01과 같은 모양), 윗줄 = 아랫줄 위 끝에서 간격 10px 위
    function t07() {
        var c = newComp("07", "2단_자막");
        var B = addText(c, { name: "아랫줄", text: "빨리 타 비상 비상!!", font: "Pretendard-SemiBold", size: 50, fill: [255, 255, 255] });
        var T = addText(c, { name: "윗줄", text: "[이쓴 등장]", font: "Pretendard-Medium", size: 32, fill: [255, 255, 255] });
        var kF = colorC(c, "글자 색", [255, 255, 255]);
        var kU = colorC(c, "윗줄 색", [255, 255, 255]);
        var kSB = slider(c, "아랫줄 크기", 100), kSU = slider(c, "윗줄 크기", 100);
        var kP = point(c, "위치 이동"), kPU = point(c, "윗줄 위치 이동");
        var kG = slider(c, "줄 간격", 10);
        var kD = colorC(c, "그림자 색", [0, 0, 0]);
        animColor(c, "아랫줄", kF, null); animColor(c, "윗줄", kU, null);
        shadow(c, "아랫줄", kD, 65, 3, 8); shadow(c, "윗줄", kD, 65, 3, 8);
        B = c.layer("아랫줄"); T = c.layer("윗줄");
        tp(B).property("ADBE Position").setValue([960, 950]);
        tp(B).property("ADBE Position").expression = 'value + ' + kP;
        tp(B).property("ADBE Scale").expression = 'var k=' + kSB + '/100; [k*100,k*100]';
        tp(T).property("ADBE Scale").expression = 'var k=' + kSU + '/100; [k*100,k*100]';
        tp(T).property("ADBE Position").expression =
            'var B=thisComp.layer("아랫줄"), rb=B.sourceRectAtTime(time,false), top=B.toComp([rb.left, rb.top])[1];' +
            ' var r=sourceRectAtTime(time,false), h=r.height*transform.scale[1]/100;' +
            ' [B.transform.position[0], top - ' + kG + ' - h/2] + ' + kPU;
        mgt(c, [["윗줄", "윗줄 텍스트"], ["아랫줄", "아랫줄 텍스트"]]);
        return c.name;
    }
    // 08 말하는 사람별 색 — 고르기 칸: 1 흰 / 2 노랑 / 3 초록 / 4 분홍 / 5 하늘 / 6 직접 고른 색
    function t08() {
        var c = newComp("08", "사람별_색_대사");
        addText(c, { name: "글자", text: "난 갈색이 더 좋아", font: "Pretendard-SemiBold", size: 50, fill: [255, 224, 51], stroke: [[25, 25, 25], 3] });
        fx(c).addProperty("ADBE Dropdown Control");
        var ddI = fx(c).numProperties;   // matchName이 "Pseudo/…"로 바뀌어 종류로는 못 찾음 → 번호로
        function ddFx() { return fx(c).property(ddI); }
        ddFx().property(1).setPropertyParameters(["흰색", "노랑", "초록", "분홍", "하늘", "직접 고른 색"]);   // 효과가 다시 만들어져 이름·참조가 바뀜 → 종류로 다시 찾음
        ddFx().name = "말하는 사람";
        ddFx().property(1).setValue(2);
        ORDER.push("말하는 사람");
        var kC = colorC(c, "직접 고른 색", [255, 160, 60]);
        var kT = colorC(c, "테두리 색", [25, 25, 25]);
        var kS = slider(c, "글자 크기", 100), kP = point(c, "위치 이동");
        var kD = colorC(c, "그림자 색", [0, 0, 0]);
        var pal = 'var i=' + ref("말하는 사람") + ', P=[[1,1,1,1],[1,0.878,0.2,1],[0.36,0.92,0.42,1],[1,0.47,0.72,1],[0.42,0.8,1,1]]; i<=5 ? P[Math.round(i)-1] : ' + kC;
        animColor(c, "글자", pal, kT);
        shadow(c, "글자", kD, 60, 3, 8);
        var L = c.layer("글자");
        tp(L).property("ADBE Position").setValue([960, 950]);
        tp(L).property("ADBE Position").expression = 'value + ' + kP;
        tp(L).property("ADBE Scale").expression = 'var k=' + kS + '/100; [k*100,k*100]';
        mgt(c, [["글자", "텍스트"]]);
        return c.name;
    }
    // 09 [대괄호] 라벨 — 주황 굵은 글씨 + 어두운 테두리, 4프레임 페이드
    function t09() {
        var c = newComp("09", "대괄호_라벨");
        addText(c, { name: "글자", text: "[선물 구입 완료]", font: "Pretendard-Bold", size: 62, fill: [255, 150, 40], stroke: [[45, 20, 0], 5] });
        var kF = colorC(c, "글자 색", [255, 150, 40]), kT = colorC(c, "테두리 색", [45, 20, 0]);
        var kS = slider(c, "글자 크기", 100), kP = point(c, "위치 이동");
        var kD = colorC(c, "그림자 색", [0, 0, 0]);
        animColor(c, "글자", kF, kT); shadow(c, "글자", kD, 55, 3, 8);
        var L = c.layer("글자");
        tp(L).property("ADBE Position").setValue([960, 940]);
        tp(L).property("ADBE Position").expression = 'value + ' + kP;
        tp(L).property("ADBE Scale").expression = 'var k=' + kS + '/100; [k*100,k*100]';
        fadeIn(L, 4);
        mgt(c, [["글자", "텍스트"]]);
        return c.name;
    }
    // 10 큰 반투명 해설 — Light 96, 투명도 85%, 10프레임 페이드
    function t10() {
        var c = newComp("10", "큰_반투명_해설");
        addText(c, { name: "글자", text: "건물 자체가 너무 좋아요", font: "Pretendard-Light", size: 96, fill: [255, 255, 255], tracking: -20 });
        var kF = colorC(c, "글자 색", [255, 255, 255]);
        var kO = slider(c, "글자 투명도", 85);
        var kS = slider(c, "글자 크기", 100), kP = point(c, "위치 이동");
        var kD = colorC(c, "그림자 색", [0, 0, 0]);
        animColor(c, "글자", kF, null); shadow(c, "글자", kD, 45, 2, 12);
        var L = c.layer("글자");
        tp(L).property("ADBE Position").setValue([960, 900]);
        tp(L).property("ADBE Position").expression = 'value + ' + kP;
        tp(L).property("ADBE Scale").expression = 'var k=' + kS + '/100; [k*100,k*100]';
        var op = tp(L).property("ADBE Opacity"); op.setValueAtTime(0, 0); op.setValueAtTime(10 * FR, 100);
        op.expression = 'value * ' + kO + '/100';
        mgt(c, [["글자", "텍스트"]]);
        return c.name;
    }
    // 11 이름 카드 — 왼쪽 아래, 윗줄(소개) + 이름, 왼쪽 끝 맞춤, 왼쪽 20px에서 8프레임 감속
    function t11() {
        var c = newComp("11", "이름_카드");
        addText(c, { name: "이름", text: "민와와", font: "Pretendard-ExtraBold", size: 90, fill: [255, 255, 255], just: LEFT });
        addText(c, { name: "윗줄", text: "오늘의 일일알바", font: "Pretendard-Medium", size: 44, fill: [255, 255, 255], just: LEFT });
        var kF = colorC(c, "이름 색", [255, 255, 255]), kU = colorC(c, "윗줄 색", [255, 255, 255]);
        var kSN = slider(c, "이름 크기", 100), kSU = slider(c, "윗줄 크기", 100);
        var kP = point(c, "위치 이동"), kPU = point(c, "윗줄 위치 이동");
        var kD = colorC(c, "그림자 색", [0, 0, 0]);
        animColor(c, "이름", kF, null); animColor(c, "윗줄", kU, null);
        shadow(c, "이름", kD, 60, 4, 10); shadow(c, "윗줄", kD, 60, 3, 8);
        var N = c.layer("이름"), T = c.layer("윗줄");
        var pn = tp(N).property("ADBE Position");
        pn.setValueAtTime(0, [95, 910]); pn.setValueAtTime(8 * FR, [115, 910]);
        var ez = new KeyframeEase(0, 75); pn.setTemporalEaseAtKey(2, [ez], [ez]);
        pn.expression = 'value + ' + kP;
        tp(N).property("ADBE Scale").expression = 'var k=' + kSN + '/100; [k*100,k*100]';
        tp(T).property("ADBE Scale").expression = 'var k=' + kSU + '/100; [k*100,k*100]';
        tp(T).property("ADBE Position").expression =
            'var B=thisComp.layer("이름"), rb=B.sourceRectAtTime(time,false), p=B.toComp([rb.left, rb.top]);' +
            ' var r=sourceRectAtTime(time,false), h=r.height*transform.scale[1]/100;' +
            ' [p[0], p[1] - 14 - h/2] + ' + kPU;
        fadeIn(N, 6); fadeIn(T, 6);
        mgt(c, [["윗줄", "윗줄 텍스트"], ["이름", "이름 텍스트"]]);
        return c.name;
    }
    // 12 날짜 표시 — 왼쪽 위 작게, 5프레임 페이드
    function t12() {
        var c = newComp("12", "날짜_표시");
        addText(c, { name: "글자", text: "다음날", font: "Pretendard-Bold", size: 40, fill: [255, 255, 255], just: LEFT, tracking: 0 });
        var kF = colorC(c, "글자 색", [255, 255, 255]);
        var kS = slider(c, "글자 크기", 100), kP = point(c, "위치 이동");
        var kD = colorC(c, "그림자 색", [0, 0, 0]);
        animColor(c, "글자", kF, null); shadow(c, "글자", kD, 65, 3, 8);
        var L = c.layer("글자");
        tp(L).property("ADBE Position").setValue([90, 90]);
        tp(L).property("ADBE Position").expression = 'value + ' + kP;
        tp(L).property("ADBE Scale").expression = 'var k=' + kS + '/100; [k*100,k*100]';
        fadeIn(L, 5);
        mgt(c, [["글자", "텍스트"]]);
        return c.name;
    }

    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        new Folder(OUT).create(); new Folder(RENDER).create();
        app.newProject();
        app.project.save(new File(OUT + "\\vlog6.aep"));
        w("프로젝트 저장");
        var F = [t07, t08, t09, t10, t11, t12], names = [];
        for (var i = 0; i < F.length; i++) { names.push(F[i]()); app.project.save(); }
        // 확인용 렌더 대기열: 검은 바탕 그대로 (미리보기용) — 처음 1.5초 mp4
        for (var q = 0; q < names.length; q++) {
            var cc = null; for (var k = 1; k <= app.project.numItems; k++) if (app.project.item(k).name == names[q]) cc = app.project.item(k);
            var rq = app.project.renderQueue.items.add(cc);
            rq.timeSpanStart = 0; rq.timeSpanDuration = 45 * FR;
            rq.outputModule(1).file = new File(RENDER + "\\" + names[q].substr(5, 2) + ".mp4");
            w("렌더 대기열 #" + app.project.renderQueue.numItems + " " + names[q]);
        }
        app.project.save();
        w("Vlog6 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
