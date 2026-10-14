// (2026-10-13 길이는 나중에 extend_tpl.jsx로 450프레임 15초가 표준 — 새로 만들 때는 450)
// 포인트 에이전트 — 우리가 만든 AE 템플릿 17개 일괄 정리 (2026-10-13 사용자: "너랑 나랑 새로 생성한 것들만, 일괄적으로 다 10초로 수정해줘.
//   그리고 생성한 것 모두 색상 변경할 수 있게, 그리고 2줄 짜리는 각각 사이즈랑 위치 수정할 수 있게")
// 1) 길이 300프레임(10.01초) — 레이어 끝도 같이  2) "템플릿 조절" 널에 색 컨트롤 → 글자·테두리·그라데이션·상자·그림자 색에 식으로 연결, 필수 그래픽 칸으로
// 3) 2줄 템플릿: 줄마다 "크기"(%)·"위치 이동"(px) — 줄 가운데(왼쪽 정렬이면 왼쪽 끝) 기준으로 커짐. 기본값(100%, 0,0)이면 모양이 전과 똑같음
// 실행: run_ae.ps1 <이 파일> <결과 txt> "UPGRADE END|ERR" 1200. 원본 .aep는 _백업1013.aep로 복사해 둠. 내보내기 → upgrade_export\<이름> → finish_mogrt.py
(function () {
    var R = "C:\\DADA\\9.AI\\vscode\\편집자동화\\";
    var EXP = R + "work\\포인트\\ae_templates\\upgrade_export\\";
    var LOG = R + "work\\포인트\\ae_templates\\upgrade_result.txt";
    var CTL = "템플릿 조절";
    var log = [];
    function w(s) { log.push(s); var f = new File(LOG); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function lay(c, n) { for (var i = 1; i <= c.numLayers; i++) if (c.layer(i).name == n) return c.layer(i); throw new Error("레이어 없음 " + c.name + "/" + n); }
    function tr(L, m) { return L.property("ADBE Transform Group").property(m); }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function fx1(L, m) { var p = L.property("ADBE Effect Parade"); for (var i = 1; i <= p.numProperties; i++) if (p.property(i).matchName == m) return p.property(i); return null; }
    function ctl(c) {
        for (var i = 1; i <= c.numLayers; i++) if (c.layer(i).name == CTL) return c.layer(i);
        var N = c.layers.addNull(c.duration); N.name = CTL; N.moveToBeginning(); return N;
    }
    var ORDER;   // 필수 그래픽에 내놓을 순서 (효과 이름)
    function ref(n) { return 'thisComp.layer("' + CTL + '").effect("' + n + '")(1)'; }
    function color(c, n, v) {   // 색 컨트롤 (이미 있으면 그대로) → 식 참조 글
        var N = ctl(c), fx = N.property("ADBE Effect Parade"), e = fx.property(n);
        if (!e) { e = fx.addProperty("ADBE Color Control"); e.name = n; e.property(1).setValue([v[0], v[1], v[2], 1]); ORDER.push(n); }
        return ref(n);
    }
    function rgb(n) { return "[" + ref(n) + "[0]," + ref(n) + "[1]," + ref(n) + "[2]]"; }
    function slider(c, n, v) { var fx = ctl(c).property("ADBE Effect Parade"), e = fx.addProperty("ADBE Slider Control"); e.name = n; e.property(1).setValue(v); ORDER.push(n); return ref(n); }
    function point(c, n) { var fx = ctl(c).property("ADBE Effect Parade"), e = fx.addProperty("ADBE Point Control"); e.name = n; e.property(1).setValue([0, 0]); ORDER.push(n); return ref(n); }
    // 그라데이션 칠 위·아래 색
    function ramp(c, L, top, bot) {
        var e = fx1(L, "ADBE Ramp");
        e.property("ADBE Ramp-0002").expression = color(c, top, e.property("ADBE Ramp-0002").value);
        e.property("ADBE Ramp-0004").expression = color(c, bot, e.property("ADBE Ramp-0004").value);
    }
    // 소스 텍스트 식이 setFillColor([..])·setStrokeColor([..])로 색을 정하는 레이어 (테두리 복사본 등)
    function srcColor(c, L, fillN, strokeN) {
        var p = tdoc(L), x = p.expression;
        var mf = x.match(/setFillColor\(\[([^\]]*)\]\)/), ms = x.match(/setStrokeColor\(\[([^\]]*)\]\)/);
        if (fillN && mf) { var a = mf[1].split(","); color(c, fillN, [+a[0], +a[1], +a[2]]); x = x.replace(mf[0], "setFillColor(" + rgb(fillN) + ")"); }
        if (strokeN && ms) { var b = ms[1].split(","); color(c, strokeN, [+b[0], +b[1], +b[2]]); x = x.replace(ms[0], "setStrokeColor(" + rgb(strokeN) + ")"); }
        p.expression = x;
    }
    // 글자 칠·선 색을 맨 앞 애니메이터로 (뒤쪽 강조 애니메이터가 있으면 그쪽이 이김)
    function animColor(c, L, fillN, strokeN) {
        var td = tdoc(L).value;
        var A = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
        A.name = "색 바꾸기";
        A.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        var P = A.property("ADBE Text Animator Properties");
        if (fillN) P.addProperty("ADBE Text Fill Color").expression = color(c, fillN, td.fillColor);
        if (strokeN && td.applyStroke) P.addProperty("ADBE Text Stroke Color").expression = color(c, strokeN, td.strokeColor);
        try { A.moveTo(1); } catch (e) { w("   주의: 애니메이터 맨 앞으로 못 옮김 " + L.name + " " + e.message); }
    }
    function animByName(L, an) { var g = L.property("ADBE Text Properties").property("ADBE Text Animators"); for (var i = 1; i <= g.numProperties; i++) if (g.property(i).name == an) return g.property(i); throw new Error("애니메이터 없음 " + an); }
    function animExist(c, L, an, fillN, strokeN) {   // 이미 있는 강조 애니메이터의 색
        var P = animByName(L, an).property("ADBE Text Animator Properties");
        if (fillN) { var f = P.property("ADBE Text Fill Color"); f.expression = color(c, fillN, f.value); }
        if (strokeN) { var s = P.property("ADBE Text Stroke Color"); if (s) s.expression = color(c, strokeN, s.value); }
    }
    function shapeFill(c, L, n) {
        function find(g) { for (var i = 1; i <= g.numProperties; i++) { var p = g.property(i); if (p.matchName == "ADBE Vector Fill Color") return p; if (p.numProperties) { var q = find(p); if (q) return q; } } return null; }
        var p = find(L.property("ADBE Root Vectors Group")); p.expression = color(c, n, p.value);
    }
    function shadow(c, L, n) { var e = fx1(L, "ADBE Drop Shadow"); var p = e.property("ADBE Drop Shadow-0001"); p.expression = color(c, n, p.value); }
    // 줄 크기·위치: 기준점 = 줄 가운데(왼쪽 정렬이면 왼쪽 끝), 기본값이면 전과 같은 자리
    function line(c, L, pre, posExpr) {
        var j = tdoc(L).value.justification, fx = (j == ParagraphJustification.LEFT_JUSTIFY) ? 0 : (j == ParagraphJustification.RIGHT_JUSTIFY ? 1 : 0.5);
        var A0 = tr(L, "ADBE Anchor Point").value, S0 = tr(L, "ADBE Scale").value;
        var s = slider(c, pre + " 크기", 100), o = point(c, pre + " 위치 이동");
        tr(L, "ADBE Anchor Point").expression = "var r=sourceRectAtTime(time,false); [r.left+" + fx + "*r.width, r.top+r.height/2]";
        tr(L, "ADBE Scale").expression = "var k=" + s + "/100; [value[0]*k, value[1]*k]";
        var dx = "(transform.anchorPoint[0]-(" + A0[0] + "))*" + S0[0] / 100, dy = "(transform.anchorPoint[1]-(" + A0[1] + "))*" + S0[1] / 100;
        tr(L, "ADBE Position").expression = posExpr ? posExpr(o, dy) : "var o=" + o + "; [value[0]+" + dx + "+o[0], value[1]+" + dy + "+o[1]]";
        return o;
    }
    function follow(L, src) {   // 매트 등: 다른 줄과 같은 변형
        tr(L, "ADBE Anchor Point").expression = 'thisComp.layer("' + src + '").transform.anchorPoint';
        tr(L, "ADBE Scale").expression = 'thisComp.layer("' + src + '").transform.scale';
        tr(L, "ADBE Position").expression = 'thisComp.layer("' + src + '").transform.position';
    }
    function moveWith(L, o) { tr(L, "ADBE Position").expression = "var o=" + o + "; [value[0]+o[0], value[1]+o[1]]"; }

    var SPEC = {
        "실망_우울_좌절_AE": ["05_실망 우울 좌절 모션자막_AE", function (c) { ramp(c, lay(c, "그라데이션"), "글자 위 색", "글자 아래 색"); srcColor(c, lay(c, "테두리"), "테두리 색", "테두리 색"); shadow(c, lay(c, "테두리"), "그림자 색"); }],
        "분노_화나는_AE": ["08_분노 화나는 모션자막_AE", function (c) { animColor(c, lay(c, "자막"), "글자 색", "테두리 색"); }],
        "분노_화나는2_AE": ["10_분노 화나는 모션자막_AE", function (c) { ramp(c, lay(c, "그라데이션"), "글자 위 색", "글자 아래 색"); srcColor(c, lay(c, "검은 테두리"), "안쪽 테두리 색", "안쪽 테두리 색"); srcColor(c, lay(c, "흰 테두리"), "바깥 테두리 색", "바깥 테두리 색"); }],
        "잔망스럽고_귀여운_AE": ["봄자막 03-잔망스럽고 귀여운 움직임_AE", function (c) { var L = lay(c, "자막"); animColor(c, L, "글자 색", "테두리 색"); animExist(c, L, "단어 색", "강조 단어 색"); }],
        "즐겁게_흥얼거리는_AE": ["봄자막 04-즐겁게 흥얼거리는 움직임_AE", function (c) { var L = lay(c, "자막"); animColor(c, L, "글자 색", "테두리 색"); animExist(c, L, "단어 색", "강조 단어 색"); }],
        "뿅_솟아오르는_AE": ["봄자막 06-뿅 솟아오르는(빠르게)_AE", function (c) { var L = lay(c, "자막"); animColor(c, L, "글자 색", "테두리 색"); animExist(c, L, "단어 색", "강조 단어 색"); shadow(c, L, "그림자 색"); }],
        "꼬물꼬물_AE": ["봄자막 12-꼬물꼬물_AE", function (c) { var L = lay(c, "자막"); animColor(c, L, "글자 색", "테두리 색"); shadow(c, L, "번짐 색"); }],
        "기분좋은_AE": ["봄자막 13-기분좋은 움직임_AE", function (c) { ramp(c, lay(c, "그라데이션"), "글자 위 색", "글자 아래 색"); srcColor(c, lay(c, "테두리"), "테두리 색", "테두리 색"); shadow(c, lay(c, "테두리"), "번짐 색"); }],
        "정보바_세트안내": ["정보바_세트안내_AE", function (c) { var L = lay(c, "표시"); animColor(c, L, "글자 색", "글자 색"); animExist(c, L, "애니메이터 1", "강조 색", "강조 색"); shapeFill(c, lay(c, "상자"), "상자 색"); }],
        "해설_괄호": ["해설_괄호_AE", function (c) { var L = lay(c, "해설"); animColor(c, L, "글자 색", "테두리 색"); shadow(c, L, "테두리 색"); }],
        "Tip_동작요령_2단": ["Tip_동작요령_2단_AE", function (c) {
            var U = lay(c, "윗줄"), B = lay(c, "아랫줄");
            animColor(c, U, "윗줄 색", "테두리 색"); animColor(c, B, "아랫줄 색", "테두리 색"); shadow(c, U, "테두리 색"); shadow(c, B, "테두리 색");
            shapeFill(c, lay(c, "배지"), "테두리 색"); animColor(c, lay(c, "Tip"), "Tip 글자 색", null);
            var o = line(c, U, "윗줄"); line(c, B, "아랫줄"); moveWith(lay(c, "배지"), o); moveWith(lay(c, "Tip"), o);   // 배지는 윗줄과 같이 움직임
        }],
        "요령_노랑_2단": ["요령_노랑_2단_AE", function (c) {
            var U = lay(c, "윗줄"), B = lay(c, "아랫줄");
            animColor(c, U, "윗줄 색", "테두리 색"); animColor(c, B, "아랫줄 색", "테두리 색"); shadow(c, U, "테두리 색"); shadow(c, B, "테두리 색");
            line(c, U, "윗줄"); line(c, B, "아랫줄");
        }],
        "정보바_2줄": ["정보바_2줄_AE", function (c) {
            var U = lay(c, "윗줄"), B = lay(c, "아랫줄");
            animColor(c, U, "글자 색", "글자 색"); animColor(c, B, "글자 색", "글자 색");
            animExist(c, U, "애니메이터 1", "강조 색", "강조 색"); animExist(c, B, "애니메이터 1", "강조 색", "강조 색");
            shapeFill(c, lay(c, "상자"), "상자 색");
            // 상자 위·아래도 줄을 따라감: 기본 문구의 글자 위 끝(윗줄)·아래 끝(아랫줄)을 기준점으로 고정해 두고 화면 위치 변화만큼 늘림
            var ru = U.sourceRectAtTime(0, false), rb = B.sourceRectAtTime(0, false), TA = ru.top, BB = rb.top + rb.height;
            line(c, U, "윗줄"); line(c, B, "아랫줄");
            function cy(L, y) { var p = tr(L, "ADBE Position").valueAtTime(0, false), a = tr(L, "ADBE Anchor Point").valueAtTime(0, false), s = tr(L, "ADBE Scale").valueAtTime(0, false); return p[1] + (y - a[1]) * s[1] / 100; }
            var T0 = cy(U, TA), B0 = cy(B, BB);
            var S = lay(c, "상자"), sz = (function f(g) { for (var i = 1; i <= g.numProperties; i++) { var q = g.property(i); if (q.matchName == "ADBE Vector Rect Size") return q; if (q.numProperties) { var z = f(q); if (z) return z; } } return null; })(S.property("ADBE Root Vectors Group")), ps = tr(S, "ADBE Position");
            var v = 'var tt=thisComp.layer("윗줄").toComp([0,' + TA + '])[1], bb=thisComp.layer("아랫줄").toComp([0,' + BB + '])[1]; ';
            sz.expression = v + sz.expression.replace("151]", "151+(bb-tt)-(" + (B0 - T0) + ")]");
            ps.expression = v + ps.expression.replace("963]", "963+((tt+bb)-(" + (T0 + B0) + "))/2]");
            w("   상자 기준 위 " + Math.round(T0) + " 아래 " + Math.round(B0));
        }],
        "요약_색강조_한줄": ["요약_색강조_한줄_AE", function (c) {
            var L = lay(c, "글자"); animColor(c, L, "글자 색", "테두리 색");
            ramp(c, lay(c, "하늘 색"), "{하늘} 위 색", "{하늘} 아래 색"); ramp(c, lay(c, "초록 색"), "[초록] 위 색", "[초록] 아래 색");
        }]
    };
    function sum2(col) {
        return [null, function (c) {
            var U = lay(c, "윗줄"), B = lay(c, "아랫줄");
            animColor(c, U, "윗줄 색", "테두리 색"); animColor(c, B, null, "테두리 색");
            ramp(c, lay(c, col + " 색"), "아랫줄 위 색", "아랫줄 아래 색");
            line(c, B, "아랫줄"); follow(lay(c, "아랫줄 매트"), "아랫줄");
            // 윗줄 왼쪽 = 아랫줄 왼쪽 + 24 (아랫줄 크기·위치를 바꿔도 따라감) + 윗줄 위치 이동
            line(c, U, "윗줄", function (o, dy) {
                return 'var B=thisComp.layer("아랫줄"), rb=B.sourceRectAtTime(time,false), bl=B.transform.position[0]+(rb.left-B.transform.anchorPoint[0])*B.transform.scale[0]/100;' +
                       ' var r=sourceRectAtTime(time,false), o=' + o + '; [bl+24+(transform.anchorPoint[0]-r.left)*transform.scale[0]/100+o[0], value[1]+' + dy + '+o[1]]';
            });
        }];
    }
    SPEC["요약_2단_초록"] = sum2("초록"); SPEC["요약_2단_빨강"] = sum2("빨강"); SPEC["요약_2단_노랑"] = sum2("노랑");
    SPEC["요약_2단_초록"][0] = "요약_2단_초록_AE"; SPEC["요약_2단_빨강"][0] = "요약_2단_빨강_AE"; SPEC["요약_2단_노랑"][0] = "요약_2단_노랑_AE";

    var P = ["work\\포인트\\ae_templates\\05_실망\\05_실망_AE.aep", "work\\포인트\\ae_templates\\08_분노\\08_분노_AE.aep",
             "work\\포인트\\ae_templates\\10_분노\\10_분노_AE.aep", "work\\포인트\\ae_templates\\봄03\\봄03_AE.aep",
             "work\\포인트\\ae_templates\\봄04\\봄04_AE.aep", "work\\포인트\\ae_templates\\봄06\\봄06_AE.aep",
             "work\\포인트\\ae_templates\\봄12\\봄12_AE.aep", "work\\포인트\\ae_templates\\봄13\\봄13_AE.aep",
             "work\\회고\\tpl\\ae\\info4.aep", "work\\회고\\목교정기\\tpl\\ae\\info2.aep", "work\\회고\\자세교정\\tpl\\ae\\sum2.aep"];
    var ONLY = (typeof UPGRADE_ONLY != "undefined") ? UPGRADE_ONLY : null;   // 시험용: 컴포지션 이름 하나만
    try {
        app.beginSuppressDialogs();
        new Folder(EXP).create();
        for (var k = 0; k < P.length; k++) {
            var path = R + P[k], bak = new File(path.replace(".aep", "_백업1013.aep"));
            if (!bak.exists) { new File(path).copy(bak.fsName); w("백업 " + bak.name); }
            if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            app.open(new File(path));
            var done = [];
            for (var i = 1; i <= app.project.numItems; i++) {
                var c = app.project.item(i);
                if (!(c instanceof CompItem) || !SPEC[c.name] || (ONLY && c.name != ONLY)) continue;
                var already = false; for (var q = 1; q <= c.numLayers; q++) if (c.layer(q).name == CTL) already = true;
                if (already) { w(c.name + " 이미 정리됨 — 내보내기만"); done.push(c.name); continue; }
                ORDER = [];
                var d = 300 * c.frameDuration;
                c.duration = d; c.workAreaStart = 0; c.workAreaDuration = d;
                for (var j = 1; j <= c.numLayers; j++) { var L = c.layer(j), lk = L.locked; L.locked = false; L.outPoint = d; L.locked = lk; }
                SPEC[c.name][1](c);
                var ok = [];
                for (var m = 0; m < ORDER.length; m++) { var pp = ctl(c).property("ADBE Effect Parade").property(ORDER[m]).property(1); ok.push(ORDER[m] + (pp.addToMotionGraphicsTemplateAs(c, ORDER[m]) ? "" : "(실패)")); }   // 효과를 더하면 앞 참조가 무효 → 이름으로 다시 찾음
                w(c.name + " 길이 " + Math.round(c.duration * 1000) / 1000 + "초, 칸 " + c.motionGraphicsTemplateControllerCount + " — " + ok.join(", "));
                done.push(c.name);
            }
            app.project.save(new File(path));
            for (var n = 0; n < done.length; n++) {
                var cc = null; for (var z = 1; z <= app.project.numItems; z++) if (app.project.item(z) instanceof CompItem && app.project.item(z).name == done[n]) cc = app.project.item(z);   // 내보내면 앞 참조가 무효 → 이름으로 다시
                var dir = new Folder(EXP + SPEC[done[n]][0]); if (!dir.exists) dir.create();
                if (new File(dir.fsName + "/done.txt").exists) { w("  내보내기 " + done[n] + " 이미 함"); continue; }
                var okx = cc.exportAsMotionGraphicsTemplate(true, dir.fsName); w("  내보내기 " + done[n] + " = " + okx);
                if (okx) { var df = new File(dir.fsName + "/done.txt"); df.open("w"); df.write("1"); df.close(); }
            }
        }
        w("UPGRADE END");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
