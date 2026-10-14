// 포인트 에이전트 — 사용자 종편(목교정기)에서 사용자가 직접 만든 프리미어 그래픽 2종을 애프터이펙트 템플릿으로 (2026-10-13 사용자: "b랑 c만 만든거야, 제작해줘")
// 요약_색강조_한줄 (B) / 정보바_2줄 (C)
// 실행: run_ae.ps1 <이 파일> <결과 txt> "Info2 export" 300. 내보내기 OUT\export_<이름> → finish_mogrt.py
// 원본 측정 (work/회고/목교정기/tpl, 그래픽만 렌더 + 켬/끔 비교, 1920x1080, 29.97fps):
//   B: Paperlogy-7Bold 기울임, 흰 글자 + 검정 테두리 바깥 약 5px. 강조어 세로 그라데이션 — 하늘 (0,198,255)→(182,239,255), 초록 (84,255,8)→(212,255,190)
//      100%에서 채움 x208~1710 y880~974 ("목을 포함한 몸 전체가 이완되는 효과"), 가운데 x 959. 사용자는 클립마다 90~100%로 줄여 폭 1384~1503
//      등장: 변형 효과 위치 −89px→0 (12프레임, 감속) + 불투명도 10→100 (16.7프레임, 직선). 사라짐은 클립에 건 디졸브(템플릿 아님)
//   C: 검정 불투명 상자 x450~1464 y888~1038, 두 줄 가운데 정렬 Pretendard Regular 흰 + SemiBold 노랑 (255,224,51)
//      1줄 y913~956 x613~1306 / 2줄 y971~1013 x476~1440. 등장: 상자·글자 함께 불투명도 15프레임 (가속→감속)
// 문구 칸: B "자막 텍스트" — {하늘} [초록] 표시 / C "윗줄 텍스트"·"아랫줄 텍스트" — {노랑}
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\회고\\목교정기\\tpl\\ae";
    var FPS = 29.97, FR = 1 / FPS, DUR = 10;
    var WHT = [1, 1, 1], BLK = [0, 0, 0], YEL = [1, 224 / 255, 51 / 255];
    var SKY0 = [0, 198 / 255, 1], SKY1 = [182 / 255, 239 / 255, 1], GRN0 = [84 / 255, 1, 8 / 255], GRN1 = [212 / 255, 1, 190 / 255];
    var POS_B = [-89, -83, -67, -51, -39, -30, -22, -16, -11, -7, -4.4, -2, 0];   // 프레임별 x (원본 90% 클립 실측 ÷ 0.9)
    var OP_C = [0, 1.2, 5.1, 10.9, 18.1, 26.6, 35.7, 45.3, 54.8, 64.1, 73.4, 81.5, 89.1, 94.2, 98, 100];
    var SP = 20;   // 테두리 10 글자: sourceRectAtTime 상자가 채움보다 사방 10px 큼
    var MAXW_B = 1503;   // B 채움 최대 폭 (넘으면 자동으로 줄임 — 사용자가 클립마다 90~95%로 줄이던 것)
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_info2.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function tp(L) { return L.property("ADBE Transform Group"); }
    function addText(comp, name, txt, font, fill, stroke, sw, italic) {
        var L = comp.layers.addText(txt); L.name = name;
        var st = tdoc(L), td = st.value;
        td.font = font; td.fontSize = 80; td.fillColor = fill; td.applyFill = true;
        if (stroke) { td.applyStroke = true; td.strokeColor = stroke; td.strokeWidth = sw; td.strokeOverFill = false; } else td.applyStroke = false;
        td.justification = ParagraphJustification.CENTER_JUSTIFY; td.fauxItalic = !!italic; td.tracking = 0;
        st.setValue(td);
        return L;
    }
    function setSize(L, size) { var st = tdoc(L), td = st.value; td.fontSize = size; st.setValue(td); }
    function fit(L, wd) {
        var st = tdoc(L);
        for (var k = 0; k < 4; k++) {
            var r = L.sourceRectAtTime(0, false), td = st.value;
            if (!(r.width > 1)) { w("  fit: 폭 0 — " + L.name); break; }
            var ns = td.fontSize * wd / r.width; if (ns > 400 || ns < 5) { w("  fit: 크기 이상 " + ns); break; }
            td.fontSize = ns; st.setValue(td);
        }
        return st.value.fontSize;
    }
    function placeCT(L, cx, top) { var r = L.sourceRectAtTime(0, false); tp(L).property("ADBE Position").setValue([cx - (r.left + r.width / 2), top - r.top]); }
    // 표시 레이어: 원문에서 {}[] 표시를 뺀 문구
    function stripExpr(src) { return 'var s=""+thisComp.layer("' + src + '").text.sourceText; text.sourceText.style.setText(s.replace(/[\\{\\}\\[\\]]/g,""))'; }
    // 글자별: 원문에서 open 괄호 안 글자면 1 (선택기 식). want=1 → 그 글자를 고름, want=0 → 그 밖을 고름
    function selExpr(src, open, want) {
        return 'var s=""+thisComp.layer("' + src + '").text.sourceText, m=[], on=false;\n' +
            'for (var i=0;i<s.length;i++){var c=s.charAt(i); if(c=="{"||c=="["){on=(c=="' + open + '");continue;} if(c=="}"||c=="]"){on=false;continue;} m.push(on?1:0);}\n' +
            'var v=((m[textIndex-1]||0)==' + want + ')?100:0; [v,v,v]';
    }
    function exprSelector(an, expr) {
        var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
        sel.property("ADBE Text Expressible Amount").expression = expr;
        return sel;
    }
    // 불투명도는 맨 위 조정 레이어의 변형 효과로 한 번에 — 레이어마다 따로 주면 겹친 곳(흰 글자 위 색 판, 상자 위 글자)이 나타나는 중에 더 진해짐
    // (원본 프리미어 그래픽도 그래픽 전체에 변형 효과 불투명도. 첫 시험: 3프레임 원본 26% / 레이어별 38%, 2026-10-13)
    function fadeLayer(comp, expr, keys) {
        var A = comp.layers.addSolid([1, 1, 1], "불투명도", 1920, 1080, 1, DUR); A.adjustmentLayer = true;
        var op = A.property("ADBE Effect Parade").addProperty("ADBE Geometry2").property("ADBE Geometry2-0008");
        if (expr) op.expression = expr;
        if (keys) for (var i = 0; i < keys.length; i++) op.setValueAtTime(i * FR, keys[i]);
        A.moveToBeginning();
        return A;
    }
    function exp(comp, name) {
        w("  내보내기 시작 " + name);
        var d = new Folder(OUT + "\\export_" + name); if (!d.exists) d.create();
        w(name + " export=" + comp.exportAsMotionGraphicsTemplate(true, d.fsName));
    }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        new Folder(OUT).create();
        app.newProject();
        app.project.save(new File(OUT + "\\info2.aep"));   // 저장 안 된 프로젝트에선 내보내기 false (playbook_AE변환 9장)
        w("프로젝트 저장");

        // ---------- B: 요약_색강조_한줄
        var cb = app.project.items.addComp("요약_색강조_한줄", 1920, 1080, 1, DUR, FPS);
        var SRC = addText(cb, "원문", "목을 포함한 [몸 전체가 이완되는] 효과", "Paperlogy-7Bold", WHT, null, 0, true);
        SRC.enabled = false;
        var G = addText(cb, "글자", "목을 포함한 몸 전체가 이완되는 효과", "Paperlogy-7Bold", WHT, BLK, 10, true);
        var size = fit(G, MAXW_B + SP); w("B 글자 크기 " + size);
        placeCT(G, 959, 880 - SP / 2);
        tdoc(G).expression = stripExpr("원문");
        var Gpos = tp(G).property("ADBE Position").value;
        var mattes = [];
        var spec = [["하늘", "{", SKY0, SKY1], ["초록", "[", GRN0, GRN1]];
        for (var k = 0; k < spec.length; k++) {
            var M = addText(cb, spec[k][0] + " 매트", "목을 포함한 몸 전체가 이완되는 효과", "Paperlogy-7Bold", WHT, null, 0, true);
            setSize(M, size); tp(M).property("ADBE Position").setValue(Gpos);
            tdoc(M).expression = stripExpr("원문");
            var an = M.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            an.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);
            exprSelector(an, selExpr("원문", spec[k][1], 0));   // 강조어가 아닌 글자는 투명 → 강조어 모양만 남은 매트
            mattes.push(M);
            w("  매트 " + spec[k][0]);
        }
        // 위치·크기: FIT(넘치면 줄임) → CTRL(밀어 들어오기·불투명도) → 글자·매트. 부모를 먼저 붙이고 키 (playbook 8장)
        // 줄일 때 아래 끝(y 975)을 기준으로 — 사용자가 90~95%로 줄인 클립들도 글자 아래 끝이 974~976 (위치를 내려 맞춤)
        var FIT = cb.layers.addNull(); FIT.name = "FIT"; tp(FIT).property("ADBE Position").setValue([959, 975]);
        var CT = cb.layers.addNull(); CT.name = "CTRL"; tp(CT).property("ADBE Position").setValue([959, 975]);
        CT.parent = FIT;
        G.parent = CT; for (var m2 = 0; m2 < mattes.length; m2++) mattes[m2].parent = CT;
        tp(FIT).property("ADBE Scale").expression = 'var r=thisComp.layer("글자").sourceRectAtTime(time,false); var k=Math.min(100,' + (MAXW_B + SP) + '/Math.max(1,r.width)*100); [k,k]';
        var cp = tp(CT).property("ADBE Position");
        for (var f = 0; f < POS_B.length; f++) cp.setValueAtTime(f * FR, [POS_B[f], 0]);
        var co = tp(CT).property("ADBE Opacity"); co.setValueAtTime(0, 10); co.setValueAtTime(16.7 * FR, 100);
        w("  움직임 B");
        // 색 판(세로 그라데이션) + 매트
        for (var k2 = 0; k2 < spec.length; k2++) {
            var S = cb.layers.addSolid(WHT, spec[k2][0] + " 색", 1920, 1080, 1, DUR);
            var rp = S.property("ADBE Effect Parade").addProperty("ADBE Ramp");
            var yTop = 'var L=thisComp.layer("글자"), r=L.sourceRectAtTime(time,false);', pad = SP / 2;
            rp.property("ADBE Ramp-0001").expression = yTop + ' [960, L.toComp([0, r.top+' + pad + '])[1]]';
            rp.property("ADBE Ramp-0002").setValue(spec[k2][2]);
            rp.property("ADBE Ramp-0003").expression = yTop + ' [960, L.toComp([0, r.top+r.height-' + pad + '])[1]]';
            rp.property("ADBE Ramp-0004").setValue(spec[k2][3]);
            S.setTrackMatte(mattes[k2], TrackMatteType.ALPHA);
            w("  색 판 " + spec[k2][0]);
        }
        fadeLayer(cb, 'thisComp.layer("CTRL").transform.opacity', null);
        w("  불투명도 조정 레이어 B");
        w("  항목 등록 자막 텍스트");
        tdoc(SRC).addToMotionGraphicsTemplateAs(cb, "자막 텍스트");
        exp(cb, "Summary");

        // ---------- C: 정보바_2줄
        var cc = app.project.items.addComp("정보바_2줄", 1920, 1080, 1, DUR, FPS);
        var A1 = addText(cc, "윗줄 원문", "내 몸을 되살릴 {통증 없는 운동의 시작}", "Pretendard-Regular", WHT, null, 0, false);
        var A2 = addText(cc, "아랫줄 원문", "{제품}이 궁금하시다면 고정댓글 링크를 확인해주세요", "Pretendard-Regular", WHT, null, 0, false);
        A1.enabled = false; A2.enabled = false;
        var D2 = addText(cc, "아랫줄", "제품이 궁금하시다면 고정댓글 링크를 확인해주세요", "Pretendard-Regular", WHT, WHT, 0.5, false);
        var cs = fit(D2, 965); w("C 글자 크기 " + cs);
        var D1 = addText(cc, "윗줄", "내 몸을 되살릴 통증 없는 운동의 시작", "Pretendard-Regular", WHT, WHT, 0.5, false);
        setSize(D1, cs);
        placeCT(D1, 959.5, 913); placeCT(D2, 958, 971);
        var pairs = [[D1, "윗줄 원문"], [D2, "아랫줄 원문"]];
        for (var q = 0; q < pairs.length; q++) {
            var DL = pairs[q][0];
            tdoc(DL).expression = stripExpr(pairs[q][1]);
            var an2 = DL.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            var ap = an2.property("ADBE Text Animator Properties");
            ap.addProperty("ADBE Text Fill Color").setValue(YEL);
            ap.addProperty("ADBE Text Stroke Color").setValue(YEL);
            ap.addProperty("ADBE Text Stroke Width").setValue(1.6);   // SemiBold 굵기 흉내 (정보바_세트안내와 같음)
            exprSelector(an2, selExpr(pairs[q][1], "{", 1));
        }
        w("  C 강조");
        // 상자: 두 줄을 감싸는 폭 + 측정한 여백 (지금 문구에서 원본 상자 x450~1464와 같아지게 여백을 계산), 세로는 고정 y888~1038
        var r1 = D1.sourceRectAtTime(0, false), r2 = D2.sourceRectAtTime(0, false), p1 = tp(D1).property("ADBE Position").value, p2 = tp(D2).property("ADBE Position").value;
        var l0 = Math.min(p1[0] + r1.left, p2[0] + r2.left), rr0 = Math.max(p1[0] + r1.left + r1.width, p2[0] + r2.left + r2.width);
        var padx = 1015 - (rr0 - l0), offx = 957 - (l0 + rr0) / 2;
        w("  C 상자 여백 " + padx + " 가운데 보정 " + offx);
        var bx = cc.layers.addShape(); bx.name = "상자";
        var g = bx.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var rc = g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(BLK);
        var U = 'var a=thisComp.layer("윗줄"), b=thisComp.layer("아랫줄"), ra=a.sourceRectAtTime(time,false), rb=b.sourceRectAtTime(time,false);' +
            'var l=Math.min(a.toComp([ra.left,0])[0], b.toComp([rb.left,0])[0]), r=Math.max(a.toComp([ra.left+ra.width,0])[0], b.toComp([rb.left+rb.width,0])[0]);';
        // 채움을 더하면 앞서 잡은 사각형 참조가 무효가 됨 → 다시 찾음
        bx.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property("ADBE Vector Rect Size").expression = U + ' [r-l+' + padx + ', 151]';
        tp(bx).property("ADBE Position").expression = U + ' [(l+r)/2+' + offx + ', 963]';
        bx.moveToEnd();
        fadeLayer(cc, null, OP_C);
        w("  움직임 C");
        w("  항목 등록 윗줄·아랫줄");
        tdoc(A1).addToMotionGraphicsTemplateAs(cc, "윗줄 텍스트");
        tdoc(A2).addToMotionGraphicsTemplateAs(cc, "아랫줄 텍스트");
        exp(cc, "InfoBar2");
        app.project.save(new File(OUT + "\\info2.aep"));
        w("Info2 export 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
