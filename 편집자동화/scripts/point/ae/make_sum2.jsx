// 포인트 에이전트 — 사용자 종편(자세교정)의 요약 2단 그래픽을 AE 템플릿 3색으로 (2026-10-13 사용자 승인: 회고 8장 4번 "나머지는 말한대로 진행하자")
// 요약_2단_빨강 / 요약_2단_노랑 / 요약_2단_초록 — 칸 "윗줄 텍스트"(작은 흰 글자) / "아랫줄 텍스트"(큰 그라데이션 글자)
// 실행: run_ae.ps1 <이 파일> <결과 txt> "Sum2 export" 360. 내보내기 OUT\export_<이름> → finish_mogrt.py
// 원본 측정 (work/회고/자세교정/tpl, 그래픽만 렌더 + 켬/끔 비교):
//   윗줄 Paperlogy-6SemiBold 흰 + 검정 테두리, 채움 y794~862, 왼쪽 = 아랫줄 왼쪽 + 24
//   아랫줄 Paperlogy-7Bold 기울임 + 검정 테두리 10, 가운데 x958, 채움 y882~982. 세로 그라데이션 (위 → 아래)
//     빨강 (255,58,38)→(255,255,255) / 노랑 (243,255,18)→(254,255,240) / 초록 (93,255,0)→(235,255,225)
//   등장(노랑·초록 3곳): 왼쪽 90px에서 22프레임 감속 + 불투명도 10→100 20.5프레임 (빨강 1곳은 아래에서 튀어 오름 — 다수 방식으로 통일)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\회고\\자세교정\\tpl\\ae";
    var FPS = 29.97, FR = 1 / FPS, DUR = 10;
    var WHT = [1, 1, 1], BLK = [0, 0, 0];
    var V = [["빨강", "Red", [255, 58, 38], [255, 255, 255], "강제로", "호흡을 얕아지게 만들어버림"],
             ["노랑", "Yellow", [243, 255, 18], [254, 255, 240], "힘이 안 들어가서", "편안하게 오랫동안 자세 유지 가능"],
             ["초록", "Green", [79, 255, 0], [221, 255, 203], "바른 자세로", "보내는 절대적인 시간이 중요함"]];   // 초록 원본은 직선 그라데이션이 아님(가운데까지 진하다가 아래에서 하얘짐) → 8·50·92% 세 점에 최소제곱으로 맞춘 끝 색 (2026-10-13 비교)
    var POS = [-90, -82, -75, -67, -59.5, -51.5, -45.5, -40, -34.5, -30, -26.5, -23, -19.5, -16.5, -13.5, -11, -8.5, -6.5, -4.5, -3, -2, -1, 0];
    var SP = 20, MAXW = 1500;
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_sum2.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function c255(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function tp(L) { return L.property("ADBE Transform Group"); }
    function addText(comp, name, txt, font, stroke, italic, just) {
        var L = comp.layers.addText(txt); L.name = name;
        var st = tdoc(L), td = st.value;
        td.font = font; td.fontSize = 80; td.fillColor = WHT; td.applyFill = true;
        if (stroke) { td.applyStroke = true; td.strokeColor = BLK; td.strokeWidth = 10; td.strokeOverFill = false; } else td.applyStroke = false;
        td.justification = just; td.fauxItalic = !!italic; td.tracking = 0;
        st.setValue(td);
        return L;
    }
    function setSize(L, s) { var st = tdoc(L), td = st.value; td.fontSize = s; st.setValue(td); }
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
        app.project.save(new File(OUT + "\\sum2.aep"));
        w("프로젝트 저장");
        var LEFT = ParagraphJustification.LEFT_JUSTIFY, CEN = ParagraphJustification.CENTER_JUSTIFY;
        // 글자 크기는 초록 원본 문구로 한 번 정하고 3색 같게 (아랫줄 채움 폭 1351 "보내는 절대적인 시간이 중요함", 윗줄 359 "바른 자세로")
        var sizeB = 0, sizeT = 0;
        for (var i = 0; i < V.length; i++) {
            var v = V[i];
            var cp = app.project.items.addComp("요약_2단_" + v[0], 1920, 1080, 1, DUR, FPS);
            var B = addText(cp, "아랫줄", "보내는 절대적인 시간이 중요함", "Paperlogy-7Bold", true, true, CEN);
            var T = addText(cp, "윗줄", "바른 자세로", "Paperlogy-6SemiBold", true, false, LEFT);
            if (!sizeB) { sizeB = fit(B, 1351 + SP); sizeT = fit(T, 359 + SP); w("크기 아랫줄 " + sizeB + " 윗줄 " + sizeT); }
            else { setSize(B, sizeB); setSize(T, sizeT); }
            var rb = B.sourceRectAtTime(0, false), rt = T.sourceRectAtTime(0, false);
            // 폭은 같은데 높이가 원본보다 3% 낮게 나옴(B 요약_색강조_한줄도 같음) → 아랫줄 세로 103%, 채움 위 끝 y882에 맞춤
            tp(B).property("ADBE Scale").setValue([100, 103]);
            tp(B).property("ADBE Position").setValue([958 - (rb.left + rb.width / 2), 882 - (SP / 2 + rb.top) * 1.03]);
            tp(T).property("ADBE Position").setValue([0, 794 - SP / 2 - rt.top]);
            // 원본 문구를 기본값으로
            var sb = tdoc(B), db = sb.value; db.text = v[5]; sb.setValue(db);
            var stt = tdoc(T), dt = stt.value; dt.text = v[4]; stt.setValue(dt);
            // 윗줄 왼쪽 = 아랫줄 왼쪽 + 24 (문구가 바뀌어도 따라감)
            tp(T).property("ADBE Position").expression = 'var B=thisComp.layer("아랫줄"), rb=B.sourceRectAtTime(time,false), r=sourceRectAtTime(time,false); [B.transform.position[0]+rb.left-r.left+24, value[1]]';
            // 그라데이션 매트: 아랫줄과 같은 글자(채움만)
            var M = addText(cp, "아랫줄 매트", v[5], "Paperlogy-7Bold", false, true, CEN);
            setSize(M, sizeB); tp(M).property("ADBE Scale").setValue([100, 103]); tp(M).property("ADBE Position").setValue(tp(B).property("ADBE Position").value);
            tdoc(M).expression = 'thisComp.layer("아랫줄").text.sourceText';
            w("  " + v[0] + " 글자");
            var FIT = cp.layers.addNull(); FIT.name = "FIT"; tp(FIT).property("ADBE Position").setValue([958, 982]);
            var CT = cp.layers.addNull(); CT.name = "CTRL"; tp(CT).property("ADBE Position").setValue([958, 982]);
            CT.parent = FIT; B.parent = CT; T.parent = CT; M.parent = CT;
            tp(FIT).property("ADBE Scale").expression = 'var r=thisComp.layer("아랫줄").sourceRectAtTime(time,false); var k=Math.min(100,' + (MAXW + SP) + '/Math.max(1,r.width)*100); [k,k]';
            var pp = tp(CT).property("ADBE Position");
            for (var f = 0; f < POS.length; f++) pp.setValueAtTime(f * FR, [POS[f], 0]);
            var S = cp.layers.addSolid(WHT, v[0] + " 색", 1920, 1080, 1, DUR);
            var rp = S.property("ADBE Effect Parade").addProperty("ADBE Ramp");
            var yy = 'var L=thisComp.layer("아랫줄"), r=L.sourceRectAtTime(time,false);';
            rp.property("ADBE Ramp-0001").expression = yy + ' [960, L.toComp([0, r.top+' + SP / 2 + '])[1]]';
            rp.property("ADBE Ramp-0002").setValue(c255(v[2]));
            rp.property("ADBE Ramp-0003").expression = yy + ' [960, L.toComp([0, r.top+r.height-' + SP / 2 + '])[1]]';
            rp.property("ADBE Ramp-0004").setValue(c255(v[3]));
            S.setTrackMatte(M, TrackMatteType.ALPHA);
            // 불투명도는 맨 위 조정 레이어 변형 효과로 한 번에 (playbook_AE변환 10장)
            var A = cp.layers.addSolid(WHT, "불투명도", 1920, 1080, 1, DUR); A.adjustmentLayer = true;
            var op = A.property("ADBE Effect Parade").addProperty("ADBE Geometry2").property("ADBE Geometry2-0008");
            op.setValueAtTime(0, 10); op.setValueAtTime(20.5 * FR, 100);
            A.moveToBeginning();
            w("  " + v[0] + " 움직임·색");
            tdoc(T).addToMotionGraphicsTemplateAs(cp, "윗줄 텍스트");
            tdoc(B).addToMotionGraphicsTemplateAs(cp, "아랫줄 텍스트");
            exp(cp, v[1]);
        }
        app.project.save(new File(OUT + "\\sum2.aep"));
        w("Sum2 export 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
