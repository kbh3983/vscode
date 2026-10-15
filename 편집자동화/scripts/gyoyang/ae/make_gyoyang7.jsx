// 교양 에이전트 — 지식인사이드 「지식인 클래스」 스타일 그래픽 템플릿 7종 (AE → .mogrt, 문구 칸 수정 가능)
// 2026-10-15 사용자: 테스트 영상 편집 "고칠 수 있는 텍스트 (추천)" / 폰트·템플릿 원본 없음 → 비슷하게 임의 제작 (보류 21번)
// 실행: scripts/point/ae/run_ae.ps1 <이 파일> <OUT\result.txt> "Gyoyang export 끝|ERR" 900
//   → OUT\export_<이름> → finish_mogrt.py <폴더> "교양_<이름>_AE" "<표시 이름>" <OUT\thumb_<이름>.png> 0
// 측정 근거 (EP.22 r3, 1920×1080): 강조 살구색 (245,201,151) / 소제목 흰 글자 y19~59 x50~, 세로선 x24~27 y24~129, 이름 태그 y78~123
//   이름 자막: 흰 종이 x132~618 y470~584, 이름 검정 y503~573(x156~), 설명 흰 y594~694 / Question: 라벨 y680~744, 1줄 y778~874, 2줄 y906~1026, x≈104
// 강조색 표시: 문구 안 {단어} → 살구색 (playbook_AE변환 10장 방식 — 숨긴 원문 + 표시 레이어 + 식 선택기)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\지식인사이드\\tpl";
    var FPS = 29.97, FR = 1 / FPS;
    var WHT = [1, 1, 1], BLK = [0, 0, 0], PEACH = [245 / 255, 201 / 255, 151 / 255], DARK = [0.11, 0.11, 0.115];
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
    function strip(src) { return 'var s=""+thisComp.layer("' + src + '").text.sourceText; text.sourceText.style.setText(s.replace(/[\\{\\}]/g,""))'; }
    function selExpr(src) {
        return 'var s=""+thisComp.layer("' + src + '").text.sourceText, m=[], on=false;\n' +
            'for (var i=0;i<s.length;i++){var c=s.charAt(i); if(c=="{"){on=true;continue;} if(c=="}"){on=false;continue;} m.push(on?1:0);}\n' +
            'var v=(m[textIndex-1]||0)?100:0; [v,v,v]';
    }
    // 표시 레이어 L이 원문(숨김) src를 따라가고, {} 안 글자는 강조색
    function accent(comp, L, src, colRef) {
        tdoc(L).expression = strip(src);
        var an = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
        an.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = colRef;
        var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
        sel.property("ADBE Text Expressible Amount").expression = selExpr(src);
    }
    function ctl(comp) { for (var i = 1; i <= comp.numLayers; i++) if (comp.layer(i).name == "템플릿 조절") return comp.layer(i); var N = comp.layers.addNull(comp.duration); N.name = "템플릿 조절"; N.moveToEnd(); return N; }
    function addCtl(comp, type, name, v) { var e = ctl(comp).property("ADBE Effect Parade").addProperty(type); e.name = name; e.property(1).setValue(v); return 'thisComp.layer("템플릿 조절").effect("' + name + '")(1)'; }
    function rgb(ref) { return "[" + ref + "[0]," + ref + "[1]," + ref + "[2]]"; }
    // 등장: 맨 위 조정 레이어 — 불투명도(변형 효과) + 블러 → 선명
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
    function reg(comp, L, name) { tdoc(L).addToMotionGraphicsTemplateAs(comp, name); }
    function regCtl(comp, names) { var N = ctl(comp); for (var i = 0; i < names.length; i++) N.property("ADBE Effect Parade").property(names[i]).property(1).addToMotionGraphicsTemplateAs(comp, names[i]); }
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
        app.project.save(new File(OUT + "\\gyoyang7.aep"));
        w("프로젝트 저장");
        var made = [];

        // 1. 소제목 띠 (좌상단, 120초)
        if (!done("소제목띠")) {
            var c = app.project.items.addComp("소제목띠", 1920, 1080, 1, 120, FPS);
            var acc = addCtl(c, "ADBE Color Control", "강조 색", PEACH);
            var line = rect(c, "세로선", PEACH, 0); rectProp(line, "ADBE Vector Rect Size").setValue([4, 105]); tp(line, "ADBE Position").setValue([26, 76.5]);
            line.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(2).property("ADBE Vector Fill Color").expression = acc;
            var T = addText(c, "소제목", "영화 '오디세이' 결말에 숨겨진 진짜 의미", "Pretendard-SemiBold", 44, WHT, "L"); tp(T, "ADBE Position").setValue([50, 56]);
            shadow(T, 2, 10, 45);
            var G = addText(c, "이름 태그", "○○○ 교수", "Pretendard-Bold", 33, BLK, "L"); tp(G, "ADBE Position").setValue([58, 112]);
            var bg = rect(c, "태그 바탕", PEACH, 6);
            bg.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(2).property("ADBE Vector Fill Color").expression = acc;
            rectProp(bg, "ADBE Vector Rect Size").expression = 'var L=thisComp.layer("이름 태그"), r=L.sourceRectAtTime(time,false); [r.width+16, 45]';
            tp(bg, "ADBE Position").expression = 'var L=thisComp.layer("이름 태그"), r=L.sourceRectAtTime(time,false); [L.toComp([r.left,0])[0]-8+(r.width+16)/2, 100.5]';
            bg.moveAfter(G);
            entrance(c, 8, 0, 0);
            reg(c, T, "소제목"); reg(c, G, "이름 태그"); regCtl(c, ["강조 색"]);
            made.push(["소제목띠", 2]); w("1 소제목띠");
        }
        // 2. 이름 자막 (15초)
        if (!done("이름자막")) {
            var c = app.project.items.addComp("이름자막", 1920, 1080, 1, 15, FPS);
            var mv = addCtl(c, "ADBE Point Control", "위치 이동", [0, 0]);
            var N = addText(c, "이름", "○○○", "Pretendard-ExtraBold", 84, BLK, "L"); tp(N, "ADBE Position").expression = '[156,572]+' + mv;
            var H = addText(c, "호칭", "교수", "Pretendard-Medium", 40, BLK, "L");
            tp(H, "ADBE Position").expression = 'var L=thisComp.layer("이름"), r=L.sourceRectAtTime(time,false); [L.toComp([r.left+r.width,0])[0]+16, 572]+[0,' + mv + '[1]]';
            var paper = rect(c, "종이", WHT, 2);
            rectProp(paper, "ADBE Vector Rect Size").expression = 'var a=thisComp.layer("이름"), b=thisComp.layer("호칭"), ra=a.sourceRectAtTime(time,false), rb=b.sourceRectAtTime(time,false); var l=a.toComp([ra.left,0])[0], r=b.toComp([rb.left+rb.width,0])[0]; [r-l+48, 114]';
            tp(paper, "ADBE Position").expression = 'var a=thisComp.layer("이름"), b=thisComp.layer("호칭"), ra=a.sourceRectAtTime(time,false), rb=b.sourceRectAtTime(time,false); var l=a.toComp([ra.left,0])[0], r=b.toComp([rb.left+rb.width,0])[0]; [(l+r)/2, 527+' + mv + '[1]]';
            tp(paper, "ADBE Rotate Z").setValue(-0.6);
            paper.property("ADBE Effect Parade").addProperty("ADBE Roughen Edges").property(4).setValue(3);   // 찢어진 종이 가장자리
            paper.moveToEnd();
            var D1 = addText(c, "설명1", "○○대학교 ○○학과 교수", "Pretendard-Regular", 38, WHT, "L"); tp(D1, "ADBE Position").expression = '[149,636]+' + mv;
            var D2 = addText(c, "설명2", "저서 <○○○○>", "Pretendard-Regular", 38, WHT, "L"); tp(D2, "ADBE Position").expression = '[149,688]+' + mv;
            shadow(D1, 2, 10, 55); shadow(D2, 2, 10, 55);
            entrance(c, 12, 0, 40);
            reg(c, N, "이름"); reg(c, H, "호칭"); reg(c, D1, "설명 1줄"); reg(c, D2, "설명 2줄"); regCtl(c, ["위치 이동"]);
            made.push(["이름자막", 1]); w("2 이름자막");
        }
        // 3. 큰 강조 자막 (15초) — {단어} 살구색
        if (!done("큰자막")) {
            var c = app.project.items.addComp("큰자막", 1920, 1080, 1, 15, FPS);
            var acc = addCtl(c, "ADBE Color Control", "강조 색", PEACH);
            var mv = addCtl(c, "ADBE Point Control", "위치 이동", [0, 0]);
            var SRC = addText(c, "원문", "조회수 {100만} 돌파", "Pretendard-ExtraBold", 104, WHT, "C"); SRC.enabled = false; SRC.guideLayer = true;
            var D = addText(c, "글자", "조회수 100만 돌파", "Pretendard-ExtraBold", 104, WHT, "C");
            accent(c, D, "원문", acc);
            tp(D, "ADBE Position").expression = '[960,1012]+' + mv;
            tp(D, "ADBE Scale").expression = 'var r=sourceRectAtTime(time,false); var k=Math.min(100,1720/Math.max(1,r.width)*100); var p=linear(time,0,4*thisComp.frameDuration,112,100); [k*p/100,k*p/100]';
            tp(D, "ADBE Anchor Point").expression = 'var r=sourceRectAtTime(time,false); [r.left+r.width/2, 0]';
            shadow(D, 3, 18, 75);
            entrance(c, 5, 18, 0);
            reg(c, SRC, "자막 ({}=강조)"); regCtl(c, ["강조 색", "위치 이동"]);
            made.push(["큰자막", 1]); w("3 큰자막");
        }
        // 4. 인용 카드 (15초) — 어둡게 + “ 문구 ”
        if (!done("인용카드")) {
            var c = app.project.items.addComp("인용카드", 1920, 1080, 1, 15, FPS);
            var dk = addCtl(c, "ADBE Slider Control", "배경 어둡게(%)", 50);
            var mv = addCtl(c, "ADBE Point Control", "위치 이동", [0, 0]);
            var S = c.layers.addSolid(BLK, "어둡게", 1920, 1080, 1, 15); tp(S, "ADBE Opacity").expression = dk;
            var Q = addText(c, "문구", "나도 칼립소랑 7년 살고 싶다", "Pretendard-SemiBold", 66, WHT, "C");
            tp(Q, "ADBE Position").expression = '[960,560]+' + mv;
            var td = tdoc(Q).value; td.leading = 92; tdoc(Q).setValue(td);
            shadow(Q, 2, 14, 60);
            var O = addText(c, "여는 따옴표", "\u201C", "Georgia-Bold", 130, WHT, "C");
            tp(O, "ADBE Position").expression = 'var L=thisComp.layer("문구"), r=L.sourceRectAtTime(time,false); [L.toComp([r.left+r.width/2,0])[0], L.toComp([0,r.top])[1]+6]';
            var Cq = addText(c, "닫는 따옴표", "\u201D", "Georgia-Bold", 130, WHT, "C");
            tp(Cq, "ADBE Position").expression = 'var L=thisComp.layer("문구"), r=L.sourceRectAtTime(time,false); [L.toComp([r.left+r.width/2,0])[0], L.toComp([0,r.top+r.height])[1]+128]';
            S.moveToEnd();
            entrance(c, 6, 14, 0);
            reg(c, Q, "인용 문구"); regCtl(c, ["배경 어둡게(%)", "위치 이동"]);
            made.push(["인용카드", 1]); w("4 인용카드");
        }
        // 5. Question 카드 (15초)
        if (!done("Question")) {
            var c = app.project.items.addComp("Question", 1920, 1080, 1, 15, FPS);
            var acc = addCtl(c, "ADBE Color Control", "강조 색", PEACH);
            var lab = addText(c, "라벨", "Question.", "Georgia-Bold", 44, BLK, "L"); tp(lab, "ADBE Position").setValue([118, 728]);
            var lbg = rect(c, "라벨 바탕", PEACH, 12);
            lbg.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(2).property("ADBE Vector Fill Color").expression = acc;
            rectProp(lbg, "ADBE Vector Rect Size").expression = 'var L=thisComp.layer("라벨"), r=L.sourceRectAtTime(time,false); [r.width+26, 62]';
            tp(lbg, "ADBE Position").expression = 'var L=thisComp.layer("라벨"), r=L.sourceRectAtTime(time,false); [L.toComp([r.left,0])[0]-13+(r.width+26)/2, 713]';
            lbg.moveAfter(lab);
            var L1 = addText(c, "1줄", "다시 길을 떠나는 결말,", "Pretendard-ExtraBold", 100, WHT, "L"); tp(L1, "ADBE Position").setValue([104, 868]);
            var L2 = addText(c, "2줄", "무슨 의미일까?", "Pretendard-ExtraBold", 100, PEACH, "L"); tp(L2, "ADBE Position").setValue([104, 996]);
            L2.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator").property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = acc;
            L2.property("ADBE Text Properties").property("ADBE Text Animators").property(1).property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            shadow(L1, 3, 16, 60); shadow(L2, 3, 16, 60);
            entrance(c, 6, 16, 0);
            reg(c, L1, "1줄"); reg(c, L2, "2줄 (강조색)"); reg(c, lab, "라벨"); regCtl(c, ["강조 색"]);
            made.push(["Question", 1]); w("5 Question");
        }
        // 6. 칠판 패널 (왼쪽 1/3, 15초) — 항목이 정한 초에 하나씩
        if (!done("칠판패널")) {
            var c = app.project.items.addComp("칠판패널", 1920, 1080, 1, 15, FPS);
            var acc = addCtl(c, "ADBE Color Control", "강조 색", PEACH);
            var refs = [];
            for (var k = 2; k <= 4; k++) refs[k] = addCtl(c, "ADBE Slider Control", "항목" + k + " 등장(초)", (k - 1) * 2.5);
            var P = c.layers.addShape(); P.name = "칠판";
            var g = P.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
            var pth = g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
            var sh = new Shape(), V = [[-10, -10]], rnd = 7;
            for (var y = -10; y <= 1090; y += 18) { rnd = (rnd * 9301 + 49297) % 233280; V.push([650 + (rnd / 233280) * 28 - 14, y]); }
            V.push([-10, 1090]); sh.vertices = V; sh.closed = true; pth.property("ADBE Vector Shape").setValue(sh);
            tp(P, "ADBE Position").setValue([0, 0]);   // 모양 레이어 기본 위치가 화면 가운데라 꼭짓점이 밀림
            g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(DARK);
            P.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow").property("ADBE Drop Shadow-0005").setValue(30);
            var grain = c.layers.addSolid(WHT, "질감", 1920, 1080, 1, 15);
            var fn = grain.property("ADBE Effect Parade").addProperty("ADBE Fractal Noise"); fn.property("ADBE Fractal Noise-0005").setValue(12);
            grain.blendingMode = BlendingMode.OVERLAY; tp(grain, "ADBE Opacity").setValue(14);
            grain.moveBefore(P);   // 칠판 질감 (패널 모양 매트)
            try { grain.setTrackMatte(P, TrackMatteType.ALPHA); P.enabled = true; } catch (e) { w("  질감 매트 생략 " + e.message); }
            var TT = addText(c, "제목", "오디세우스의 여정", "Pretendard-Bold", 42, BLK, "L"); tp(TT, "ADBE Position").setValue([70, 214]);
            var tb = rect(c, "제목 바탕", PEACH, 6);
            tb.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(2).property("ADBE Vector Fill Color").expression = acc;
            rectProp(tb, "ADBE Vector Rect Size").expression = 'var L=thisComp.layer("제목"), r=L.sourceRectAtTime(time,false); [r.width+24, 58]';
            tp(tb, "ADBE Position").expression = 'var L=thisComp.layer("제목"), r=L.sourceRectAtTime(time,false); [L.toComp([r.left,0])[0]-12+(r.width+24)/2, 199]';
            tb.moveAfter(TT);
            var items = ["전쟁 10년", "→ 방랑 10년", "→ 고향 이타카", "→ 다시 떠남?"], IL = [];
            for (var k = 1; k <= 4; k++) {
                var I = addText(c, "항목" + k, items[k - 1], "Pretendard-SemiBold", 46, WHT, "L"); tp(I, "ADBE Position").setValue([70, 330 + (k - 1) * 92]);
                var st = (k == 1) ? "0.3" : refs[k];
                tp(I, "ADBE Opacity").expression = 'var s=' + st + '; linear(time, s, s+6*thisComp.frameDuration, 0, 100)';
                tp(I, "ADBE Position").expression = 'var s=' + st + '; value+[linear(time, s, s+6*thisComp.frameDuration, -24, 0),0]';
                IL.push(I);
            }
            entrance(c, 8, 0, 0);
            reg(c, TT, "제목"); for (var k = 0; k < 4; k++) reg(c, IL[k], "항목" + (k + 1));
            regCtl(c, ["항목2 등장(초)", "항목3 등장(초)", "항목4 등장(초)", "강조 색"]);
            made.push(["칠판패널", 10]); w("6 칠판패널");
        }
        // 7. 웃음 손글씨 ㅋㅎ (5초)
        if (!done("웃음")) {
            var c = app.project.items.addComp("웃음", 1920, 1080, 1, 5, FPS);
            var col = addCtl(c, "ADBE Color Control", "글자 색", [0.08, 0.08, 0.08]);
            var SRC = addText(c, "글자 입력", "ㅋ", "NanumBarunpen-Bold", 120, BLK, "C"); SRC.enabled = false; SRC.guideLayer = true;
            var POS = [[150, 170], [1760, 190], [110, 620], [1810, 600], [430, 90], [1480, 110]], ROT = [-14, 12, -8, 16, 6, -10];
            for (var k = 0; k < POS.length; k++) {
                var L = addText(c, "ㅋ" + (k + 1), "ㅋ", "NanumBarunpen-Bold", 120 - (k % 3) * 16, BLK, "C");
                tdoc(L).expression = 'var s=""+thisComp.layer("글자 입력").text.sourceText; var a=s.split(" "); text.sourceText.style.setText(a[' + k + ' % a.length]).setFillColor(' + rgb(col) + ')';
                tp(L, "ADBE Position").setValue(POS[k]); tp(L, "ADBE Rotate Z").expression = ROT[k] + '+wiggle(4,3)-value';
                var t0 = (k * 3) + "*thisComp.frameDuration";
                tp(L, "ADBE Scale").expression = 'var s=' + t0 + '; var v=ease(time,s,s+3*thisComp.frameDuration,0,115); v=v-ease(time,s+3*thisComp.frameDuration,s+5*thisComp.frameDuration,0,15); [v,v]';
            }
            var o = entrance(c, 1, 0, 0); var oo = o.property("ADBE Effect Parade").property(1).property("ADBE Geometry2-0008");
            oo.setValueAtTime(4.5, 100); oo.setValueAtTime(5 - FR, 0);
            reg(c, SRC, "글자 (띄어쓰기로 여러 개)"); regCtl(c, ["글자 색"]);
            made.push(["웃음", 1]); w("7 웃음");
        }
        app.project.save();
        for (var m = 0; m < made.length; m++) exportComp(made[m][0], made[m][1]);
        app.project.save();
        w("Gyoyang export 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
