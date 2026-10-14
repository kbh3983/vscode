// 포인트 에이전트 — 사용자 종편(옆구리살)에서 쓴 프리미어 그래픽 4종을 애프터이펙트 템플릿으로 (문구를 스크립트로 바꿀 수 있게)
// Tip_동작요령_2단 / 요령_노랑_2단 / 정보바_세트안내 / 해설_괄호
// 실행: run_ae.ps1 <이 파일> <결과 txt>. 내보내기 OUT\export_<이름> → finish_mogrt.py
// 원본 측정 (work/회고/tpl, 프리미어에서 그래픽만 렌더, 1920x1080, 29.97fps):
//   남색 #3C398D(60,57,141), 노랑 #FFEA00, 초록 #40E7B1, 테두리 바깥 5px, 그림자 오른쪽 아래 약 5px(단단함)
//   Tip!: 배지 상자 x43~168 y774~850, "Tip!" 글자 x55~157 y785~839 / 1줄(흰) x39~389 y871~931 / 2줄(노랑) x41~856 y952~1030 — GmarketSansBold
//   노랑 2단: 1줄 x39~249 y864~924 / 2줄 x40~715 y951~1029
//   정보 바: 검정 불투명 상자 x402~1513 y928~1024, 글자 x426~1490 y952~999 (Pretendard Regular 흰 + SemiBold 초록)
//   해설 괄호: 글자 x507~1417 y941~1006 (GangwonEduAllBold 흰, 테두리·그림자 남색)
//   등장: Tip!·노랑 2단 = 왼쪽 60px에서 프레임당 6px(10프레임), 불투명도 프레임별 / 해설 = 불투명도만 13프레임 / 정보 바 = 불투명도만 7프레임
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\회고\\tpl\\ae";
    var FPS = 29.97, FR = 1 / FPS, DUR = 10;
    var IND = [60 / 255, 57 / 255, 141 / 255], YEL = [1, 234 / 255, 0], WHT = [1, 1, 1], GRN = [64 / 255, 231 / 255, 177 / 255];
    var OP_TIP = [0, 6.5, 15.5, 25.5, 37.2, 50, 62.4, 74.3, 84.6, 93.6, 100];   // 1~4프레임은 렌더 비교로 보정 (2026-10-12)
    var OP_IB = [0, 5.8, 20.5, 39.7, 60.3, 79.5, 94.2, 100];   // 정보 바: 7프레임 나타나기 (상자·글자 함께)
    var OP_BRK = [0, 0.4, 1.6, 4.7, 10.6, 19.6, 31.3, 44.3, 58.5, 72.8, 85.7, 92.4, 97.4, 99.8, 100];
    var SP = 20;   // 테두리 10 글자: sourceRectAtTime 상자가 채움보다 사방 10px 큼 (렌더 비교, 2026-10-12) — 목표 폭·위치는 채움(글자색) 기준
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_info4.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }   // 단계마다 바로 기록 (멈춘 곳 찾기)
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function addText(comp, name, txt, font, fill, stroke, just, italic) {
        var L = comp.layers.addText(txt); L.name = name;
        var st = tdoc(L), td = st.value;
        td.font = font; td.fontSize = 80; td.fillColor = fill; td.applyFill = true;
        if (stroke) { td.applyStroke = true; td.strokeColor = stroke; td.strokeWidth = 10; td.strokeOverFill = false; } else td.applyStroke = false;
        td.justification = just; td.fauxItalic = !!italic; td.tracking = 0;
        st.setValue(td);
        return L;
    }
    function fit(L, wd) {   // 글자 폭(테두리 포함)이 원본과 같아지게 크기 맞춤 — sourceRectAtTime 높이는 줄 상자라 글자보다 큼 (높이로 맞추면 0.69배, 2026-10-12)
        var st = tdoc(L);
        for (var k = 0; k < 4; k++) {
            var r = L.sourceRectAtTime(0, false), td = st.value;
            if (!(r.width > 1)) { w("  fit: 폭 0 — " + L.name); break; }
            var ns = td.fontSize * wd / r.width; if (ns > 400 || ns < 5) { w("  fit: 크기 이상 " + ns); break; }
            td.fontSize = ns; st.setValue(td);
        }
        return st.value.fontSize;
    }
    function placeLT(L, left, top) { var r = L.sourceRectAtTime(0, false); L.property("ADBE Transform Group").property("ADBE Position").setValue([left - r.left, top - r.top]); }
    function placeCT(L, cx, top) { var r = L.sourceRectAtTime(0, false); L.property("ADBE Transform Group").property("ADBE Position").setValue([cx - (r.left + r.width / 2), top - r.top]); }
    // 윗줄(작은 글자) 테두리·그림자를 글자 크기 비율만큼 줄임 — 같은 10px·7px이면 작은 글자에서 상대적으로 굵어 보임 (2026-10-13 사용자: "흰색 글자 뒤에 그림자 굵기가 노란글자보다 굵은데 … 노란글자 그림자 굵기에 맞춰서")
    function thinTop(top, bottom, left, topY) {
        var r = tdoc(top).value.fontSize / tdoc(bottom).value.fontSize;
        // 비율 그대로(r=0.77)면 수치상 같지만 눈에는 얇음, 같은 절대값(1.0)이면 굵음 → 중간 (r+1)/2 (2026-10-13 사용자: "중간값으로 다시 템플릿 수정해주고")
        var k = (r + 1) / 2;
        var st = tdoc(top), td = st.value; td.strokeWidth = 10 * k; st.setValue(td);
        top.property("ADBE Effect Parade").property("ADBE Drop Shadow").property("ADBE Drop Shadow-0004").setValue(7 * k);
        placeLT(top, left - 10 * k, topY - 10 * k);
        w("  윗줄 테두리 " + (10 * k).toFixed(2) + " 그림자 " + (7 * k).toFixed(2) + " (글자 비율 " + r.toFixed(3) + " → 중간 " + k.toFixed(3) + ")");
    }
    function shadow(L) {
        w("  그림자 " + L.name);
        var ds = L.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
        ds.property("ADBE Drop Shadow-0001").setValue(IND);
        ds.property("ADBE Drop Shadow-0002").setValue(255);
        ds.property("ADBE Drop Shadow-0003").setValue(135);
        ds.property("ADBE Drop Shadow-0004").setValue(7);
        ds.property("ADBE Drop Shadow-0005").setValue(0);
    }
    function rect(comp, name, cx, cy, wd, ht, color) {
        var S = comp.layers.addShape(); S.name = name;
        var g = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var r = g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        r.property("ADBE Vector Rect Size").setValue([wd, ht]);
        var f = g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        f.property("ADBE Vector Fill Color").setValue(color);
        S.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy]);
        return S;
    }
    // 등장 움직임: 널 위치(밀어 들어오기) + 불투명도(다른 레이어가 식으로 따라감)
    // 부모 연결을 먼저 하고 키를 넣는다 — 키 먼저 넣으면 0프레임 위치(-60)가 자식 오프셋으로 굳어 끝 위치가 +60px 밀림 (2026-10-12)
    function animate(comp, layers, op, slide) {
        w("  움직임 " + comp.name);
        var N = comp.layers.addNull(); N.name = "CTRL";
        var p = N.property("ADBE Transform Group").property("ADBE Position"); p.setValue([960, 540]);
        for (var i = 0; i < layers.length; i++) {
            layers[i].parent = N;
            layers[i].property("ADBE Transform Group").property("ADBE Opacity").expression = 'thisComp.layer("CTRL").transform.opacity';
        }
        if (slide) { p.setValueAtTime(0, [900, 540]); p.setValueAtTime(10 * FR, [960, 540]); }
        var o = N.property("ADBE Transform Group").property("ADBE Opacity");
        for (var j = 0; j < op.length; j++) o.setValueAtTime(j * FR, op[j]);
    }
    function exp(comp, name) {
        w("  내보내기 시작 " + name);
        var d = new Folder(OUT + "\\export_" + name); if (!d.exists) d.create();
        w(name + " export=" + comp.exportAsMotionGraphicsTemplate(true, d.fsName));
    }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        app.newProject();
        app.project.save(new File(OUT + "\\info4.aep"));   // 저장 안 된 프로젝트에선 exportAsMotionGraphicsTemplate가 false (2026-10-12)
        var LEFT = ParagraphJustification.LEFT_JUSTIFY, CEN = ParagraphJustification.CENTER_JUSTIFY;

        // 1) Tip! 2단
        var c1 = app.project.items.addComp("Tip_동작요령_2단", 1920, 1080, 1, DUR, FPS);
        w("c1 만듦");
        var bd = rect(c1, "배지", 105.5, 812, 126, 77, IND); w("배지");
        var tp = addText(c1, "Tip", "Tip!", "GmarketSansBold", WHT, null, LEFT, true); w("Tip size " + fit(tp, 102)); placeLT(tp, 55, 785);
        var a1 = addText(c1, "윗줄", "등을 최대한", "GmarketSansBold", WHT, IND, LEFT, false); w("윗줄 size " + fit(a1, 350 + SP)); placeLT(a1, 39 - SP / 2, 871 - SP / 2); shadow(a1);
        var b1 = addText(c1, "아랫줄", "말지 않도록 주의하기", "GmarketSansBold", YEL, IND, LEFT, false); w("아랫줄 size " + fit(b1, 815 + SP)); placeLT(b1, 41 - SP / 2, 952 - SP / 2); shadow(b1);
        thinTop(a1, b1, 39, 871);
        animate(c1, [bd, tp, a1, b1], OP_TIP, true);
        w("  항목 등록 윗줄 텍스트");
        tdoc(a1).addToMotionGraphicsTemplateAs(c1, "윗줄 텍스트");
        w("  항목 등록 아랫줄 텍스트");
        tdoc(b1).addToMotionGraphicsTemplateAs(c1, "아랫줄 텍스트");
        exp(c1, "Tip");

        // 2) 노랑 2단 (배지 없음)
        var c2 = app.project.items.addComp("요령_노랑_2단", 1920, 1080, 1, DUR, FPS);
        var a2 = addText(c2, "윗줄", "손 끝이", "GmarketSansBold", WHT, IND, LEFT, false); w("노랑 윗줄 size " + fit(a2, 210 + SP)); placeLT(a2, 39 - SP / 2, 864 - SP / 2); shadow(a2);
        var b2 = addText(c2, "아랫줄", "몸 앞을 향해야 함", "GmarketSansBold", YEL, IND, LEFT, false); w("노랑 아랫줄 size " + fit(b2, 675 + SP)); placeLT(b2, 40 - SP / 2, 951 - SP / 2); shadow(b2);
        thinTop(a2, b2, 39, 864);
        animate(c2, [a2, b2], OP_TIP, true);
        w("  항목 등록 윗줄 텍스트");
        tdoc(a2).addToMotionGraphicsTemplateAs(c2, "윗줄 텍스트");
        w("  항목 등록 아랫줄 텍스트");
        tdoc(b2).addToMotionGraphicsTemplateAs(c2, "아랫줄 텍스트");
        exp(c2, "Yellow2");

        // 3) 정보 바: 앞·강조·뒤 문구 칸(숨긴 레이어) → 보이는 한 줄(강조 부분 초록) + 글자 폭에 맞는 검정 상자
        var c3 = app.project.items.addComp("정보바_세트안내", 1920, 1080, 1, DUR, FPS);
        var A = addText(c3, "앞 문구", "좌우 동작을 1번으로 카운트, ", "Pretendard-Regular", WHT, null, LEFT, false);
        var Bm = addText(c3, "강조 문구", "10번씩 3세트", "Pretendard-SemiBold", GRN, null, LEFT, false);
        var C = addText(c3, "뒤 문구", " 진행해 주세요", "Pretendard-Regular", WHT, null, LEFT, false);
        A.enabled = false; Bm.enabled = false; C.enabled = false;
        var D = addText(c3, "표시", "좌우 동작을 1번으로 카운트, 10번씩 3세트 진행해 주세요", "Pretendard-Regular", WHT, null, CEN, false);
        var tdD = tdoc(D).value; tdD.applyStroke = true; tdD.strokeColor = WHT; tdD.strokeWidth = 0.5;   // 원본 글자가 조금 더 굵음(테두리 없으면 밝기 87%, 0.8이면 107%) → 흰 테두리 0.5로 보충, 강조 부분은 아래 애니메이터가 초록·1.6으로 덮음
        tdD.strokeOverFill = false; tdoc(D).setValue(tdD);
        w("정보 size " + fit(D, 1064)); placeCT(D, 958, 953);
        w("  표시 식");
        tdoc(D).expression = 'var a=""+thisComp.layer("앞 문구").text.sourceText, b=""+thisComp.layer("강조 문구").text.sourceText, c=""+thisComp.layer("뒤 문구").text.sourceText; text.sourceText.style.setText(a+b+c)';
        var an = D.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
        var ap = an.property("ADBE Text Animator Properties");
        ap.addProperty("ADBE Text Fill Color").setValue(GRN);
        ap.addProperty("ADBE Text Stroke Color").setValue(GRN);
        ap.addProperty("ADBE Text Stroke Width").setValue(1.6);   // SemiBold 굵기 흉내
        var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        sel.property("ADBE Text Range Advanced").property("ADBE Text Range Units").setValue(2);
        sel.property("ADBE Text Index Start").expression = '(""+thisComp.layer("앞 문구").text.sourceText).length';
        sel.property("ADBE Text Index End").expression = '(""+thisComp.layer("앞 문구").text.sourceText).length+(""+thisComp.layer("강조 문구").text.sourceText).length';
        w("  상자");
        var bx = rect(c3, "상자", 957.5, 976, 1112, 97, [0, 0, 0]);
        bx.moveAfter(D);
        for (var q = 0; q < OP_IB.length; q++) { D.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(q * FR, OP_IB[q]); bx.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(q * FR, OP_IB[q]); }
        bx.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property("ADBE Vector Rect Size").expression = 'var r=thisComp.layer("표시").sourceRectAtTime(time,false); [r.width+47, 97]';
        bx.property("ADBE Transform Group").property("ADBE Position").expression = 'var L=thisComp.layer("표시"), r=L.sourceRectAtTime(time,false); [L.toComp([r.left+r.width/2, 0])[0], 976]';
        w("  항목 등록 앞 문구");
        tdoc(A).addToMotionGraphicsTemplateAs(c3, "앞 문구");
        w("  항목 등록 강조 문구");
        tdoc(Bm).addToMotionGraphicsTemplateAs(c3, "강조 문구");
        w("  항목 등록 뒤 문구");
        tdoc(C).addToMotionGraphicsTemplateAs(c3, "뒤 문구");
        exp(c3, "InfoBar");

        // 4) 해설 괄호
        var c4 = app.project.items.addComp("해설_괄호", 1920, 1080, 1, DUR, FPS);
        var t4 = addText(c4, "해설", "[운동하느라 대답할 정신없음..ㅎ]", "GangwonEduAllBold", WHT, IND, CEN, false);
        w("해설 size " + fit(t4, 910 + SP)); placeCT(t4, 962, 941 - SP / 2); shadow(t4);
        animate(c4, [t4], OP_BRK, false);
        w("  항목 등록 자막 텍스트");
        tdoc(t4).addToMotionGraphicsTemplateAs(c4, "자막 텍스트");
        exp(c4, "Bracket");
        app.project.save(new File(OUT + "\\info4.aep"));
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
    var f = new File(OUT + "\\result_info4.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close();
})();
