// 이효석님 5부작 — 책 인서트 AE 템플릿 3종 (명강의모음 레퍼런스: work/261030_이효석님/레퍼런스_책인서트.md)
// 2026-10-27 사용자: "응 지금 제작 시작해줘." (레퍼런스 클립을 이효석님 도서로 교체해 만들 부분)
//   1) 책인용카드 30초 — 연한 그라데이션 + 흰 곡선, 왼쪽 표지(흐림→초점→왼쪽 이동), 부제 타이핑, 본문 8줄 + 형광펜 2묶음(말에 맞춰 시점 조절)
//   2) 책소개_회전 5초 — 짙은 배경 + 가운데 빛, 3D 책(앞·책등·뒤·책장) 한 바퀴 회전, 아래 2줄(흰 + 강조 색) + 가는 선
//   3) 책소개_날아오기 5초 — 짙은 배경, 입체 표지가 작게 → 크게 돌며 날아옴, 아래 1줄
// 공통: 맨 아래 널 "템플릿 조절"에 색·위치·시점 칸, 글자는 Source Text 칸 (폰트·크기는 finish_mogrt.py가 수정 허용)
// 실행: osascript … DoScriptFile <이 파일> → OUT/result.txt, OUT/<이름>/ 에 .mogrt, OUT/thumb_<n>.png 는 still_book_insert.jsx
(function () {
    var OUT = "/Users/bbong/dada/vscode/편집자동화/work/261030_이효석님/템플릿";
    var SRC = "/Users/bbong/dada/261030_이효석님/자료/";
    var FPS = 29.97;
    var CTL = "템플릿 조절";
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "/result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function c1(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    function tp(L, m) { return L.property("ADBE Transform Group").property(m); }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    var C, ORDER;
    function fx() { return C.layer(CTL).property("ADBE Effect Parade"); }
    function ref(n) { return 'thisComp.layer("' + CTL + '").effect("' + n + '")(1)'; }
    function ctl(match, n, v) { var e = fx().addProperty(match); e.name = n; fx().property(n).property(1).setValue(v); ORDER.push(n); return ref(n); }
    function cColor(n, v) { var k = c1(v); return ctl("ADBE Color Control", n, [k[0], k[1], k[2], 1]); }
    function cSlider(n, v) { return ctl("ADBE Slider Control", n, v); }
    function cPoint(n, v) { return ctl("ADBE Point Control", n, v || [0, 0]); }
    function F(n) { return findItem("이효석의 21세기 투자법_" + n); }   // 내보내기·저장 뒤에는 앞서 받은 FootageItem 참조가 끊김 → 쓸 때마다 이름으로 다시 찾음 (2026-10-27)
    function findItem(n) { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i).name == n) return app.project.item(i); return null; }
    function imp(f) {
        var it = findItem(f); if (it) return it;
        var file = new File(SRC + f); if (!file.exists) { w("없음 " + f); return null; }
        return app.project.importFile(new ImportOptions(file));
    }
    function newComp(name, dur) {
        var old = findItem(name); if (old) old.remove();
        C = app.project.items.addComp(name, 1920, 1080, 1, dur, FPS);
        var N = C.layers.addNull(dur); N.name = CTL; N.moveToEnd(); N.enabled = false;
        ORDER = [];
        w("== " + name);
    }
    function mkText(name, txt, o) {
        var L = C.layers.addText(txt); L.name = name;
        var st = tdoc(L), td = st.value;
        td.font = o.font; td.fontSize = o.size; td.fillColor = c1(o.col || [255, 255, 255]); td.applyFill = true; td.applyStroke = false;
        td.justification = o.just == "L" ? ParagraphJustification.LEFT_JUSTIFY : (o.just == "R" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY);
        td.tracking = (o.track === undefined ? -10 : o.track);
        if (o.lead) { td.autoLeading = false; td.leading = o.lead; }
        st.setValue(td);
        if (tdoc(L).value.font != o.font) w("  주의 폰트 " + name + " → " + tdoc(L).value.font);
        tp(L, "ADBE Position").setValue(o.pos);
        return L;
    }
    function fillAnim(L, expr) {   // 글자 색을 칸에 연결 (맨 앞 애니메이터)
        var A = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A.name = "색";
        var g = function () { return L.property("ADBE Text Properties").property("ADBE Text Animators").property("색"); };
        g().property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        g().property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");
        g().property("ADBE Text Animator Properties").property("ADBE Text Fill Color").expression = expr;
    }
    function ease(p) { for (var k = 1; k <= p.numKeys; k++) { var d = p.value.length ? p.value.length : 1; if (p.propertyValueType == PropertyValueType.TwoD_SPATIAL || p.propertyValueType == PropertyValueType.ThreeD_SPATIAL) d = 1; var e = []; for (var i = 0; i < d; i++) e.push(new KeyframeEase(0, 80)); try { p.setTemporalEaseAtKey(k, e, e); } catch (er) {} } }
    function keys(p, arr) { for (var i = 0; i < arr.length; i++) p.setValueAtTime(arr[i][0], arr[i][1]); ease(p); }
    function egp(prop, name) { try { prop.addToMotionGraphicsTemplateAs(C, name); } catch (e) { w("  EGP 실패 " + name + " " + e); } }
    function addCtlsToEGP() { for (var i = 0; i < ORDER.length; i++) egp(fx().property(ORDER[i]).property(1), ORDER[i]); w("  칸 " + ORDER.length + "개 연결"); }
    function shapeRect(name) {
        var L = C.layers.addShape(); L.name = name; tp(L, "ADBE Position").setValue([0, 0]); tp(L, "ADBE Anchor Point").setValue([0, 0]);
        var G = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); G.name = "상자";
        var gc = function () { return L.property("ADBE Root Vectors Group").property("상자").property("ADBE Vectors Group"); };
        gc().addProperty("ADBE Vector Shape - Rect"); gc().addProperty("ADBE Vector Graphic - Fill");
        return { L: L, rect: function () { return gc().property("ADBE Vector Shape - Rect"); }, fill: function () { return gc().property("ADBE Vector Graphic - Fill"); } };
    }
    function exportComp(name, display) {
        var SKIP = $.global.SKIP_EXPORT || [];   // 이미 내보낸 것 (예: ["책인용카드"]) — 다시 안 내보냄
        for (var s = 0; s < SKIP.length; s++) if (SKIP[s] == name) { w("  내보내기 건너뜀"); return; }
        w("  내보내기 시작");
        app.project.save(new File(OUT + "/이효석_책인서트.aep"));   // 저장 안 된 프로젝트면 AE가 저장 창을 띄우고 스크립트가 멈춤 (2026-10-27)
        C.motionGraphicsTemplateName = display;
        var dir = new Folder(OUT + "/" + name); if (!dir.exists) dir.create();
        var old = dir.getFiles("*.mogrt"); for (var i = 0; i < old.length; i++) old[i].remove();
        var ok = false;
        try { ok = C.exportAsMotionGraphicsTemplate(true, dir.fsName); } catch (ex) { w("  내보내기 오류 " + ex.toString() + " / " + ex.number + " / " + ex.description); }
        w("  내보내기 " + ok + " → " + dir.getFiles("*.mogrt").length + "개");
    }

    app.beginSuppressDialogs();
    try {
        var proj = new File(OUT + "/이효석_책인서트.aep");
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); app.newProject();
        var front = imp("이효석의 21세기 투자법_앞표지.jpg"), back = imp("이효석의 21세기 투자법_뒷표지.jpg"),
            spine = imp("이효석의 21세기 투자법_책등.jpg"), mock = imp("이효석의 21세기 투자법_입체.png");

        // ---------- 1) 책인용카드 ----------
        var D1 = 30;
        newComp("이효석_책인용카드", D1);
        var bg1 = cColor("배경 색 1", [242, 232, 234]), bg2 = cColor("배경 색 2", [229, 236, 250]);
        var curveO = cSlider("곡선 무늬 투명도(%)", 55);
        var bodyCol = cColor("본문 글자 색", [70, 70, 72]), subCol = cColor("부제 글자 색", [20, 20, 22]);
        var hlCol = cColor("형광펜 색", [244, 170, 166]);
        var hA1 = cSlider("형광펜 A 시작 줄", 1), hA2 = cSlider("형광펜 A 끝 줄", 4), hAs = cSlider("형광펜 A 시작(초)", 1.0), hAe = cSlider("형광펜 A 끝(초)", 13.5);
        var hB1 = cSlider("형광펜 B 시작 줄", 5), hB2 = cSlider("형광펜 B 끝 줄", 7), hBs = cSlider("형광펜 B 시작(초)", 13.7), hBe = cSlider("형광펜 B 끝(초)", 40);
        var bodyMove = cPoint("본문 위치 이동", [0, 0]), coverMove = cPoint("표지·부제 위치 이동", [0, 0]);

        var B = C.layers.addSolid([1, 1, 1], "배경", 1920, 1080, 1, D1);
        var R = B.property("ADBE Effect Parade").addProperty("ADBE Ramp");
        R = B.property("ADBE Effect Parade").property(1);
        R.property("ADBE Ramp-0001").setValue([0, 0]); R.property("ADBE Ramp-0003").setValue([1920, 1080]);
        R.property("ADBE Ramp-0002").expression = bg1; R.property("ADBE Ramp-0004").expression = bg2;
        R.property("ADBE Ramp-0005").setValue(2);   // 방사형 아님: 1=선형
        R.property("ADBE Ramp-0005").setValue(1);

        // 흰 곡선 무늬 (큰 원 3개가 천천히 돎)
        var S = C.layers.addShape(); S.name = "곡선 무늬";
        var circ = [[[1350, -380], 1500, 9], [[2150, 900], 1700, -6], [[-250, 1350], 1500, 7]];
        for (var i = 0; i < circ.length; i++) {
            var G = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); G.name = "곡선" + (i + 1);
            var gc = S.property("ADBE Root Vectors Group").property("곡선" + (i + 1)).property("ADBE Vectors Group");
            gc.addProperty("ADBE Vector Shape - Ellipse"); gc.addProperty("ADBE Vector Graphic - Stroke");
            gc = S.property("ADBE Root Vectors Group").property("곡선" + (i + 1)).property("ADBE Vectors Group");
            gc.property("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([circ[i][1], circ[i][1] * 0.82]);
            gc.property("ADBE Vector Graphic - Stroke").property("ADBE Vector Stroke Color").setValue([1, 1, 1]);
            gc.property("ADBE Vector Graphic - Stroke").property("ADBE Vector Stroke Width").setValue(5);
            var tg = S.property("ADBE Root Vectors Group").property("곡선" + (i + 1)).property("ADBE Vector Transform Group");
            tg.property("ADBE Vector Position").setValue([circ[i][0][0] - 960, circ[i][0][1] - 540]);
            tg.property("ADBE Vector Rotation").expression = "time*" + circ[i][2] / 10 + "+" + (i * 40);
        }
        tp(S, "ADBE Opacity").expression = curveO;

        // 형광펜 (본문 아래)
        var NL = 8, X0 = 560, Y0 = 285, PITCH = 88;
        var LINES = ["반면 손절을 못하는 사람에게는 이런 과정이 불가능하다. 자금이",
            "손실 종목에 묶여 있어 새로운 종목에 투자할 여유 자금이 없기 때",
            "문이다. 좋은 아이디어가 떠올라도 ‘살 돈이 없어서’ 그저 지켜볼 수",
            "밖에 없다. 그 사이 기회는 지나간다. 결국 손절을 잘하는 사람은 시",
            "도 횟수가 많아진다. 투자는 본질적으로 확률 게임이다. 많이 시도",
            "할수록 유의미한 상승 종목을 포착할 가능성이 높아진다. 손절은 잃",
            "는 행위가 아니라, 다음 기회를 사는 선택이다.", " "];
        // 본문 8줄 (나눔명조)
        for (var i = 1; i <= NL; i++) {
            var T = mkText("본문 " + i + "줄", LINES[i - 1], { font: "NanumMyeongjo", size: 37, col: [70, 70, 72], just: "L", track: -15, pos: [X0, Y0 + (i - 1) * PITCH] });
            fillAnim(T, bodyCol);
            tp(T, "ADBE Position").expression = "value+" + bodyMove;
            tp(T, "ADBE Opacity").expression = "linear(time,0.85,1.25,0,100)";
        }
        // 형광펜 (본문 줄을 먼저 만든 뒤 — 식이 줄 이름을 찾아야 켜짐)
        for (var i = 1; i <= NL; i++) {
            var H = shapeRect("형광펜 " + i + "줄");
            var on = 'var i=' + i + ';function g(n){return thisComp.layer("' + CTL + '").effect(n)(1);}' +
                'function f(a){var s=g("형광펜 "+a+" 시작 줄"),e=g("형광펜 "+a+" 끝 줄"),ts=g("형광펜 "+a+" 시작(초)"),te=g("형광펜 "+a+" 끝(초)");' +
                'if(i<Math.round(s)||i>Math.round(e))return 0;return Math.min(linear(time,ts,ts+0.35,0,1),linear(time,te,te+0.2,1,0));}' +
                'var fr=Math.max(f("A"),f("B"));var L=thisComp.layer("본문 ' + i + '줄");var r=L.sourceRectAtTime(time,false);' +
                'var a=L.toComp([r.left,r.top]),b=L.toComp([r.left+r.width,r.top+r.height]);var pw=10,ph=6;var wd=(b[0]-a[0]+pw*2)*fr;';
            H.rect().property("ADBE Vector Rect Size").expression = on + '[wd,(b[1]-a[1])+ph*2]';
            H.rect().property("ADBE Vector Rect Position").expression = on + '[a[0]-pw+wd/2,(a[1]+b[1])/2]';
            H.fill().property("ADBE Vector Fill Color").expression = hlCol;
            H.L.moveAfter(C.layer("본문 " + i + "줄"));   // 형광펜은 그 줄 글자 바로 아래
        }
        // 표지 + 부제
        var CV = C.layers.add(F("앞표지.jpg")); CV.name = "표지";
        var FS = 470 / 2657 * 100;   // 표지 높이 470px
        tp(CV, "ADBE Position").expression = "value+" + coverMove;
        keys(tp(CV, "ADBE Position"), [[0, [960, 540]], [0.45, [960, 540]], [0.9, [255, 605]]]);
        keys(tp(CV, "ADBE Scale"), [[0, [FS * 2.4, FS * 2.4]], [0.45, [FS * 1.25, FS * 1.25]], [0.9, [FS, FS]]]);
        keys(tp(CV, "ADBE Opacity"), [[0, 0], [0.15, 100]]);
        var GB = CV.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        keys(CV.property("ADBE Effect Parade").property(1).property("ADBE Gaussian Blur 2-0001"), [[0, 60], [0.45, 0]]);
        var SH = CV.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
        SH = CV.property("ADBE Effect Parade").property(2);
        SH.property("ADBE Drop Shadow-0002").setValue(35); SH.property("ADBE Drop Shadow-0004").setValue(8); SH.property("ADBE Drop Shadow-0005").setValue(25);
        var SUB = mkText("부제", "AI가 판을 뒤집는 시대,\r불확실성 앞에서 살아남는 투자 전략", { font: "Pretendard-Bold", size: 25, col: [20, 20, 22], just: "C", track: -20, lead: 32, pos: [255, 312] });
        fillAnim(SUB, subCol);
        tp(SUB, "ADBE Position").expression = "value+" + coverMove;
        var TA = SUB.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); TA.name = "타이핑";
        var ta = function () { return SUB.property("ADBE Text Properties").property("ADBE Text Animators").property("타이핑"); };
        ta().property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
        ta().property("ADBE Text Animator Properties").property("ADBE Text Opacity").setValue(0);
        ta().property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        var sel = ta().property("ADBE Text Selectors").property(1);
        sel.property("ADBE Text Percent End").setValueAtTime(1.5, 100); sel.property("ADBE Text Percent End").setValueAtTime(2.3, 0);

        w("  만들기 끝");
        egp(tdoc(SUB), "부제");
        for (var i = 1; i <= NL; i++) egp(tdoc(C.layer("본문 " + i + "줄")), "본문 " + i + "줄");
        addCtlsToEGP();
        exportComp("책인용카드", "이효석 · 책 인용 카드 (본문 형광펜)");

        // ---------- 2) 책소개_회전 ----------
        var D2 = 5;
        newComp("이효석_책소개_회전", D2);
        var bgc = cColor("배경 색", [12, 12, 14]), glow = cColor("가운데 빛 색", [52, 52, 58]);
        var l1c = cColor("윗줄 색", [255, 255, 255]), l2c = cColor("아랫줄 색", [230, 50, 44]), linec = cColor("가는 선 색", [230, 50, 44]);
        var spinT = cSlider("회전 시작(초)", 0.7), bookMove = cPoint("책 위치 이동", [0, 0]);
        var B2 = C.layers.addSolid([0, 0, 0], "배경", 1920, 1080, 1, D2);
        var R2 = B2.property("ADBE Effect Parade").addProperty("ADBE Ramp"); R2 = B2.property("ADBE Effect Parade").property(1);
        R2.property("ADBE Ramp-0001").setValue([960, 430]); R2.property("ADBE Ramp-0003").setValue([960, 1250]);
        R2.property("ADBE Ramp-0005").setValue(2);
        R2.property("ADBE Ramp-0002").expression = glow; R2.property("ADBE Ramp-0004").expression = bgc;
        var BH = 420, BW = BH * 1795 / 2657, BD = BH * 283 / 2657, SC = BH / 2657 * 100;
        var BN = C.layers.addNull(D2); BN.name = "책"; BN.threeDLayer = true;
        tp(BN, "ADBE Position").setValue([960, 400, 0]);
        tp(BN, "ADBE Position").expression = "value+[" + bookMove + "[0]," + bookMove + "[1],0]";
        keys(tp(BN, "ADBE Scale"), [[0, [85, 85, 85]], [0.3, [100, 100, 100]]]);
        tp(BN, "ADBE Rotate Y").expression = 'var s=' + spinT + ';ease(time,s,s+0.8,0,360)';
        function face(item, name, pos, rotY, sx) {
            var L = C.layers.add(item); L.name = name; L.threeDLayer = true; L.parent = BN;
            tp(L, "ADBE Position").setValue([50 + pos[0], 50 + pos[1], pos[2]]);
            tp(L, "ADBE Scale").setValue([sx || SC, SC, SC]);
            tp(L, "ADBE Rotate Y").setValue(rotY);
            tp(L, "ADBE Opacity").expression = 'linear(time,0,0.2,0,100)';
            return L;
        }
        face(F("뒷표지.jpg"), "뒷표지", [0, 0, BD / 2], 180);
        var PG = C.layers.addSolid([0.96, 0.95, 0.92], "책장", Math.round(BD), BH, 1, D2); PG.threeDLayer = true; PG.parent = BN;
        tp(PG, "ADBE Position").setValue([50 + BW / 2, 50, 0]); tp(PG, "ADBE Rotate Y").setValue(-90);
        tp(PG, "ADBE Opacity").expression = 'linear(time,0,0.2,0,100)';
        face(F("책등.jpg"), "책등", [-BW / 2, 0, 0], 90);
        face(F("앞표지.jpg"), "앞표지", [0, 0, -BD / 2], 0);
        var CAM = C.layers.addCamera("카메라", [960, 540]);
        var LN = C.layers.addSolid([1, 1, 1], "가는 선", 70, 3, 1, D2); tp(LN, "ADBE Position").setValue([960, 668]);
        var LF = LN.property("ADBE Effect Parade").addProperty("ADBE Fill"); LN.property("ADBE Effect Parade").property(1).property("ADBE Fill-0002").expression = linec;
        tp(LN, "ADBE Opacity").expression = 'linear(time,0.2,0.45,0,100)';
        var T1 = mkText("윗줄", "불확실성 앞에서 살아남는", { font: "Pretendard-Bold", size: 46, just: "C", track: -20, pos: [960, 752] });
        fillAnim(T1, l1c); tp(T1, "ADBE Opacity").expression = 'linear(time,0.25,0.5,0,100)';
        var T2 = mkText("아랫줄", "21세기 투자법", { font: "Pretendard-ExtraBold", size: 56, just: "C", track: -20, pos: [960, 830] });
        fillAnim(T2, l2c); tp(T2, "ADBE Opacity").expression = 'linear(time,0.5,0.75,0,100)';
        w("  만들기 끝");
        egp(tdoc(T1), "윗줄"); egp(tdoc(T2), "아랫줄");
        addCtlsToEGP();
        exportComp("책소개_회전", "이효석 · 책 소개 카드 (회전)");

        // ---------- 3) 책소개_날아오기 ----------
        var D3 = 5;
        newComp("이효석_책소개_날아오기", D3);
        var bg3 = cColor("배경 색", [12, 12, 14]), t3c = cColor("글자 색", [255, 255, 255]), mvB = cPoint("책 위치 이동", [0, 0]);
        var B3 = C.layers.addSolid([0, 0, 0], "배경", 1920, 1080, 1, D3);
        B3.property("ADBE Effect Parade").addProperty("ADBE Fill"); B3.property("ADBE Effect Parade").property(1).property("ADBE Fill-0002").expression = bg3;
        var MK = C.layers.add(F("입체.png")); MK.name = "입체 표지"; MK.threeDLayer = true;
        var MS = 720 / 2823 * 100;   // 입체 png에 여백이 있어 실제 책 높이 ≈ 70%
        tp(MK, "ADBE Position").setValue([960, 410, 0]); tp(MK, "ADBE Position").expression = "value+[" + mvB + "[0]," + mvB + "[1],0]";
        keys(tp(MK, "ADBE Scale"), [[0.1, [MS * 0.04, MS * 0.04, MS]], [0.75, [MS, MS, MS]]]);
        keys(tp(MK, "ADBE Rotate Y"), [[0.1, -70], [0.75, 0]]);
        keys(tp(MK, "ADBE Opacity"), [[0.1, 0], [0.2, 100]]);
        C.layers.addCamera("카메라", [960, 540]);
        var T3 = mkText("문구", "손절은 다음 기회를 사는 선택", { font: "Pretendard-Bold", size: 50, just: "C", track: -20, pos: [960, 790] });
        fillAnim(T3, t3c);
        tp(T3, "ADBE Opacity").expression = 'linear(time,0.8,1.0,0,100)';
        var TB = T3.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        keys(T3.property("ADBE Effect Parade").property(1).property("ADBE Gaussian Blur 2-0001"), [[0.8, 25], [1.0, 0]]);
        w("  만들기 끝");
        egp(tdoc(T3), "문구");
        addCtlsToEGP();
        exportComp("책소개_날아오기", "이효석 · 책 소개 카드 (날아오기)");

        app.project.save(proj);
        w("끝");
    } catch (e) { var m = "?"; try { m = e.message; } catch (e2) {} w("ERR " + m + " line " + (e && e.line)); }
    app.endSuppressDialogs(false);
})();
