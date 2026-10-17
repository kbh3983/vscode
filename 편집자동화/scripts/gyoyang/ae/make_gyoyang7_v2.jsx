// 교양 에이전트 — 지식인사이드 「지식인 클래스」 스타일 그래픽 템플릿 7종 v2 (AE → .mogrt)
// v2 (2026-10-17, 사용자 피드백: "폰트나 사이즈, 색상 등 디테일 수정이 불가한 상태인 것 같아서, 그런 것들은 모두 개별 수정 되도록 템플릿 수정해줘")
//   - 글자 칸마다 "<칸> 색" (맨 앞 텍스트 애니메이터 칠 색 — 뒤의 {강조} 애니메이터가 이김), 상자·선은 "강조 색"·"<상자> 색"
//   - 숨은 원문을 따라가는 표시 글자(큰자막·웃음)는 원문의 style(폰트·크기·자간)을 그대로 받음 → 프리미어에서 원문 칸 폰트·크기 바꾸면 화면에 반영
//   - 모든 템플릿에 "전체 크기(%)"·"위치 이동" (맨 아래 널 "전체"가 부모)
//   - 프리미어 폰트·크기 수정 허용은 finish_mogrt.py가 켬 (capParams까지 — 2026-10-17 고침)
// 모양·위치·움직임 기본값은 v1(make_gyoyang7.jsx)과 같음. 측정 근거도 v1 머리말
// 실행: scripts/point/ae/run_ae.ps1 <이 파일> <OUT\result.txt> "Gyoyang v2 끝|ERR" 900
//   → OUT\export_<이름> → finish_mogrt.py <폴더> "교양_<이름>_AE" "<표시 이름>" <OUT\thumb_<이름>.png> 0
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\지식인사이드\\tpl_v2";
    var FPS = 29.97, FR = 1 / FPS;
    var WHT = [1, 1, 1], BLK = [0, 0, 0], PEACH = [245 / 255, 201 / 255, 151 / 255], DARK = [0.11, 0.11, 0.115], INK = [0.08, 0.08, 0.08];
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function tp(L, m) { return L.property("ADBE Transform Group").property(m); }
    function addText(comp, name, txt, font, size, fill, just) {
        var L = comp.layers.addText(txt); L.name = name;
        var st = tdoc(L), td = st.value;
        td.font = font; td.fontSize = size; td.fillColor = fill; td.applyFill = true; td.applyStroke = false; td.tracking = -10;
        td.justification = just == "L" ? ParagraphJustification.LEFT_JUSTIFY : (just == "R" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY);
        st.setValue(td);
        if (tdoc(L).value.font != font) w("  주의 폰트 " + name + ": " + font + " → " + tdoc(L).value.font);
        return L;
    }
    function shadow(L, dist, soft, op) { var e = L.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow"); e.property("ADBE Drop Shadow-0002").setValue(op * 2.55); e.property("ADBE Drop Shadow-0004").setValue(dist); e.property("ADBE Drop Shadow-0005").setValue(soft); return e; }
    function rect(comp, name, col, radius) {
        var S = comp.layers.addShape(); S.name = name;
        var g = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(col);
        var r = S.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1);
        if (radius) r.property("ADBE Vector Rect Roundness").setValue(radius);
        return S;
    }
    function rectProp(S, m) { return S.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property(m); }
    function fillOf(S) { return S.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(2).property("ADBE Vector Fill Color"); }
    // v2: 원문의 style(폰트·크기·자간)을 받아 {} 만 지움
    function strip(src) { return 'var p=thisComp.layer("' + src + '").text.sourceText; p.style.setText((""+p).replace(/[\\{\\}]/g,""))'; }
    function selExpr(src) {
        return 'var s=""+thisComp.layer("' + src + '").text.sourceText, m=[], on=false;\n' +
            'for (var i=0;i<s.length;i++){var c=s.charAt(i); if(c=="{"){on=true;continue;} if(c=="}"){on=false;continue;} m.push(on?1:0);}\n' +
            'var v=(m[textIndex-1]||0)?100:0; [v,v,v]';
    }
    function accent(comp, L, src, colRef) {
        tdoc(L).expression = strip(src);
        var an = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); an.name = "강조";
        an.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = colRef;
        var sel = L.property("ADBE Text Properties").property("ADBE Text Animators").property("강조").property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
        sel.property("ADBE Text Expressible Amount").expression = selExpr(src);
    }
    function ctl(comp) { for (var i = 1; i <= comp.numLayers; i++) if (comp.layer(i).name == "템플릿 조절") return comp.layer(i); var N = comp.layers.addNull(comp.duration); N.name = "템플릿 조절"; N.moveToEnd(); return N; }
    var ORDER;
    function addCtl(comp, type, name, v) { var e = ctl(comp).property("ADBE Effect Parade").addProperty(type); e.name = name; e.property(1).setValue(type == "ADBE Color Control" ? [v[0], v[1], v[2], 1] : v); ORDER.push(name); return 'thisComp.layer("템플릿 조절").effect("' + name + '")(1)'; }
    function rgb(ref) { return "[" + ref + "[0]," + ref + "[1]," + ref + "[2]]"; }
    // 글자 색 칸: 맨 앞 애니메이터 "색 바꾸기"
    function textColor(comp, L, name, def) {
        var ref = addCtl(comp, "ADBE Color Control", name, def);
        var an = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); an.name = "색 바꾸기";
        var A = L.property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기");
        A.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        A = L.property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기");
        A.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = ref;
        try { L.property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").moveTo(1); } catch (e) { w("  주의 색 애니메이터 순서 " + L.name); }
        return ref;
    }
    // 전체 크기·위치: 널 "전체"(기준점 cx,cy)를 부모로 — 이미 부모가 있는 레이어·조정 레이어·숨은 원문은 그대로
    function master(comp, cx, cy) {
        var sc = addCtl(comp, "ADBE Slider Control", "전체 크기(%)", 100);
        var hasMv = false, fx = ctl(comp).property("ADBE Effect Parade");
        for (var q = 1; q <= fx.numProperties; q++) if (fx.property(q).name == "위치 이동") hasMv = true;
        var mv = hasMv ? 'thisComp.layer("템플릿 조절").effect("위치 이동")(1)' : addCtl(comp, "ADBE Point Control", "위치 이동", [0, 0]);
        var P = comp.layers.addNull(comp.duration); P.name = "전체";
        tp(P, "ADBE Anchor Point").setValue([cx, cy]); tp(P, "ADBE Position").setValue([cx, cy]);
        tp(P, "ADBE Scale").expression = 'var k=' + sc + '; [k,k]';
        tp(P, "ADBE Position").expression = 'value+' + mv;
        for (var i = 1; i <= comp.numLayers; i++) { var L = comp.layer(i); if (L.name == "전체" || L.name == "템플릿 조절" || L.adjustmentLayer || L.guideLayer || L.parent) continue; L.parent = P; }
        P.moveToEnd();
        return hasMv;
    }
    function entrance(comp, frames, blur, extraPosY) {
        var A = comp.layers.addSolid(WHT, "등장", 1920, 1080, 1, comp.duration); A.adjustmentLayer = true;
        var fx = A.property("ADBE Effect Parade");
        var tr = fx.addProperty("ADBE Geometry2");
        var op = tr.property("ADBE Geometry2-0008"); op.setValueAtTime(0, 0); op.setValueAtTime(frames * FR, 100);
        if (extraPosY) { var pp = tr.property("ADBE Geometry2-0002"); pp.setValueAtTime(0, [960, 540 + extraPosY]); pp.setValueAtTime(frames * FR, [960, 540]); pp.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER); var e = new KeyframeEase(0, 75); pp.setTemporalEaseAtKey(2, [e]); }
        if (blur) { var b = fx.addProperty("ADBE Gaussian Blur 2"); var bb = b.property(1); bb.setValueAtTime(0, blur); bb.setValueAtTime(Math.max(3, frames - 2) * FR, 0); b.property(3).setValue(1); }
        A.moveToBeginning();
        return A;
    }
    function reg(comp, name, label) { tdoc(comp.layer(name)).addToMotionGraphicsTemplateAs(comp, label); }
    function regCtl(comp) { var N = ctl(comp); for (var i = 0; i < ORDER.length; i++) N.property("ADBE Effect Parade").property(ORDER[i]).property(1).addToMotionGraphicsTemplateAs(comp, ORDER[i]); }
    function findComp(n) { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem && app.project.item(i).name == n) return app.project.item(i); return null; }
    function done(n) { return new File(OUT + "\\export_" + n + "\\done.txt").exists; }
    function exportComp(n, thumbT) {
        var c = findComp(n);
        var png = new File(OUT + "\\thumb_" + n + ".png"); if (png.exists) png.remove();
        c.saveFrameToPng(thumbT, png); for (var z = 0; z < 60 && !png.exists; z++) $.sleep(500);
        c = findComp(n);
        var d = new Folder(OUT + "\\export_" + n); if (!d.exists) d.create();
        w("  내보내기 시작 " + n);
        var ok = c.exportAsMotionGraphicsTemplate(true, d.fsName);
        w(n + " export=" + ok);
        if (ok) { var f = new File(d.fsName + "\\done.txt"); f.open("w"); f.write("ok"); f.close(); }
    }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        new Folder(OUT).create();
        app.newProject();
        app.project.save(new File(OUT + "\\gyoyang7_v2.aep"));
        w("프로젝트 저장");
        var made = [];

        // 1. 소제목 띠 (좌상단, 120초)
        if (!done("소제목띠")) {
            ORDER = [];
            var c = app.project.items.addComp("소제목띠", 1920, 1080, 1, 120, FPS);
            var acc = addCtl(c, "ADBE Color Control", "강조 색 (선·태그 바탕)", PEACH);
            var line = rect(c, "세로선", PEACH, 0); rectProp(line, "ADBE Vector Rect Size").setValue([4, 105]); tp(line, "ADBE Position").setValue([26, 76.5]);
            fillOf(line).expression = acc;
            var T = addText(c, "소제목", "영화 '오디세이' 결말에 숨겨진 진짜 의미", "Pretendard-SemiBold", 44, WHT, "L"); tp(T, "ADBE Position").setValue([50, 56]);
            shadow(T, 2, 10, 45);
            textColor(c, c.layer("소제목"), "소제목 색", WHT);
            var G = addText(c, "이름 태그", "○○○ 교수", "Pretendard-Bold", 33, BLK, "L"); tp(G, "ADBE Position").setValue([58, 112]);
            textColor(c, c.layer("이름 태그"), "이름 태그 색", BLK);
            var bg = rect(c, "태그 바탕", PEACH, 6);
            fillOf(bg).expression = acc;
            rectProp(bg, "ADBE Vector Rect Size").expression = 'var L=thisComp.layer("이름 태그"), r=L.sourceRectAtTime(time,false), s=L.transform.scale[0]/100; [r.width*s+16, 45*s]';
            tp(bg, "ADBE Position").expression = 'var L=thisComp.layer("이름 태그"), r=L.sourceRectAtTime(time,false), s=L.transform.scale[0]/100; [L.toComp([r.left,0])[0]-8+(r.width*s+16)/2, L.toComp([0,r.top+r.height/2])[1]]';
            bg.moveAfter(c.layer("이름 태그"));
            master(c, 26, 76);
            entrance(c, 8, 0, 0);
            reg(c, "소제목", "소제목"); reg(c, "이름 태그", "이름 태그"); regCtl(c);
            made.push(["소제목띠", 2]); w("1 소제목띠");
        }
        // 2. 이름 자막 (15초)
        if (!done("이름자막")) {
            ORDER = [];
            var c = app.project.items.addComp("이름자막", 1920, 1080, 1, 15, FPS);
            var N = addText(c, "이름", "○○○", "Pretendard-ExtraBold", 84, BLK, "L"); tp(N, "ADBE Position").setValue([156, 572]);
            textColor(c, c.layer("이름"), "이름 색", BLK);
            var H = addText(c, "호칭", "교수", "Pretendard-Medium", 40, BLK, "L");
            tp(H, "ADBE Position").expression = 'var L=thisComp.layer("이름"), r=L.sourceRectAtTime(time,false); [r.left+r.width+16+L.transform.position[0], L.transform.position[1]]';
            textColor(c, c.layer("호칭"), "호칭 색", BLK);
            var paper = rect(c, "종이", WHT, 2);
            fillOf(paper).expression = addCtl(c, "ADBE Color Control", "종이 색", WHT);
            rectProp(paper, "ADBE Vector Rect Size").expression = 'var a=thisComp.layer("이름"), b=thisComp.layer("호칭"), ra=a.sourceRectAtTime(time,false), rb=b.sourceRectAtTime(time,false); var l=a.transform.position[0]+ra.left, r=b.transform.position[0]+rb.left+rb.width; [r-l+48, Math.max(ra.height,rb.height)+46]';
            tp(paper, "ADBE Position").expression = 'var a=thisComp.layer("이름"), b=thisComp.layer("호칭"), ra=a.sourceRectAtTime(time,false), rb=b.sourceRectAtTime(time,false); var l=a.transform.position[0]+ra.left, r=b.transform.position[0]+rb.left+rb.width; [(l+r)/2, a.transform.position[1]+ra.top+ra.height/2-16]   // v1 기본값과 같게 (글자보다 위로 16px)';
            tp(paper, "ADBE Rotate Z").setValue(-0.6);
            paper.property("ADBE Effect Parade").addProperty("ADBE Roughen Edges").property(4).setValue(3);
            paper.moveToEnd();
            var D1 = addText(c, "설명1", "○○대학교 ○○학과 교수", "Pretendard-Regular", 38, WHT, "L"); tp(D1, "ADBE Position").setValue([149, 636]);
            var D2 = addText(c, "설명2", "저서 <○○○○>", "Pretendard-Regular", 38, WHT, "L"); tp(D2, "ADBE Position").setValue([149, 688]);
            shadow(D1, 2, 10, 55); shadow(D2, 2, 10, 55);
            textColor(c, c.layer("설명1"), "설명 색", WHT);
            var A2 = c.layer("설명2").property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A2.name = "색 바꾸기";
            var A2b = c.layer("설명2").property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기"); A2b.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            c.layer("설명2").property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = 'thisComp.layer("템플릿 조절").effect("설명 색")(1)';
            master(c, 149, 572);
            entrance(c, 12, 0, 40);
            reg(c, "이름", "이름"); reg(c, "호칭", "호칭"); reg(c, "설명1", "설명 1줄"); reg(c, "설명2", "설명 2줄"); regCtl(c);
            made.push(["이름자막", 1]); w("2 이름자막");
        }
        // 3. 큰 강조 자막 (15초) — {단어} 강조 색, 원문 칸의 폰트·크기가 화면 글자에 반영
        if (!done("큰자막")) {
            ORDER = [];
            var c = app.project.items.addComp("큰자막", 1920, 1080, 1, 15, FPS);
            var SRC = addText(c, "원문", "조회수 {100만} 돌파", "Pretendard-ExtraBold", 104, WHT, "C"); SRC.enabled = false; SRC.guideLayer = true;
            var D = addText(c, "글자", "조회수 100만 돌파", "Pretendard-ExtraBold", 104, WHT, "C");
            textColor(c, c.layer("글자"), "글자 색", WHT);
            var acc = addCtl(c, "ADBE Color Control", "강조 색 ({} 안)", PEACH);
            accent(c, c.layer("글자"), "원문", acc);
            D = c.layer("글자");
            tp(D, "ADBE Position").setValue([960, 1012]);
            tp(D, "ADBE Scale").expression = 'var r=sourceRectAtTime(time,false); var k=Math.min(100,1720/Math.max(1,r.width)*100); var p=linear(time,0,4*thisComp.frameDuration,112,100); [k*p/100,k*p/100]';
            tp(D, "ADBE Anchor Point").expression = 'var r=sourceRectAtTime(time,false); [r.left+r.width/2, 0]';
            shadow(D, 3, 18, 75);
            master(c, 960, 1012);
            entrance(c, 5, 18, 0);
            reg(c, "원문", "자막 ({}=강조)"); regCtl(c);
            made.push(["큰자막", 1]); w("3 큰자막");
        }
        // 4. 인용 카드 (15초) — 어둡게 + “ 문구 ”
        if (!done("인용카드")) {
            ORDER = [];
            var c = app.project.items.addComp("인용카드", 1920, 1080, 1, 15, FPS);
            var dk = addCtl(c, "ADBE Slider Control", "배경 어둡게(%)", 50);
            var S = c.layers.addSolid(BLK, "어둡게", 1920, 1080, 1, 15); tp(S, "ADBE Opacity").expression = dk;
            S.property("ADBE Effect Parade").addProperty("ADBE Fill").property("ADBE Fill-0002").expression = addCtl(c, "ADBE Color Control", "배경 색", BLK);
            var Q = addText(c, "문구", "나도 칼립소랑 7년 살고 싶다", "Pretendard-SemiBold", 66, WHT, "C");
            tp(Q, "ADBE Position").setValue([960, 560]);
            var td = tdoc(Q).value; td.leading = 92; tdoc(Q).setValue(td);
            shadow(Q, 2, 14, 60);
            var qc = textColor(c, c.layer("문구"), "문구 색", WHT);
            var O = addText(c, "여는 따옴표", "\u201C", "Georgia-Bold", 130, WHT, "C");
            tp(O, "ADBE Position").expression = 'var L=thisComp.layer("문구"), r=L.sourceRectAtTime(time,false); [L.transform.position[0]+r.left+r.width/2, L.transform.position[1]+r.top+6]';
            var Cq = addText(c, "닫는 따옴표", "\u201D", "Georgia-Bold", 130, WHT, "C");
            tp(Cq, "ADBE Position").expression = 'var L=thisComp.layer("문구"), r=L.sourceRectAtTime(time,false); [L.transform.position[0]+r.left+r.width/2, L.transform.position[1]+r.top+r.height+128]';
            var oc = addCtl(c, "ADBE Color Control", "따옴표 색", WHT);
            var nm = ["여는 따옴표", "닫는 따옴표"];
            for (var q = 0; q < 2; q++) { var LL = c.layer(nm[q]); var an = LL.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); an.name = "색 바꾸기"; LL.property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").property("ADBE Text Selectors").addProperty("ADBE Text Selector"); c.layer(nm[q]).property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = oc; }
            c.layer("어둡게").moveToEnd();
            c.layer("어둡게").locked = false;
            master(c, 960, 560);
            c.layer("어둡게").parent = null;   // 배경은 화면 전체 고정
            entrance(c, 6, 14, 0);
            reg(c, "문구", "인용 문구"); regCtl(c);
            made.push(["인용카드", 1]); w("4 인용카드");
        }
        // 5. Question 카드 (15초)
        if (!done("Question")) {
            ORDER = [];
            var c = app.project.items.addComp("Question", 1920, 1080, 1, 15, FPS);
            var acc = addCtl(c, "ADBE Color Control", "강조 색 (라벨 바탕·2줄)", PEACH);
            var lab = addText(c, "라벨", "Question.", "Georgia-Bold", 44, BLK, "L"); tp(lab, "ADBE Position").setValue([118, 728]);
            textColor(c, c.layer("라벨"), "라벨 글자 색", BLK);
            var lbg = rect(c, "라벨 바탕", PEACH, 12);
            fillOf(lbg).expression = acc;
            rectProp(lbg, "ADBE Vector Rect Size").expression = 'var L=thisComp.layer("라벨"), r=L.sourceRectAtTime(time,false); [r.width+26, r.height+22]';
            tp(lbg, "ADBE Position").expression = 'var L=thisComp.layer("라벨"), r=L.sourceRectAtTime(time,false); [L.transform.position[0]+r.left-13+(r.width+26)/2, L.transform.position[1]+r.top+r.height/2-3]';
            lbg.moveAfter(c.layer("라벨"));
            var L1 = addText(c, "1줄", "다시 길을 떠나는 결말,", "Pretendard-ExtraBold", 100, WHT, "L"); tp(L1, "ADBE Position").setValue([104, 868]);
            textColor(c, c.layer("1줄"), "1줄 색", WHT);
            var L2 = addText(c, "2줄", "무슨 의미일까?", "Pretendard-ExtraBold", 100, PEACH, "L"); tp(L2, "ADBE Position").setValue([104, 996]);
            var an2 = c.layer("2줄").property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); an2.name = "색 바꾸기";
            c.layer("2줄").property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            c.layer("2줄").property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = acc;
            shadow(c.layer("1줄"), 3, 16, 60); shadow(c.layer("2줄"), 3, 16, 60);
            master(c, 104, 868);
            entrance(c, 6, 16, 0);
            reg(c, "1줄", "1줄"); reg(c, "2줄", "2줄 (강조색)"); reg(c, "라벨", "라벨"); regCtl(c);
            made.push(["Question", 1]); w("5 Question");
        }
        // 6. 칠판 패널 (왼쪽 1/3, 15초) — 항목이 정한 초에 하나씩
        if (!done("칠판패널")) {
            ORDER = [];
            var c = app.project.items.addComp("칠판패널", 1920, 1080, 1, 15, FPS);
            var acc = addCtl(c, "ADBE Color Control", "강조 색 (제목 바탕)", PEACH);
            var refs = [];
            for (var k = 2; k <= 4; k++) refs[k] = addCtl(c, "ADBE Slider Control", "항목" + k + " 등장(초)", (k - 1) * 2.5);
            var pc = addCtl(c, "ADBE Color Control", "칠판 색", DARK);
            var P = c.layers.addShape(); P.name = "칠판";
            var g = P.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
            var pth = g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
            var sh = new Shape(), V = [[-10, -10]], rnd = 7;
            for (var y = -10; y <= 1090; y += 18) { rnd = (rnd * 9301 + 49297) % 233280; V.push([650 + (rnd / 233280) * 28 - 14, y]); }
            V.push([-10, 1090]); sh.vertices = V; sh.closed = true; pth.property("ADBE Vector Shape").setValue(sh);
            tp(P, "ADBE Position").setValue([0, 0]);
            g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
            c.layer("칠판").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(2).property("ADBE Vector Fill Color").expression = pc;
            c.layer("칠판").property("ADBE Effect Parade").addProperty("ADBE Drop Shadow").property("ADBE Drop Shadow-0005").setValue(30);
            var grain = c.layers.addSolid(WHT, "질감", 1920, 1080, 1, 15);
            var fn = grain.property("ADBE Effect Parade").addProperty("ADBE Fractal Noise"); fn.property("ADBE Fractal Noise-0005").setValue(12);
            grain.blendingMode = BlendingMode.OVERLAY; tp(grain, "ADBE Opacity").setValue(14);
            grain.moveBefore(c.layer("칠판"));
            try { grain.setTrackMatte(c.layer("칠판"), TrackMatteType.ALPHA); c.layer("칠판").enabled = true; } catch (e) { w("  질감 매트 생략 " + e.message); }
            var TT = addText(c, "제목", "오디세우스의 여정", "Pretendard-Bold", 42, BLK, "L"); tp(TT, "ADBE Position").setValue([70, 214]);
            textColor(c, c.layer("제목"), "제목 글자 색", BLK);
            var tb = rect(c, "제목 바탕", PEACH, 6);
            fillOf(tb).expression = acc;
            rectProp(tb, "ADBE Vector Rect Size").expression = 'var L=thisComp.layer("제목"), r=L.sourceRectAtTime(time,false); [r.width+24, r.height+24]';
            tp(tb, "ADBE Position").expression = 'var L=thisComp.layer("제목"), r=L.sourceRectAtTime(time,false); [L.transform.position[0]+r.left-12+(r.width+24)/2, L.transform.position[1]+r.top+r.height/2]';
            tb.moveAfter(c.layer("제목"));
            var ic = addCtl(c, "ADBE Color Control", "항목 색", WHT);
            var items = ["전쟁 10년", "→ 방랑 10년", "→ 고향 이타카", "→ 다시 떠남?"];
            for (var k = 1; k <= 4; k++) {
                var I = addText(c, "항목" + k, items[k - 1], "Pretendard-SemiBold", 46, WHT, "L"); tp(I, "ADBE Position").setValue([70, 330 + (k - 1) * 92]);
                var st = (k == 1) ? "0.3" : refs[k];
                tp(I, "ADBE Opacity").expression = 'var s=' + st + '; linear(time, s, s+6*thisComp.frameDuration, 0, 100)';
                tp(I, "ADBE Position").expression = 'var s=' + st + '; value+[linear(time, s, s+6*thisComp.frameDuration, -24, 0),0]';
                var an = c.layer("항목" + k).property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); an.name = "색 바꾸기";
                c.layer("항목" + k).property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").property("ADBE Text Selectors").addProperty("ADBE Text Selector");
                c.layer("항목" + k).property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기").property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = ic;
            }
            master(c, 0, 540);
            entrance(c, 8, 0, 0);
            reg(c, "제목", "제목"); for (var k = 1; k <= 4; k++) reg(c, "항목" + k, "항목" + k); regCtl(c);
            made.push(["칠판패널", 10]); w("6 칠판패널");
        }
        // 7. 웃음 손글씨 ㅋㅎ (5초) — 글자 입력 칸의 폰트·크기를 6개 글자가 그대로 받음 (크기는 칸 크기의 100/87/73%)
        if (!done("웃음")) {
            ORDER = [];
            var c = app.project.items.addComp("웃음", 1920, 1080, 1, 5, FPS);
            var col = addCtl(c, "ADBE Color Control", "글자 색", INK);
            var SRC = addText(c, "글자 입력", "ㅋ", "NanumBarunpen-Bold", 120, BLK, "C"); SRC.enabled = false; SRC.guideLayer = true;
            var POS = [[150, 170], [1760, 190], [110, 620], [1810, 600], [430, 90], [1480, 110]], ROT = [-14, 12, -8, 16, 6, -10], K = [1, 0.87, 0.73];
            for (var k = 0; k < POS.length; k++) {
                var L = addText(c, "ㅋ" + (k + 1), "ㅋ", "NanumBarunpen-Bold", 120, BLK, "C");
                tdoc(L).expression = 'var p=thisComp.layer("글자 입력").text.sourceText; var a=(""+p).split(" "); p.style.setFontSize(p.style.fontSize*' + K[k % 3] + ').setText(a[' + k + ' % a.length]).setFillColor(' + rgb(col) + ')';
                tp(L, "ADBE Position").setValue(POS[k]); tp(L, "ADBE Rotate Z").expression = ROT[k] + '+wiggle(4,3)-value';
                var t0 = (k * 3) + "*thisComp.frameDuration";
                tp(L, "ADBE Scale").expression = 'var s=' + t0 + '; var v=ease(time,s,s+3*thisComp.frameDuration,0,115); v=v-ease(time,s+3*thisComp.frameDuration,s+5*thisComp.frameDuration,0,15); [v,v]';
            }
            master(c, 960, 540);
            var o = entrance(c, 1, 0, 0); var oo = o.property("ADBE Effect Parade").property(1).property("ADBE Geometry2-0008");
            oo.setValueAtTime(4.5, 100); oo.setValueAtTime(5 - FR, 0);
            reg(c, "글자 입력", "글자 (띄어쓰기로 여러 개)"); regCtl(c);
            made.push(["웃음", 1]); w("7 웃음");
        }
        app.project.save();
        for (var m = 0; m < made.length; m++) exportComp(made[m][0], made[m][1]);
        app.project.save();
        w("Gyoyang v2 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
