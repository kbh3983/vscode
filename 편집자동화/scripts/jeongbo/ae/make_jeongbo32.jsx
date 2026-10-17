// 정보성 에이전트 — 레퍼런스(궁금한뇌·탐구생활·세바시) 자주 쓰인 자막·그래픽 32종 → AE 템플릿(.mogrt)
// 2026-10-17 사용자: "32개 다 제작하자. 나눠서 하는게 좋아" / 반영: "1 자막 길이는 10초 2 폰트는 프리텐다드 3 요소별 색상, 위치, 사이즈 등 디테일 수정 가능하도록"
// 근거: work/정보성/분석/통합분석.md (견본 궁#·탐#·세#). 채널 고유 디자인(앱 아이콘·네온 로고)은 베끼지 않고 느낌만
// 공통 규칙 (교양 v2·playbook_AE변환 12~14장)
//   - 300프레임(10.01초), 맨 아래 널 "템플릿 조절"에 모든 칸, 그 위 널 "전체"(전체 크기(%)·위치 이동)가 부모
//   - 글자 요소마다 "<요소> 색"(맨 앞 애니메이터)·"<요소> 위치"(점)·"<요소> 크기(%)", 테두리 있으면 "<요소> 테두리 색"
//   - 상자는 글자 레이어의 자식으로 글자 크기를 따라감 — "<상자> 색"·"<상자> 투명도(%)"
//   - {단어} 강조가 있는 칸: 숨은 원문의 style(폰트·크기)을 화면 글자가 그대로 받음 + "<요소> 강조 색"
//   - 폰트·크기 수정 허용은 finish_mogrt.py가 켬(capParams까지)
// 실행: run_ae.ps1 <이 파일> <OUT\result.txt> "Jeongbo 끝|ERR" 1500  (OUT\only.txt 에 "1-8" 처럼 번호 범위 → 그 번호만 다시 만듦, 없으면 아직 안 끝난 것 전부)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\정보성\\템플릿\\ae";
    var FPS = 29.97, FR = 1 / FPS, NF = 300, DUR = NF / FPS;
    var CTL = "템플릿 조절";
    var WHT = [255, 255, 255], BLK = [0, 0, 0], YEL = [244, 230, 40], BLUE = [38, 115, 231], RED = [232, 44, 44], GRAY = [215, 215, 215], NAVY = [35, 40, 110];
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function c1(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function tp(L, m) { return L.property("ADBE Transform Group").property(m); }
    function ref(n) { return 'thisComp.layer("' + CTL + '").effect("' + n + '")(1)'; }
    var C, ORDER, TEXTS, BOXES;
    function fx() { return C.layer(CTL).property("ADBE Effect Parade"); }
    function has(n) { var e = fx(); for (var i = 1; i <= e.numProperties; i++) if (e.property(i).name == n) return true; return false; }
    function cColor(n, v) { if (!has(n)) { var e = fx().addProperty("ADBE Color Control"); e.name = n; var k = c1(v); fx().property(n).property(1).setValue([k[0], k[1], k[2], 1]); ORDER.push(n); } return ref(n); }
    function cSlider(n, v) { if (!has(n)) { var e = fx().addProperty("ADBE Slider Control"); e.name = n; fx().property(n).property(1).setValue(v); ORDER.push(n); } return ref(n); }
    function cPoint(n) { if (!has(n)) { var e = fx().addProperty("ADBE Point Control"); e.name = n; fx().property(n).property(1).setValue([0, 0]); ORDER.push(n); } return ref(n); }
    function cAngle(n, v) { if (!has(n)) { var e = fx().addProperty("ADBE Angle Control"); e.name = n; fx().property(n).property(1).setValue(v); ORDER.push(n); } return ref(n); }
    function cDrop(n, items, v) {
        fx().addProperty("ADBE Dropdown Control"); var i = fx().numProperties;
        fx().property(i).property(1).setPropertyParameters(items);
        fx().property(i).name = n; fx().property(i).property(1).setValue(v); ORDER.push(n); return ref(n);
    }
    function newComp(id, name) {
        var old = findComp(id + "_" + name); if (old) old.remove();
        C = app.project.items.addComp(id + "_" + name, 1920, 1080, 1, DUR, FPS);
        var N = C.layers.addNull(DUR); N.name = CTL; N.moveToEnd();
        ORDER = []; TEXTS = []; BOXES = [];
        w(id + " " + name);
    }
    function findComp(n) { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem && app.project.item(i).name == n) return app.project.item(i); return null; }
    var JUST = { L: ParagraphJustification.LEFT_JUSTIFY, C: ParagraphJustification.CENTER_JUSTIFY, R: ParagraphJustification.RIGHT_JUSTIFY };
    function mkText(name, txt, o) {
        var L = C.layers.addText(txt); L.name = name;
        var st = tdoc(L), td = st.value;
        td.font = o.font || "Pretendard-Bold"; td.fontSize = o.size || 50; td.fillColor = c1(o.col || WHT); td.applyFill = true;
        td.justification = JUST[o.just || "C"]; td.tracking = (o.track === undefined ? -10 : o.track);
        if (o.lead) { td.autoLeading = false; td.leading = o.lead; }
        if (o.italic) td.fauxItalic = true;
        if (o.stroke) { td.applyStroke = true; td.strokeColor = c1(o.stroke[0]); td.strokeWidth = o.stroke[1]; td.strokeOverFill = false; } else td.applyStroke = false;
        st.setValue(td);
        if (tdoc(L).value.font != td.font) w("  주의 폰트 " + name + " → " + tdoc(L).value.font);
        return L;
    }
    function animColor(name, fillExpr, strokeExpr) {
        var A = C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A.name = "색 바꾸기";
        var g = function () { return C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기"); };
        g().property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        if (fillExpr) g().property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");
        if (strokeExpr) g().property("ADBE Text Animator Properties").addProperty("ADBE Text Stroke Color");
        if (fillExpr) g().property("ADBE Text Animator Properties").property("ADBE Text Fill Color").expression = fillExpr;
        if (strokeExpr) g().property("ADBE Text Animator Properties").property("ADBE Text Stroke Color").expression = strokeExpr;
        try { g().moveTo(1); } catch (e) {}
    }
    function shadowOn(name, op, dist, soft) {
        var sc = cColor("그림자 색", BLK), so = cSlider("그림자 진하기(%)", op);
        C.layer(name).property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
        var D = C.layer(name).property("ADBE Effect Parade").property("ADBE Drop Shadow");
        D.property("ADBE Drop Shadow-0001").expression = sc; D.property("ADBE Drop Shadow-0002").expression = so + '*2.55';
        D.property("ADBE Drop Shadow-0003").setValue(135); D.property("ADBE Drop Shadow-0004").setValue(dist); D.property("ADBE Drop Shadow-0005").setValue(soft);
    }
    // 글자 요소: o = {label, txt, font, size, col, pos:[x,y], just, stroke, shadow:[op,dist,soft], accent:[r,g,b], track, lead, italic, noCtl}
    // 반환: 화면 글자 레이어 이름
    function T(name, o) {
        var label = o.label || name, disp = name;
        if (o.accent) {
            var S = mkText(name + " 원문", o.txt, o); S.enabled = false; S.guideLayer = true;
            mkText(name, o.txt.replace(/[\{\}]/g, ""), o);
            tdoc(C.layer(name)).expression = 'var p=thisComp.layer("' + name + ' 원문").text.sourceText; p.style.setText((""+p).replace(/[\\{\\}]/g,""))';
            TEXTS.push([name + " 원문", label]);
        } else { mkText(name, o.txt, o); TEXTS.push([name, label]); }
        var fc = cColor(label + " 색", o.col || WHT);
        var scx = o.stroke ? cColor(label + " 테두리 색", o.stroke[0]) : null;
        animColor(name, fc, scx);
        if (o.accent) {
            var ac = cColor(label + " 강조 색 ({} 안)", o.accent);
            var A = C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A.name = "강조";
            var g = function () { return C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").property("강조"); };
            g().property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");
            g().property("ADBE Text Animator Properties").property("ADBE Text Fill Color").expression = ac;
            g().property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
            g().property("ADBE Text Selectors").property(1).property("ADBE Text Expressible Amount").expression =
                'var s=""+thisComp.layer("' + name + ' 원문").text.sourceText, m=[], on=false;\nfor (var i=0;i<s.length;i++){var c=s.charAt(i); if(c=="{"){on=true;continue;} if(c=="}"){on=false;continue;} if(c=="\\r"||c=="\\n") continue; m.push(on?1:0);}\nvar v=(m[textIndex-1]||0)?100:0; [v,v,v]';
        }
        if (o.shadow) shadowOn(name, o.shadow[0], o.shadow[1], o.shadow[2]);
        var L = C.layer(name), j = o.just || "C", ax = "r.left+r.width/2";
        if (j == "L") ax = "r.left"; else if (j == "R") ax = "r.left+r.width";   // 겹친 ? : 는 ExtendScript에서 잘못 계산됨 (2026-10-17 왼쪽 정렬이 오른쪽 기준이 됨)
        tp(L, "ADBE Anchor Point").expression = 'var r=sourceRectAtTime(time,false); [' + ax + ', r.top+r.height/2]';
        tp(L, "ADBE Position").setValue(o.pos);
        if (!o.noCtl) {
            var pp = cPoint(label + " 위치"), ss = cSlider(label + " 크기(%)", 100);
            tp(C.layer(name), "ADBE Position").expression = 'value+' + pp + (o.posExtra || "");
            tp(C.layer(name), "ADBE Scale").expression = 'var k=' + ss + '/100; [value[0]*k, value[1]*k]';
        }
        if (o.rot) tp(C.layer(name), "ADBE Rotate Z").expression = cAngle(label + " 기울기", o.rot);
        return name;
    }
    // 글자 뒤 상자 (글자 레이어의 자식 — 글자 크기·위치·기울기를 따라감)
    function boxFor(textName, label, o) {
        var col = cColor(label + " 색", o.col), op = cSlider(label + " 투명도(%)", o.op === undefined ? 100 : o.op);
        var S = C.layers.addShape(); S.name = label;
        var g = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        S = C.layer(label);
        var vg = S.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); r.width<1?[0,0]:[r.width+' + (2 * o.pad[0]) + ', ' + (o.h ? o.h : 'r.height+' + (2 * o.pad[1])) + ']';
        vg.property(1).property("ADBE Vector Rect Position").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); [r.left+r.width/2' + (o.dx ? '+' + o.dx : '') + ', r.top+r.height/2' + (o.dy ? '+' + o.dy : '') + ']';
        if (o.radius) vg.property(1).property("ADBE Vector Rect Roundness").setValue(o.radius);
        vg.property(2).property("ADBE Vector Fill Color").expression = col;
        S = C.layer(label);
        S.parent = C.layer(textName);
        tp(S, "ADBE Anchor Point").setValue([0, 0]); tp(S, "ADBE Position").setValue([0, 0]); tp(S, "ADBE Scale").setValue([100, 100]); tp(S, "ADBE Rotate Z").setValue(0);
        tp(S, "ADBE Opacity").expression = op + '*thisLayer.parent.transform.opacity/100';
        S.moveAfter(C.layer(textName));
        BOXES.push(label);
        return label;
    }
    // 단독 도형 (사각형·원·선): o = {type:"rect"|"ellipse"|"path", size, pos, col, op, radius, stroke:[col,w], verts, closed}
    function shape(label, o) {
        var S = C.layers.addShape(); S.name = label;
        var g = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var t = o.type || "rect";
        if (t == "rect") g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        else if (t == "ellipse") g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
        else g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
        if (o.trim) g.property("ADBE Vectors Group").addProperty("ADBE Vector Filter - Trim");   // 획보다 위에 있어야 획이 트림된 경로를 그림
        if (o.stroke) g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
        if (o.col) g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        var vg = C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        if (t == "rect") { vg.property(1).property("ADBE Vector Rect Size").setValue(o.size); if (o.radius) vg.property(1).property("ADBE Vector Rect Roundness").setValue(o.radius); }
        else if (t == "ellipse") vg.property(1).property("ADBE Vector Ellipse Size").setValue(o.size);
        else { var sh = new Shape(); sh.vertices = o.verts; sh.closed = !!o.closed; vg.property(1).property("ADBE Vector Shape").setValue(sh); }
        for (var i = 2; i <= vg.numProperties; i++) {
            var p = vg.property(i);
            if (p.matchName == "ADBE Vector Graphic - Stroke" && o.raw) { vg.property(i).property("ADBE Vector Stroke Color").setValue(c1(o.stroke[0])); vg = C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); vg.property(i).property("ADBE Vector Stroke Width").setValue(o.stroke[1]); vg = C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); vg.property(i).property("ADBE Vector Stroke Line Cap").setValue(2); }
            else if (p.matchName == "ADBE Vector Graphic - Fill" && o.raw) { vg.property(i).property("ADBE Vector Fill Color").setValue(c1(o.col)); vg = C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); }
            else if (p.matchName == "ADBE Vector Graphic - Stroke") { vg.property(i).property("ADBE Vector Stroke Color").expression = cColor(label + " 색", o.stroke[0]); vg = C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); vg.property(i).property("ADBE Vector Stroke Width").expression = cSlider(label + " 두께", o.stroke[1]); vg = C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); vg.property(i).property("ADBE Vector Stroke Line Cap").setValue(2); }
            else if (p.matchName == "ADBE Vector Graphic - Fill") { vg.property(i).property("ADBE Vector Fill Color").expression = cColor(label + " 색", o.col); vg = C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); }
            else if (p.matchName == "ADBE Vector Filter - Trim") { var e = vg.property(i).property("ADBE Vector Trim End"); e.setValueAtTime((o.trim[0]) * FR, 0); e.setValueAtTime((o.trim[0] + o.trim[1]) * FR, 100); vg = C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); }
        }
        tp(C.layer(label), "ADBE Position").setValue(o.pos || [0, 0]);
        if (!o.raw) { var op = cSlider(label + " 투명도(%)", o.op === undefined ? 100 : o.op); tp(C.layer(label), "ADBE Opacity").expression = 'value*' + op + '/100'; }
        if (!o.noPos) { var pp = cPoint(label + " 위치"); tp(C.layer(label), "ADBE Position").expression = 'value+' + pp; }
        if (o.scaleCtl) { var ss = cSlider(label + " 크기(%)", 100); tp(C.layer(label), "ADBE Scale").expression = 'var k=' + ss + '/100; [value[0]*k,value[1]*k]'; }
        return label;
    }
    // 화면 전체 배경 (어둡게 등) — 부모 없이 고정
    function bg(label, col, op) {
        var S = C.layers.addSolid(c1(col), label, 1920, 1080, 1, DUR);
        C.layer(label).property("ADBE Effect Parade").addProperty("ADBE Fill");
        C.layer(label).property("ADBE Effect Parade").property("ADBE Fill").property("ADBE Fill-0002").expression = cColor(label + " 색", col);
        tp(C.layer(label), "ADBE Opacity").expression = 'value*' + cSlider(label + " 투명도(%)", op) + '/100';
        C.layer(label).moveBefore(C.layer(CTL));
        BOXES.push(label);   // 전체 크기에서 뺌
        return label;
    }
    function master(cx, cy) {
        var sc = cSlider("전체 크기(%)", 100), mv = cPoint("전체 위치");
        var P = C.layers.addNull(DUR); P.name = "전체";
        tp(P, "ADBE Anchor Point").setValue([cx, cy]); tp(P, "ADBE Position").setValue([cx, cy]);
        tp(P, "ADBE Scale").expression = 'var k=' + sc + '; [k,k]'; tp(P, "ADBE Position").expression = 'value+' + mv;
        for (var i = 1; i <= C.numLayers; i++) {
            var L = C.layer(i), skip = (L.name == "전체" || L.name == CTL || L.guideLayer || L.parent);
            for (var b = 0; b < BOXES.length; b++) if (L.name == BOXES[b] && !L.parent) skip = true;
            if (!skip) L.parent = P;
        }
        P.moveBefore(C.layer(CTL));
    }
    // 등장 (master 뒤에) — type: fade/pop/up/left/type(글자 차례로), f0 = 시작 프레임, n = 길이
    function anim(name, type, f0, n) {
        var L = C.layer(name); f0 = f0 || 0;
        var op = tp(L, "ADBE Opacity");
        if (type != "type") { op.setValueAtTime(f0 * FR, 0); op.setValueAtTime((f0 + (type == "pop" ? 3 : (n || 6))) * FR, 100); }
        if (type == "pop") { var s = tp(L, "ADBE Scale"), v = s.value; var K = [[0, 85], [3, 105], [6, 100]]; for (var i = 0; i < 3; i++) s.setValueAtTime((f0 + K[i][0]) * FR, [v[0] * K[i][1] / 100, v[1] * K[i][1] / 100]); }
        if (type == "up" || type == "left") {
            var p = tp(L, "ADBE Position"), v0 = p.value, d = type == "up" ? [0, 24] : [-40, 0];
            p.setValueAtTime(f0 * FR, [v0[0] + d[0], v0[1] + d[1]]); p.setValueAtTime((f0 + (n || 8)) * FR, v0);
            var e = new KeyframeEase(0, 75); p.setTemporalEaseAtKey(2, [e], [e]);
        }
        if (type == "type") {
            var A = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A.name = "글자 등장";
            var g = function () { return C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").property("글자 등장"); };
            g().property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
            g().property("ADBE Text Animator Properties").property("ADBE Text Opacity").setValue(0);
            g().property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            var st = g().property("ADBE Text Selectors").property(1).property("ADBE Text Percent Start");
            st.setValueAtTime(f0 * FR, 0); st.setValueAtTime((f0 + (n || 15)) * FR, 100);
        }
    }
    // 정한 초에 나타남 (목록 항목 등): 투명도·왼쪽에서 밀려옴
    function revealAt(name, secExpr) {
        var L = C.layer(name);
        tp(L, "ADBE Opacity").expression = 'var s=' + secExpr + '; value*linear(time,s,s+6*thisComp.frameDuration,0,1)';
        var pe = tp(C.layer(name), "ADBE Position").expression || "value";
        tp(C.layer(name), "ADBE Position").expression = pe + '+[linear(time,' + secExpr + ',' + secExpr + '+6*thisComp.frameDuration,-24,0),0]';
    }
    function register() {
        var ok = [];
        for (var i = 0; i < TEXTS.length; i++) ok.push(TEXTS[i][1] + (tdoc(C.layer(TEXTS[i][0])).addToMotionGraphicsTemplateAs(C, TEXTS[i][1]) ? "" : "(실패)"));
        for (var m = 0; m < ORDER.length; m++) { var pp = fx().property(ORDER[m]).property(1); ok.push(ORDER[m] + (pp.addToMotionGraphicsTemplateAs(C, ORDER[m]) ? "" : "(실패)")); }
        w("  칸 " + ok.length + ": " + ok.join(", "));
    }
    var SH = [55, 3, 10];   // 기본 그림자

    // ───────── 템플릿 정의 ─────────
    var B = {};
    B[1] = ["2단_정리자막", 2, function () {   // 3채널: 윗줄 작게·얇게 + 아랫줄 크게·굵게, 핵심 단어 강조색
        T("아랫줄", { txt: "다양한 솔루션으로 {전략적}으로!", font: "Pretendard-ExtraBold", size: 84, pos: [960, 985], shadow: SH, accent: YEL });
        T("윗줄", { txt: "각자의 상태에 맞게", font: "Pretendard-Medium", size: 40, pos: [960, 900], shadow: SH });
        master(960, 960); anim("윗줄", "up", 0, 8); anim("아랫줄", "up", 3, 8);
    }];
    B[2] = ["장제목_왼쪽2줄", 2, function () {   // 탐구생활·세바시: 윗줄 얇게 + 아랫줄 굵은 질문
        T("윗줄", { txt: "랄프 로렌의", font: "Pretendard-Light", size: 64, just: "L", pos: [110, 250], shadow: SH });
        T("아랫줄", { txt: "영감의 원천은?", font: "Pretendard-Bold", size: 78, just: "L", pos: [110, 345], shadow: SH });
        master(110, 300); anim("윗줄", "left", 0, 10); anim("아랫줄", "left", 4, 10);
    }];
    B[3] = ["장제목_왼쪽위_고정", 2, function () {   // 세바시: "| 제목" 장 내내
        T("제목", { txt: "55%는 타고나는 것, 45%는 우리가 바꿀 수 있다", font: "Pretendard-Bold", size: 40, just: "L", pos: [130, 85], shadow: [45, 2, 8] });
        boxFor("제목", "앞 세로선", { col: WHT, pad: [0, 4], h: "r.height+8", dx: '-(r.width/2)-18' });
        var vg = C.layer("앞 세로선").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); r.width<1?[0,0]:[5, r.height+8]';
        master(130, 85); anim("제목", "fade", 0, 8);
    }];
    B[4] = ["용어카드", 3, function () {   // 궁금한뇌·탐구생활: 아이콘 + 용어 + 영어 + 반투명 설명 상자
        T("설명", { txt: "특별한 원인 없이 수 시간 또는 2~3일 이내에\r갑자기 발생하는 감각신경성 난청", font: "Pretendard-Medium", size: 34, col: [40, 40, 40], pos: [960, 935], lead: 46 });
        boxFor("설명", "설명 상자", { col: [232, 232, 232], op: 88, pad: [250, 26], radius: 18 });
        T("용어", { txt: "돌발성 난청", font: "Pretendard-Bold", size: 62, just: "L", pos: [470, 822], shadow: [45, 2, 8] });
        // 영어 작은 자막은 뺌 (2026-10-17 사용자: "자존감 밑에 영어 자막 작게 들어간 것 삭제해주고, 정렬 맞춰줘")
        boxFor("용어", "아이콘", { col: BLUE, pad: [0, 0], h: "62", radius: 14, dx: '-(r.width/2)-46' });
        var vg = C.layer("아이콘").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); r.width<1?[0,0]:[62,62]';
        // 돋보기 그림 (2026-10-17 사용자: "4번 템플릿 파란 네모 박스 안에 돋보기 그림 넣어줘") — 아이콘 상자 가운데, 용어 글자를 따라감
        var mgC = cColor("돋보기 색", WHT), mgW = cSlider("돋보기 굵기", 8), mgS = cSlider("돋보기 크기(%)", 100);
        var MG = C.layers.addShape(); MG.name = "돋보기";
        var g1 = MG.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); g1.name = "렌즈";
        g1.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
        g1.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
        var g2 = C.layer("돋보기").property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); g2.name = "손잡이";
        g2.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
        g2.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
        MG = C.layer("돋보기"); var RV = MG.property("ADBE Root Vectors Group");
        RV.property("렌즈").property("ADBE Vectors Group").property(1).property("ADBE Vector Ellipse Size").setValue([44, 44]);
        RV = C.layer("돋보기").property("ADBE Root Vectors Group"); RV.property("렌즈").property("ADBE Vectors Group").property(1).property("ADBE Vector Ellipse Position").setValue([-6, -6]);
        var hs = new Shape(); hs.vertices = [[10, 10], [24, 24]]; hs.closed = false;
        RV = C.layer("돋보기").property("ADBE Root Vectors Group"); RV.property("손잡이").property("ADBE Vectors Group").property(1).property("ADBE Vector Shape").setValue(hs);
        var nmG = ["렌즈", "손잡이"];
        for (var q = 0; q < 2; q++) {
            RV = C.layer("돋보기").property("ADBE Root Vectors Group");
            var stk = RV.property(nmG[q]).property("ADBE Vectors Group").property(2);
            stk.property("ADBE Vector Stroke Color").expression = mgC;
            RV = C.layer("돋보기").property("ADBE Root Vectors Group"); stk = RV.property(nmG[q]).property("ADBE Vectors Group").property(2);
            stk.property("ADBE Vector Stroke Width").expression = mgW + (q ? '*1.25' : '');
            RV = C.layer("돋보기").property("ADBE Root Vectors Group"); stk = RV.property(nmG[q]).property("ADBE Vectors Group").property(2);
            stk.property("ADBE Vector Stroke Line Cap").setValue(2);
        }
        MG = C.layer("돋보기"); MG.parent = C.layer("용어");
        tp(MG, "ADBE Anchor Point").setValue([0, 0]); tp(MG, "ADBE Rotate Z").setValue(0);
        // 아이콘 상자 가운데 = 용어 글자 왼쪽 끝 − 77.5, 세로 가운데 (영어 뺀 뒤 용어와 아이콘 가운데 맞춤) (fit_jeongbo32 아이콘 상자와 같은 식)
        tp(MG, "ADBE Position").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); [r.left-77.5, r.top+r.height/2]';
        tp(MG, "ADBE Scale").expression = 'var k=' + mgS + '; [k,k]';
        tp(MG, "ADBE Opacity").expression = 'thisLayer.parent.transform.opacity';
        MG.moveBefore(C.layer("아이콘"));
        master(960, 880); anim("용어", "pop", 0); anim("설명", "up", 5, 8);
    }];
    B[5] = ["번호목록", 7, function () {   // 세바시·궁금한뇌: ❶❷❸ 한 줄씩
        bg("배경 어둡게", BLK, 0);
        T("제목", { txt: "치매 예방 핑거(FINGER) 프로그램", font: "Pretendard-SemiBold", size: 42, just: "L", pos: [720, 330], shadow: SH });
        var items = ["❶ 운동", "❷ 식단", "❸ 위험 인자 관리", "❹ 인지 기능 강화 훈련", "❺ 사회적 교류"], at = [0.3, 1.5, 3, 4.5, 6];
        for (var k = 1; k <= 5; k++) {
            T("항목" + k, { txt: items[k - 1], font: "Pretendard-Bold", size: 50, just: "L", pos: [740, 330 + k * 72], shadow: SH });
            var s = (k == 1) ? "0.3" : cSlider("항목" + k + " 등장(초)", at[k - 1]);
            revealAt("항목" + k, s);
        }
        master(720, 540); anim("제목", "fade", 0, 6);
    }];
    B[6] = ["화살표_흐름_3단", 6, function () {   // 3채널: 위→아래 흐름
        var Y = [300, 520, 740], at = ["0.2", null, null];
        for (var k = 1; k <= 3; k++) {
            T("단계" + k, { txt: ["맥락 수집", "정보 처리", "결과물 생성"][k - 1], font: "Pretendard-Bold", size: 56, pos: [400, Y[k - 1]], shadow: SH });
            T("단계" + k + " 설명", { txt: ["(스케줄, 미팅록 등)", "(ChatGPT, Gemini, Claude 등)", ""][k - 1], font: "Pretendard-Regular", size: 28, pos: [400, Y[k - 1] + 56], shadow: SH });
            if (k < 3) T("화살표" + k, { txt: "↓", font: "Pretendard-Bold", size: 54, pos: [400, Y[k - 1] + 125], shadow: SH, label: "화살표" + k });
            var s = (k == 1) ? "0.2" : cSlider("단계" + k + " 등장(초)", (k - 1) * 1.5);
            revealAt("단계" + k, s); revealAt("단계" + k + " 설명", s);
            if (k > 1) revealAt("화살표" + (k - 1), s + "-0.2");
        }
        master(400, 520);
    }];
    B[7] = ["손글씨_속마음", 1, function () {   // 3채널: 인물 옆 작은 손글씨
        T("글자", { txt: "내가 배가 고파서\r맛있게 느껴졌나?", font: "Pretendard-Medium", size: 40, just: "L", pos: [560, 380], shadow: [50, 2, 8], lead: 52, rot: -3 });
        master(560, 380); anim("글자", "pop", 0);
    }];
    B[8] = ["자료출처", 1, function () {   // 궁금한뇌·탐구생활: 오른쪽 아래 작게
        T("출처", { txt: "자료 출처 : OECD Health Statistics 2021", font: "Pretendard-Regular", size: 24, just: "R", col: [235, 235, 235], pos: [1880, 1040], shadow: [50, 1, 4], track: 0 });
        master(1880, 1040); anim("출처", "fade", 0, 8);
    }];
    B[9] = ["말풍선_대사", 1, function () {   // 궁금한뇌: 둥근 막대 + 이름 + ···
        var bw = cSlider("막대 폭", 1375);
        shape("막대", { type: "rect", size: [1375, 108], pos: [953, 967], col: [222, 222, 222], op: 88, radius: 54 });
        var vg = C.layer("막대").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = 'var k=' + cSlider("막대 높이", 108) + '; [' + bw + ', k]';
        vg = C.layer("막대").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Roundness").expression = cSlider("막대 높이", 108) + '/2';
        T("이름", { txt: "윤홍균", font: "Pretendard-Medium", size: 30, just: "L", col: [87, 85, 85], pos: [300, 967] });
        T("대사", { txt: "그러면서 정체성이 흔들리고", font: "Pretendard-Medium", size: 40, col: [48, 48, 48], pos: [1005, 967] });
        T("더보기", { txt: "···", font: "Pretendard-Bold", size: 34, col: [110, 110, 110], pos: [1605, 962] });
        tp(C.layer("이름"), "ADBE Position").expression = 'value+' + ref("이름 위치") + '+[-(' + bw + '-1375)/2,0]';
        tp(C.layer("더보기"), "ADBE Position").expression = 'value+' + ref("더보기 위치") + '+[(' + bw + '-1375)/2,0]';
        C.layer("이름").parent = C.layer("막대"); C.layer("대사").parent = C.layer("막대"); C.layer("더보기").parent = C.layer("막대");
        master(953, 967);
    }];
    B[10] = ["이름붙은_흰대사", 1, function () {   // 궁금한뇌 웰니스: 왼쪽 색 이름 + 가운데 흰 대사
        T("대사", { txt: "나는 이러이러한 소리가 난다고 얘기를 하시기 때문에", font: "Pretendard-Medium", size: 50, pos: [960, 955], stroke: [[20, 20, 20], 3], shadow: SH });
        T("이름", { txt: "김영호", font: "Pretendard-Bold", size: 44, just: "L", col: [145, 240, 52], pos: [160, 955], stroke: [[20, 20, 20], 3], shadow: SH });
        master(960, 955);
    }];
    B[11] = ["파란라벨_노랑강조", 2, function () {   // 궁금한뇌: 위 파란 상자 라벨 + 핵심 단어 노랑
        T("강조 문구", { txt: "{선택과 예측}을 할 때 주도적일 수 있다!", font: "Pretendard-ExtraBold", size: 92, just: "L", pos: [124, 950], shadow: SH, accent: [244, 253, 21] });
        T("라벨", { txt: "음식 하나를 먹더라도", font: "Pretendard-SemiBold", size: 34, just: "L", pos: [142, 842] });
        boxFor("라벨", "라벨 상자", { col: BLUE, pad: [16, 14], radius: 4 });
        master(124, 900); anim("라벨", "left", 0, 8); anim("강조 문구", "up", 3, 8);
    }];
    B[12] = ["밑줄띠_강조", 2, function () {   // 궁금한뇌: 흰 큰 글자 + 아래쪽 띠(형광펜)
        T("문구", { txt: "정확한 검사로 중증도 확인하기!", font: "Pretendard-ExtraBold", size: 72, pos: [960, 985], shadow: [40, 2, 8] });
        boxFor("문구", "밑줄 띠", { col: BLUE, pad: [10, 0], h: "r.height*0.42", dy: "r.height*0.29" });
        var vg = C.layer("밑줄 띠").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); var k=linear(time,0.1,0.1+8*thisComp.frameDuration,0,1); r.width<1?[0,0]:[(r.width+20)*k, r.height*0.42]';
        vg = C.layer("밑줄 띠").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Position").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); var k=linear(time,0.1,0.1+8*thisComp.frameDuration,0,1); [r.left-10+(r.width+20)*k/2, r.top+r.height*0.79]';
        T("윗줄", { txt: "이명이 의심이 되는 경우에는", font: "Pretendard-Medium", size: 46, pos: [960, 900], shadow: SH });
        master(960, 950); anim("윗줄", "fade", 0, 6); anim("문구", "fade", 0, 4);
    }];
    B[13] = ["단계번호", 2, function () {   // 궁금한뇌: "1. ○○" 글자 차례로 + 위 파란 라벨
        T("단계", { txt: "1. 이명을 생활소음으로 인식하기", font: "Pretendard-ExtraBold", size: 66, just: "L", pos: [40, 1030], shadow: SH });
        T("라벨", { txt: "이명 소리 치료 단계", font: "Pretendard-SemiBold", size: 26, just: "L", pos: [62, 952] });
        boxFor("라벨", "라벨 상자", { col: BLUE, pad: [14, 9], radius: 6 });
        master(40, 1000); anim("라벨", "fade", 0, 6); anim("단계", "type", 2, 16);
    }];
    B[14] = ["인터넷말투_스티커", 2, function () {   // 탐구생활: 흰 상자 + 남색 글자, 기울어짐
        var P = [[420, 400], [560, 540], [600, 680]], R = [-3, 0, 2], X = ["클로드 글쓰기 짱인데", "제미나이가 검색은 넘사임", ""];
        for (var k = 1; k <= 3; k++) {
            T("스티커" + k, { txt: X[k - 1], font: "Pretendard-Medium", size: 40, col: NAVY, pos: P[k - 1], rot: R[k - 1] });
            boxFor("스티커" + k, "스티커" + k + " 상자", { col: WHT, pad: [26, 20] });
            anim("스티커" + k, "pop", (k - 1) * 6);
        }
        master(560, 540);
    }];
    B[15] = ["사진이름_라벨", 1, function () {   // 탐구생활·세바시: 사진 아래 이름 + 직함
        T("이름", { txt: "Rory Sutherland", font: "Pretendard-SemiBold", size: 34, just: "L", pos: [100, 900], shadow: SH, italic: true });
        T("직함", { txt: "오길비 그룹 부회장", font: "Pretendard-Regular", size: 26, just: "L", col: [235, 235, 235], pos: [100, 945], shadow: SH });
        master(100, 920); anim("이름", "fade", 0, 6); anim("직함", "fade", 3, 6);
    }];
    B[16] = ["영상출처_제목연도", 1, function () {   // 탐구생활: 왼쪽 위 "제목 | 연도"
        T("출처", { txt: "The Grand Budapest Hotel | 2014", font: "Pretendard-Regular", size: 26, just: "L", col: [240, 240, 240], pos: [40, 52], shadow: [50, 1, 4], track: 20 });
        master(40, 52); anim("출처", "fade", 0, 8);
    }];
    B[17] = ["영어개념_도식", 3, function () {   // 탐구생활: 영어 기울임 2개 + 점선 화살표 + 작은 한글
        T("왼쪽 영어", { txt: "Conspicuous\rConsumption", font: "Pretendard-Bold", size: 48, pos: [640, 560], shadow: SH, italic: true, lead: 52 });
        T("왼쪽 한글", { txt: "나 이거 있다", font: "Pretendard-Medium", size: 28, pos: [640, 470], shadow: SH });
        T("오른쪽 영어", { txt: "Conspicuous\rLeisure", font: "Pretendard-Bold", size: 48, pos: [1280, 560], shadow: SH, italic: true, lead: 52 });
        T("오른쪽 한글", { txt: "나 시간 많아", font: "Pretendard-Medium", size: 28, pos: [1280, 470], shadow: SH });
        T("화살표", { txt: "- - - →", font: "Pretendard-Bold", size: 40, pos: [960, 560], shadow: SH });
        master(960, 540); anim("왼쪽 한글", "fade", 0, 6); anim("왼쪽 영어", "fade", 0, 6); anim("화살표", "left", 10, 8); anim("오른쪽 한글", "fade", 18, 6); anim("오른쪽 영어", "fade", 18, 6);
    }];
    B[18] = ["큰대사_질문노랑", 1, function () {   // 세바시: 큰 흰 대사, 질문자 말은 노랑
        T("대사", { txt: "20대에 그런 결심을 하고 들어가셨어요?", font: "Pretendard-Medium", size: 76, pos: [960, 940], shadow: [60, 3, 10] });
        var dd = cDrop("누가 말하나", ["출연자 (흰)", "질문 (노랑)", "직접 고른 색"], 2);
        var cc = cColor("직접 고른 색", [120, 220, 255]); cColor("질문 색", [255, 222, 60]);
        var A = C.layer("대사").property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A.name = "말하는 사람 색";
        C.layer("대사").property("ADBE Text Properties").property("ADBE Text Animators").property("말하는 사람 색").property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        C.layer("대사").property("ADBE Text Properties").property("ADBE Text Animators").property("말하는 사람 색").property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");
        C.layer("대사").property("ADBE Text Properties").property("ADBE Text Animators").property("말하는 사람 색").property("ADBE Text Animator Properties").property("ADBE Text Fill Color").expression =
            'var i=Math.round(' + dd + '); i==1 ? ' + ref("대사 색") + ' : (i==2 ? ' + ref("질문 색") + ' : ' + cc + ')';
        cColor("질문 색", [255, 222, 60]);
        master(960, 940); anim("대사", "up", 0, 8);   // 2026-10-17 사용자: "페이드인, 아래에서 살짝 올라옴으로 수정해줘" (레퍼런스는 컷)
    }];
    B[19] = ["에피소드_제목카드", 9, function () {   // 세바시: 흐린 배경 + 2줄 제목 + 이름·직함 + 로고 자리 (6초 정도로 잘라 씀)
        bg("배경 어둡게", [20, 18, 16], 72);
        T("제목", { txt: "30년 치매 연구한 서울대 교수가\r치매 어머니를 통해 깨달은 사실", font: "Pretendard-ExtraBold", size: 74, pos: [960, 500], shadow: [40, 2, 10], lead: 96 });
        T("이름", { txt: "묵인희", font: "Pretendard-Bold", size: 32, just: "R", col: [175, 175, 175], pos: [930, 655] });
        T("직함", { txt: "서울대 의대 치매융합연구센터장", font: "Pretendard-Regular", size: 32, just: "L", col: [150, 150, 150], pos: [945, 655] });
        T("채널 이름", { txt: "채널 이름", font: "Pretendard-Bold", size: 34, pos: [960, 920] });
        master(960, 540); anim("배경 어둡게", "fade", 0, 10); anim("제목", "fade", 4, 10); anim("이름", "fade", 8, 10); anim("직함", "fade", 8, 10); anim("채널 이름", "fade", 8, 10);
    }];
    B[20] = ["개념카드", 2, function () {   // 세바시: 작은 라벨(+점) + 큰 단어 + 뜻
        bg("배경 어둡게", BLK, 40);
        T("라벨", { txt: "행복한 사람들의 공통점", font: "Pretendard-SemiBold", size: 26, pos: [960, 440], shadow: SH });
        boxFor("라벨", "라벨 점", { col: RED, pad: [0, 0], h: "12", radius: 6, dx: '(r.width/2)+14' });
        var vg = C.layer("라벨 점").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); r.width<1?[0,0]:[12,12]';
        T("단어", { txt: "유능성", font: "Pretendard-ExtraBold", size: 76, pos: [960, 520], shadow: SH });
        T("뜻", { txt: "나는 해낼 수 있다고 믿는다", font: "Pretendard-Regular", size: 34, pos: [960, 610], shadow: SH });
        master(960, 520); anim("배경 어둡게", "fade", 0, 8); anim("라벨", "fade", 2, 6); anim("단어", "up", 4, 8); anim("뜻", "fade", 10, 8);
    }];
    B[21] = ["오프닝_강조자막", 1, function () {   // 세바시 콜드 오픈: 흰 굵게 + 핵심 단어만 빨강
        T("문구", { txt: "40대 치매율 {급격히 증가}", font: "Pretendard-ExtraBold", size: 120, pos: [960, 975], shadow: [70, 3, 14], accent: [230, 40, 40] });
        master(960, 975); anim("문구", "pop", 0);
    }];
    B[22] = ["감정_명조자막", 1, function () {   // 세바시 감정 구간: 가운데 얇은 2줄 (명조 자리 — 폰트는 바꿔 씀)
        T("문구", { txt: "기억이 없다고\r그 사람이 없어지는 건 아니다", font: "Pretendard-Light", size: 56, pos: [960, 540], shadow: [50, 2, 12], track: 10, lead: 80 });
        master(960, 540); anim("문구", "fade", 0, 15);
    }];
    B[23] = ["따옴표_인용자막", 1, function () {   // 3채널: 화면 아래 큰 따옴표 인용
        T("인용", { txt: "\u201C행복을 위해\r일은 잘리지 않을 만큼만 할 거야\u201D", font: "Pretendard-Medium", size: 56, just: "L", pos: [120, 920], shadow: [60, 2, 10], lead: 72 });
        master(120, 920); anim("인용", "fade", 0, 10);
    }];
    B[24] = ["대화재연_자막", 2, function () {   // 궁금한뇌·탐구생활: 2샷 위쪽 양옆 각자 말
        T("왼쪽 말", { txt: "짜장면 먹으러 가자!", font: "Pretendard-Bold", size: 46, pos: [480, 150], stroke: [[20, 20, 20], 3], shadow: SH });
        T("오른쪽 말", { txt: "안 먹어.. 배 안 고파..", font: "Pretendard-Bold", size: 46, pos: [1440, 150], stroke: [[20, 20, 20], 3], shadow: SH });
        var t2 = cSlider("오른쪽 말 등장(초)", 0.8);
        master(960, 150); anim("왼쪽 말", "pop", 0); revealAt("오른쪽 말", t2);
    }];
    B[25] = ["X_O_손그림표시", 1, function () {   // 궁금한뇌: 빨간 X / 파란 O / 초록 체크 — 그려지듯
        var dd = cDrop("표시", ["X", "O", "체크"], 1);
        shape("X1", { type: "path", verts: [[-80, -80], [80, 80]], stroke: [RED, 16], trim: [0, 5], pos: [960, 540], noPos: true });
        shape("X2", { type: "path", verts: [[80, -80], [-80, 80]], stroke: [RED, 16], trim: [4, 5], pos: [960, 540], noPos: true, raw: true });
        tp(C.layer("X2"), "ADBE Opacity").expression = 'value*' + ref("X1 투명도(%)") + '/100';
        var v2 = C.layer("X2").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        for (var i = 1; i <= v2.numProperties; i++) if (v2.property(i).matchName == "ADBE Vector Graphic - Stroke") { v2.property(i).property("ADBE Vector Stroke Color").expression = ref("X1 색"); v2 = C.layer("X2").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); v2.property(i).property("ADBE Vector Stroke Width").expression = ref("X1 두께"); }
        shape("O", { type: "ellipse", size: [190, 190], stroke: [BLUE, 14], trim: [0, 8], pos: [960, 540], noPos: true });
        shape("체크", { type: "path", verts: [[-80, 0], [-20, 60], [90, -70]], stroke: [[40, 190, 90], 16], trim: [0, 8], pos: [960, 540], noPos: true });
        var pos = cPoint("표시 위치"), sz = cSlider("표시 크기(%)", 100), nm = ["X1", "X2", "O", "체크"], idx = [1, 1, 2, 3];
        for (var q = 0; q < 4; q++) {
            var L = C.layer(nm[q]);
            tp(L, "ADBE Position").expression = 'value+' + pos;
            tp(C.layer(nm[q]), "ADBE Scale").expression = 'var k=' + sz + '/100; [value[0]*k,value[1]*k]';
            var oe = tp(C.layer(nm[q]), "ADBE Opacity").expression;
            tp(C.layer(nm[q]), "ADBE Opacity").expression = oe + '*(Math.round(' + dd + ')==' + idx[q] + '?1:0)';
        }
        master(960, 540);
    }];
    B[26] = ["흐린배경_질문결과", 3, function () {   // 궁금한뇌: 질문 → 아래 화살표 → 빨간 결과
        bg("배경 어둡게", BLK, 55);
        T("질문", { txt: "약을 끊으면 다시 무너지지 않을까?", font: "Pretendard-Bold", size: 56, pos: [960, 400], shadow: SH });
        T("화살표", { txt: "⬇", font: "Pretendard-Bold", size: 64, pos: [960, 505], shadow: SH });
        T("결과", { txt: "불안 ↑  자신감 ↓", font: "Pretendard-ExtraBold", size: 66, col: [235, 40, 40], pos: [960, 615], shadow: SH });
        var t2 = cSlider("화살표 등장(초)", 1.0), t3 = cSlider("결과 등장(초)", 1.5);
        master(960, 510); anim("배경 어둡게", "fade", 0, 8); anim("질문", "fade", 3, 8); revealAt("화살표", t2); revealAt("결과", t3);
    }];
    B[27] = ["막대그래프", 4, function () {   // 궁금한뇌·탐구생활: 가로 막대 5개 + 강조 막대 + 출처
        bg("배경", [16, 22, 34], 85);
        T("제목", { txt: "2020년 OECD 국가별 항우울제 사용량 비교", font: "Pretendard-SemiBold", size: 30, just: "L", pos: [170, 170] });
        boxFor("제목", "제목 상자", { col: BLUE, pad: [22, 12], radius: 30 });
        var hl = cDrop("강조 막대", ["없음", "1", "2", "3", "4", "5"], 4);   // 4 = "3"번(한국)
        var nc = cColor("막대 색", [60, 140, 230]), hc = cColor("강조 막대 색", [244, 200, 30]);
        var names = ["아이슬란드", "캐나다", "한국", "OECD 평균", "일본"], vals = [100, 82, 45, 60, 20];
        for (var k = 1; k <= 5; k++) {
            var y = 300 + (k - 1) * 120;
            T("항목" + k, { txt: names[k - 1], font: "Pretendard-Medium", size: 32, just: "R", pos: [420, y], noCtl: true });
            var v = cSlider("항목" + k + " 값(0~100)", vals[k - 1]);
            shape("막대" + k, { type: "rect", size: [10, 46], pos: [0, 0], col: [60, 140, 230], noPos: true, raw: true });
            var vg = C.layer("막대" + k).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
            vg.property(1).property("ADBE Vector Rect Size").expression = 'var g=linear(time,0.2,0.2+15*thisComp.frameDuration,0,1); [Math.max(0,' + v + ')*11*g, 46]';
            vg = C.layer("막대" + k).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
            vg.property(1).property("ADBE Vector Rect Position").expression = 'var g=linear(time,0.2,0.2+15*thisComp.frameDuration,0,1); [450+Math.max(0,' + v + ')*11*g/2, ' + y + ']';
            vg = C.layer("막대" + k).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
            vg.property(2).property("ADBE Vector Fill Color").expression = 'Math.round(' + hl + ')-1==' + k + ' ? ' + hc + ' : ' + nc;
        }
        var lc = cColor("항목 이름 색", WHT);
        for (var k = 1; k <= 5; k++) animColor("항목" + k, lc, null);
        T("출처", { txt: "자료 출처 : OECD Health Statistics 2021", font: "Pretendard-Regular", size: 22, just: "R", col: [210, 210, 210], pos: [1860, 1035] });
        master(960, 540); anim("배경", "fade", 0, 8); anim("제목", "fade", 0, 8);
    }];
    B[28] = ["좌우비교_라벨", 1, function () {   // 탐구생활·궁금한뇌: 2분할 화면 아래 이름 2개 + 나눔선
        shape("나눔선", { type: "rect", size: [4, 1080], pos: [960, 540], col: WHT, op: 80 });
        T("왼쪽 이름", { txt: "영국 해양박물관", font: "Pretendard-Bold", size: 40, pos: [480, 1000], shadow: SH });
        T("오른쪽 이름", { txt: "프랑스 장식미술관", font: "Pretendard-Bold", size: 40, pos: [1440, 1000], shadow: SH });
        master(960, 540); anim("나눔선", "fade", 0, 8); anim("왼쪽 이름", "fade", 0, 8); anim("오른쪽 이름", "fade", 0, 8);
    }];
    B[29] = ["이름자막_오른쪽", 1, function () {   // 세바시: 이름 굵게 + 직함 여러 줄 작게
        T("이름", { txt: "묵인희", font: "Pretendard-Bold", size: 46, just: "L", pos: [1440, 400], shadow: SH });
        T("직함", { txt: "서울대학교 치매융합연구센터 센터장\r서울대학교 의과대학 교수\r뇌질환극복연구개발사업단 단장", font: "Pretendard-Regular", size: 25, just: "L", col: [235, 235, 235], pos: [1440, 480], shadow: SH, lead: 36 });
        master(1440, 440); anim("이름", "fade", 0, 8); anim("직함", "fade", 4, 8);
    }];
    B[30] = ["이름카드_액자", 2, function () {   // 궁금한뇌: 흰 테두리 액자 + 이름 크게 + 직함 2줄
        bg("배경 어둡게", BLK, 35);
        shape("액자", { type: "rect", size: [1840, 1000], pos: [960, 540], stroke: [WHT, 8], noPos: true });
        T("이름", { txt: "윤홍균", font: "Pretendard-ExtraBold", size: 120, pos: [960, 520], shadow: [55, 3, 14] });
        T("직함", { txt: "정신건강의학과 전문의\r「자존감 수업」 저자", font: "Pretendard-Regular", size: 34, pos: [960, 650], shadow: SH, lead: 48 });
        master(960, 540); anim("배경 어둡게", "fade", 0, 8); anim("액자", "fade", 0, 8); anim("이름", "pop", 4); anim("직함", "fade", 8, 8);
    }];
    B[31] = ["챕터_타이틀카드", 3, function () {   // 궁금한뇌: 종이 배경 + 큰 제목이 글자 차례로 + 부제
        bg("배경", [240, 235, 225], 100);
        T("제목", { txt: "자존감 수업", font: "Pretendard-ExtraBold", size: 130, col: [40, 120, 220], pos: [960, 520] });
        T("부제", { txt: "뇌와 뇌를 연결하는 토크쇼", font: "Pretendard-Regular", size: 36, col: [110, 110, 110], pos: [960, 640] });
        master(960, 560); anim("제목", "type", 2, 20); anim("부제", "fade", 18, 10);
    }];
    B[32] = ["엔딩_크레딧", 3, function () {   // 3채널: 역할·이름 목록 + 채널 이름
        bg("배경", [20, 22, 28], 100);
        T("채널 이름", { txt: "채널 이름", font: "Pretendard-ExtraBold", size: 90, pos: [700, 540] });
        T("크레딧", { txt: "기획\r○○○\r\r연출\r○○○\r\r편집\r○○○\r\r출연\r○○○", font: "Pretendard-Regular", size: 30, just: "L", col: [220, 220, 220], pos: [1420, 540], lead: 42 });
        master(960, 540); anim("배경", "fade", 0, 8); anim("채널 이름", "fade", 4, 10); anim("크레딧", "up", 10, 14);
    }];

    // ───────── 지식인초대석 공통 33~44 (2026-10-17 사용자: "레퍼런스 영상들에서 공통적으로 사용된 그래픽 템플릿 추려줘, 제작하자" → 12개 "응 진행하자") ─────────
    // 근거: work/정보성/분석/통합분석.md 8장, 장면 work/정보성/템플릿/ref/33~44.png (r16~r18)
    function cCheck(n, v) { if (!has(n)) { fx().addProperty("ADBE Checkbox Control"); var k = fx().numProperties; fx().property(k).name = n; fx().property(k).property(1).setValue(v); ORDER.push(n); } return ref(n); }
    // 거친 가장자리 (붓·찢긴 느낌): "<요소> 거친 정도" 칸
    function rough(name, label, border, scl) {
        var b = cSlider(label + " 거친 정도", border);
        C.layer(name).property("ADBE Effect Parade").addProperty("ADBE Roughen Edges");
        try { C.layer(name).property("ADBE Effect Parade").property("ADBE Roughen Edges").property("ADBE Roughen Edges-0002").expression = b; } catch (e) { w("  거친 정도 실패 " + name + " " + e.message); }
        try { C.layer(name).property("ADBE Effect Parade").property("ADBE Roughen Edges").property("ADBE Roughen Edges-0005").setValue(scl || 40); } catch (e) {}
    }
    function stretchY(name, label, v) {   // 세로 늘림 (가로는 그대로)
        var ss = ref(label + " 크기(%)"), st = cSlider(label + " 세로 늘림(%)", v);
        tp(C.layer(name), "ADBE Scale").expression = 'var k=' + ss + '/100; [value[0]*k, value[1]*k*' + st + '/100]';
    }
    B[33] = ["초대석_기본대사", 2, function () {   // 지식인초대석: 박스 없는 흰 대사, 질문(진행자)은 노랑·조금 크게
        T("대사", { txt: "우리 삶에 진짜 필요한 지식을 전해드리는 시간이죠", font: "Pretendard-Medium", size: 46, pos: [960, 977], shadow: [50, 2, 8] });
        var cb = cCheck("질문 노랑", 0), qc = cColor("질문 색", [250, 222, 40]), qs = cSlider("질문 크기(%)", 122);
        var A = C.layer("대사").property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A.name = "질문 색 바꾸기";
        C.layer("대사").property("ADBE Text Properties").property("ADBE Text Animators").property("질문 색 바꾸기").property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        C.layer("대사").property("ADBE Text Properties").property("ADBE Text Animators").property("질문 색 바꾸기").property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");
        C.layer("대사").property("ADBE Text Properties").property("ADBE Text Animators").property("질문 색 바꾸기").property("ADBE Text Animator Properties").property("ADBE Text Fill Color").expression =
            cb + '>0 ? ' + qc + ' : ' + ref("대사 색");
        tp(C.layer("대사"), "ADBE Scale").expression = 'var k=' + ref("대사 크기(%)") + '/100*(' + cb + '>0 ? ' + qs + '/100 : 1); [value[0]*k, value[1]*k]';
        master(960, 977); anim("대사", "fade", 0, 4);
    }];
    B[34] = ["거친_큰강조", 2, function () {   // 지식인초대석: 작은 앞말 + 크고 거친 흰 강조 (아래 오른쪽)
        T("강조", { txt: "6년이면 더블", font: "Pretendard-ExtraBold", size: 200, just: "L", pos: [725, 925], shadow: [55, 3, 12] });
        rough("강조", "강조", 3, 30);
        T("앞말", { txt: "내 자산이", font: "Pretendard-SemiBold", size: 110, just: "R", col: [228, 228, 228], pos: [700, 950], shadow: [55, 3, 12] });
        master(1100, 925); anim("앞말", "fade", 0, 4); anim("강조", "pop", 2);
    }];
    B[35] = ["손글씨_빨강강조", 2, function () {   // 지식인초대석: 위 손글씨 한 줄 + 아래 거친 빨강 큰 글자
        T("윗줄", { txt: "샀다 팔았다 반복..", font: "Pretendard-Light", size: 100, pos: [541, 415], shadow: [55, 2, 10], rot: -2 });
        T("강조", { txt: "답 안나옵니다", font: "Pretendard-ExtraBold", size: 170, col: [215, 30, 35], pos: [555, 560], shadow: [55, 3, 12] });
        rough("강조", "강조", 3, 30);
        master(550, 500); anim("윗줄", "fade", 0, 6); anim("강조", "pop", 4);
    }];
    B[36] = ["화면가득_큰글자", 2, function () {   // 지식인초대석: 화면 가득 반투명 큰 글자 (자료화면 위)
        T("문구", { txt: "서울의 짝퉁밖에 안 되는 거기 때문에", font: "Pretendard-ExtraBold", size: 100, col: [135, 30, 55], pos: [960, 550] });
        stretchY("문구", "문구", 234);   // G마켓 산스(넓음)로 바꾼 뒤 폭을 화면에 맞추고 높이 유지
        var op = cSlider("문구 투명도(%)", 75);
        master(960, 550); anim("문구", "fade", 0, 8);
        tp(C.layer("문구"), "ADBE Opacity").expression = 'value*' + op + '/100';
    }];
    B[37] = ["빨간상자_강조", 2, function () {   // 지식인초대석: 작은 앞말 + 거친 빨간 상자 위 흰 강조
        T("강조", { txt: "수익 발생", font: "Pretendard-ExtraBold", size: 190, just: "L", pos: [930, 935], shadow: [45, 2, 8] });
        boxFor("강조", "강조 상자", { col: [190, 22, 28], pad: [40, 0] });
        rough("강조 상자", "강조 상자", 6, 25);
        T("앞말", { txt: "예상치 못했던", font: "Pretendard-SemiBold", size: 100, just: "R", col: [228, 228, 228], pos: [855, 950], shadow: [55, 3, 12] });
        master(1100, 940); anim("앞말", "fade", 0, 4); anim("강조", "pop", 2);
    }];
    B[38] = ["타이틀카드_글리치", 3, function () {   // 지식인초대석 오프닝: 큰 제목이 지직거리며 나타남 + 부제
        bg("배경 어둡게", BLK, 0);
        T("제목", { txt: "지식인 초대석", font: "Pretendard-ExtraBold", size: 170, pos: [960, 472], shadow: [55, 3, 14] });
        T("부제", { txt: "각 분야 최고의 대가들", font: "Pretendard-Medium", size: 56, pos: [960, 590], shadow: SH });
        var gl = cSlider("지직 길이(초)", 0.7), ge = cSlider("지직 세기", 60);
        master(960, 520); anim("부제", "fade", 18, 10);
        tp(C.layer("제목"), "ADBE Position").expression = 'var g=' + gl + '; seedRandom(Math.floor(time*30),true); var j=(time<g)?[(random()-0.5)*' + ge + '*(1-time/g), (random()-0.5)*' + ge + '*0.15]:[0,0]; value+' + ref("제목 위치") + '+j';
        tp(C.layer("제목"), "ADBE Opacity").expression = 'var g=' + gl + '; seedRandom(Math.floor(time*30)+7,true); time<g ? (random()<0.35 ? 15 : 100) : 100';
    }];
    B[39] = ["이름자막_책표지", 2, function () {   // 지식인초대석: 주황 세로 막대 + 이름 + 호칭 + 직함 2줄 + 책 표지 자리
        T("이름", { txt: "오건영", font: "Pretendard-Medium", size: 96, just: "L", pos: [1016, 466], shadow: SH });
        boxFor("이름", "앞 막대", { col: [240, 120, 30], pad: [0, 0] });
        T("호칭", { txt: "단장", font: "Pretendard-Medium", size: 46, just: "L", col: [200, 200, 200], pos: [1263, 481], shadow: SH });
        T("직함", { txt: "신한프리미어 패스파인더\r저서 <환율의 대전환>", font: "Pretendard-Regular", size: 36, just: "L", col: [235, 235, 235], pos: [1017, 575], shadow: SH, lead: 43 });
        var gp = cSlider("호칭 간격", 35);
        tp(C.layer("호칭"), "ADBE Position").expression = 'var D=thisComp.layer("이름"), r=D.sourceRectAtTime(time,false), s=D.transform.scale[0]/100;' +
            ' [D.transform.position[0]+(r.left+r.width-D.transform.anchorPoint[0])*s+' + gp + ', value[1]] + ' + ref("호칭 위치");
        shape("책 표지 자리", { type: "rect", size: [206, 306], pos: [1469, 352], col: [70, 70, 70], scaleCtl: true });
        master(1100, 450); anim("이름", "left", 0, 8); anim("호칭", "fade", 3, 6); anim("직함", "fade", 5, 8); anim("책 표지 자리", "fade", 4, 8);
    }];
    B[40] = ["Q카드", 2, function () {   // 지식인초대석: 큰 Q + 윗줄 + 찢긴 흰 테이프 위 검은 질문
        T("Q", { txt: "Q", font: "Pretendard-ExtraBold", size: 180, pos: [947, 690], shadow: [55, 3, 12] });
        T("윗줄", { txt: "워렌 버핏도 아닌데..", font: "Pretendard-Light", size: 100, pos: [951, 822], shadow: SH });
        T("아랫줄", { txt: "투자를 어떻게 시작해야 할까?", font: "Pretendard-ExtraBold", size: 110, col: [15, 15, 15], pos: [950, 948] });
        boxFor("아랫줄", "테이프", { col: [245, 245, 245], pad: [45, 22] });
        rough("테이프", "테이프", 8, 20);
        master(950, 820); anim("Q", "pop", 0); anim("윗줄", "fade", 4, 6); anim("아랫줄", "up", 8, 8);
    }];
    B[41] = ["키워드_노랑라벨", 2, function () {   // 지식인초대석: 노랑 라벨 + 흰 굵은 키워드 2쌍 (왼쪽)
        var Y = [[341, 436], [571, 668]], LB = ["자극 추구형 아이", "위험 회피형 아이"], KW = ["자극 환경 제한", "부모 선제 시연"];
        for (var k = 1; k <= 2; k++) {
            T("라벨" + k, { txt: LB[k - 1], font: "Pretendard-Bold", size: 56, just: "L", col: [15, 15, 15], pos: [118, Y[k - 1][0]] });
            boxFor("라벨" + k, "라벨" + k + " 상자", { col: [250, 200, 20], pad: [10, 14] });
            T("키워드" + k, { txt: KW[k - 1], font: "Pretendard-ExtraBold", size: 92, just: "L", pos: [118, Y[k - 1][1]], shadow: SH });
        }
        var t2 = cSlider("둘째 쌍 등장(초)", 1.0);
        master(118, 500); anim("라벨1", "left", 0, 8); anim("키워드1", "left", 3, 8); revealAt("라벨2", t2); revealAt("키워드2", t2 + "+0.1");
    }];
    B[42] = ["손글씨_인용", 2, function () {   // 지식인초대석: 큰 따옴표 손글씨 2줄 + 노랑 밑줄 + 용어 상자 + 설명
        T("여는 따옴표", { txt: "“", font: "Pretendard-ExtraBold", size: 120, just: "L", pos: [60, 370], shadow: SH });
        T("인용", { txt: "시냅스의 양이\r늘어나기 때문이다", font: "Pretendard-Light", size: 100, just: "L", pos: [120, 450], shadow: SH, lead: 175 });
        T("닫는 따옴표", { txt: "”", font: "Pretendard-ExtraBold", size: 120, just: "L", pos: [690, 680], shadow: SH });
        var qg = cSlider("닫는 따옴표 간격", 15);   // 닫는 따옴표가 인용 끝(가장 긴 줄 오른쪽)을 따라감
        tp(C.layer("닫는 따옴표"), "ADBE Position").expression = 'var D=thisComp.layer("인용"), r=D.sourceRectAtTime(time,false), s=D.transform.scale[0]/100;' +
            ' [D.transform.position[0]+(r.left+r.width-D.transform.anchorPoint[0])*s+' + qg + ', value[1]] + ' + ref("닫는 따옴표 위치");
        shape("밑줄", { type: "rect", size: [383, 18], pos: [327, 535], col: [245, 200, 20], scaleCtl: true });
        rough("밑줄", "밑줄", 4, 20);
        T("용어", { txt: "시냅스", font: "Pretendard-SemiBold", size: 52, just: "L", pos: [112, 815] });
        boxFor("용어", "용어 상자", { col: [70, 70, 70], op: 75, pad: [16, 15], radius: 8 });
        T("설명", { txt: "신경세포 간 신호를 주고받는 연결 지점", font: "Pretendard-Medium", size: 46, just: "L", pos: [101, 886], shadow: SH });
        master(400, 600); anim("여는 따옴표", "fade", 0, 6); anim("인용", "type", 2, 20); anim("닫는 따옴표", "fade", 20, 6); anim("밑줄", "fade", 22, 6);
        anim("용어", "fade", 6, 6); anim("설명", "fade", 8, 6);
    }];
    B[43] = ["기사캡처_창", 3, function () {   // 지식인초대석: 둥근 흰 테두리 창 + ○○○ + 흰 상자 안 기사 제목(형광펜 강조)·날짜·본문
        var W = cSlider("창 폭", 1480), H = cSlider("창 높이", 552);
        shape("창 테두리", { type: "rect", size: [1480, 552], pos: [960, 534], stroke: [WHT, 2], radius: 20, noPos: true });
        var vg = C.layer("창 테두리").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = '[' + W + ', ' + H + ']';
        shape("흰 상자", { type: "rect", size: [1435, 456], pos: [962.5, 564], col: WHT, noPos: true });
        vg = C.layer("흰 상자").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = '[' + W + '-45, ' + H + '-96]';
        var S = C.layers.addShape(); S.name = "단추"; var D = [150, 96, 40];
        for (var q = 0; q < 3; q++) {
            var g = C.layer("단추").property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); g.name = "단추" + (q + 1);
            g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
            C.layer("단추").property("ADBE Root Vectors Group").property("단추" + (q + 1)).property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
        }
        for (var q = 0; q < 3; q++) {
            var gv = function () { return C.layer("단추").property("ADBE Root Vectors Group").property("단추" + (q + 1)).property("ADBE Vectors Group"); };
            gv().property(1).property("ADBE Vector Ellipse Size").setValue([36, 36]);
            gv().property(1).property("ADBE Vector Ellipse Position").expression = '[' + W + '/2-' + D[q] + ', -' + H + '/2+39]';
            gv().property(2).property("ADBE Vector Stroke Color").expression = ref("창 테두리 색");
            gv().property(2).property("ADBE Vector Stroke Width").expression = ref("창 테두리 두께");
        }
        tp(C.layer("단추"), "ADBE Position").setValue([960, 534]);
        tp(C.layer("단추"), "ADBE Opacity").expression = 'value*' + ref("창 테두리 투명도(%)") + '/100';
        T("날짜", { txt: "2025.04.09 한경", font: "Pretendard-Regular", size: 44, just: "L", pos: [248, 214], shadow: SH, track: 0 });
        T("제목", { txt: "격화하는 미·중 갈등에 {2200선으로 내려앉은 코스피}", font: "Pretendard-Bold", size: 74, just: "L", col: [20, 20, 20], pos: [288, 404], accent: [55, 35, 200] });
        // 형광펜: {} 부분 글자 폭만큼 (숨은 도우미 글자 2개로 앞부분·강조 끝까지 폭을 잼)
        var HA = ["제목 앞", "제목 끝"], HX = ['var i=s.indexOf("{"), t=(i<0 ? "" : s.substring(0,i));', 'var i=s.indexOf("}"), t=(i<0 ? "" : s.substring(0,i).replace("{",""));'];
        for (var q = 0; q < 2; q++) {
            var Hh = C.layers.addText("x"); Hh.name = HA[q];
            tdoc(C.layer(HA[q])).expression = 'var p=thisComp.layer("제목").text.sourceText, s=""+thisComp.layer("제목 원문").text.sourceText; ' + HX[q] + ' p.style.setText(t)';
            tp(C.layer(HA[q]), "ADBE Opacity").setValue(0); C.layer(HA[q]).guideLayer = true;
        }
        var hc = cColor("형광펜 색", [125, 235, 70]), hop = cSlider("형광펜 투명도(%)", 100);
        var HL = C.layers.addShape(); HL.name = "형광펜";
        var hg = HL.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        hg.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect"); hg.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        var PRE = 'var a=thisComp.layer("제목 앞").sourceRectAtTime(time,false), b=thisComp.layer("제목 끝").sourceRectAtTime(time,false), r=thisLayer.parent.sourceRectAtTime(time,false);' +
            ' var x0=(a.width>0 ? a.left+a.width+6 : r.left-10), x1=b.left+b.width+12; var k=linear(time,0.3,0.3+10*thisComp.frameDuration,0,1); x1=x0+(x1-x0)*k;';
        var hv = function () { return C.layer("형광펜").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); };
        hv().property(1).property("ADBE Vector Rect Size").expression = PRE + ' b.width<1 ? [0,0] : [Math.max(0,x1-x0), r.height+6]';
        hv().property(1).property("ADBE Vector Rect Position").expression = PRE + ' [(x0+x1)/2, r.top+r.height/2-4]';
        hv().property(2).property("ADBE Vector Fill Color").expression = hc;
        C.layer("형광펜").parent = C.layer("제목");
        tp(C.layer("형광펜"), "ADBE Anchor Point").setValue([0, 0]); tp(C.layer("형광펜"), "ADBE Position").setValue([0, 0]); tp(C.layer("형광펜"), "ADBE Scale").setValue([100, 100]);
        tp(C.layer("형광펜"), "ADBE Opacity").expression = hop + '*thisLayer.parent.transform.opacity/100';
        C.layer("형광펜").moveAfter(C.layer("제목"));
        rough("형광펜", "형광펜", 5, 20);
        T("작은 날짜", { txt: "2025.04.09 16:46", font: "Pretendard-Regular", size: 36, just: "L", col: [110, 110, 110], pos: [302, 474], track: 0 });
        T("본문", { txt: "이날 원·달러 환율은 전 거래일 대비 10원90전 오른\r1,484원10전에 거래를 마쳤다.\r금융위기였던 2009년 3월 이후 약 16년만의 최고치다.", font: "Pretendard-Medium", size: 46, just: "L", col: [20, 20, 20], pos: [301, 618], lead: 61, track: 0 });
        master(960, 534);
        anim("날짜", "fade", 0, 6); anim("창 테두리", "fade", 0, 6); anim("단추", "fade", 0, 6); anim("흰 상자", "fade", 0, 6);
        anim("제목", "fade", 3, 6); anim("작은 날짜", "fade", 5, 6); anim("본문", "fade", 6, 8);
    }];
    B[44] = ["찢긴액자_헤드라인", 3, function () {   // 지식인초대석: 찢긴 종이 액자(가운데 뚫림) + 양옆 세로 글자 + 흰 상자 헤드라인 2개
        var W = cSlider("창 폭", 1410), H = cSlider("창 높이", 750), fc = cColor("액자 색", [30, 30, 32]), fo = cSlider("액자 투명도(%)", 100);
        var S = C.layers.addShape(); S.name = "찢긴 액자";
        var g = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        C.layer("찢긴 액자").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        C.layer("찢긴 액자").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").addProperty("ADBE Vector Filter - Merge");
        C.layer("찢긴 액자").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        var fv = function () { return C.layer("찢긴 액자").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); };
        fv().property(1).property("ADBE Vector Rect Size").setValue([2600, 1600]);
        fv().property(2).property("ADBE Vector Rect Size").expression = '[' + W + ', ' + H + ']';
        try { fv().property(3).property("ADBE Vector Merge Type").setValue(3); } catch (e) { w("  빼기 실패 " + e.message); }
        fv().property(4).property("ADBE Vector Fill Color").expression = fc;
        tp(C.layer("찢긴 액자"), "ADBE Position").setValue([975, 540]);
        tp(C.layer("찢긴 액자"), "ADBE Opacity").expression = 'value*' + fo + '/100';
        rough("찢긴 액자", "액자", 14, 60);
        C.layer("찢긴 액자").moveBefore(C.layer(CTL)); BOXES.push("찢긴 액자");
        T("왼쪽 세로 글자", { txt: "JISIK INSIDE", font: "Pretendard-Light", size: 40, pos: [98, 540], col: [200, 200, 200], track: 350, rot: 90 });
        T("오른쪽 세로 글자", { txt: "JISIK INSIDE", font: "Pretendard-Light", size: 40, pos: [1824, 540], col: [200, 200, 200], track: 350, rot: 90 });
        T("헤드라인1", { txt: "10년 만에 온 매수 찬스...돈 되는 건 지금뿐이다", font: "Pretendard-Regular", size: 60, just: "L", col: [20, 20, 20], pos: [601, 332], track: 160 });
        boxFor("헤드라인1", "헤드라인1 상자", { col: WHT, pad: [25, 23] });
        T("헤드라인2", { txt: "지금 안 사면 평생 후회! 반토막 난 종목에 외국인 '폭풍 매수'", font: "Pretendard-Regular", size: 60, just: "L", col: [20, 20, 20], pos: [200, 567], track: 160 });
        boxFor("헤드라인2", "헤드라인2 상자", { col: WHT, pad: [25, 23] });
        var t2 = cSlider("헤드라인2 등장(초)", 0.8);
        master(960, 540); anim("찢긴 액자", "fade", 0, 6); anim("왼쪽 세로 글자", "fade", 0, 8); anim("오른쪽 세로 글자", "fade", 0, 8);
        anim("헤드라인1", "left", 4, 8); revealAt("헤드라인2", t2);
    }];

    // ───────── 셜록현준 공통 45~62 (2026-10-17 사용자: "교양에 학습해 주고, 템플릿 제작하자." → "정보성에 확정", "18개 모두") ─────────
    // 근거: work/정보성/분석/통합분석.md 9장, notes/r20-r25.md, 장면 work/정보성/템플릿/ref/45~62.png. 타이틀 콜라주·엔드카드(채널 로고 디자인)는 뺌
    var TD = [22, 70, 60], TL = [30, 110, 90], MINT = [120, 230, 150], ORG = [235, 110, 35], CREAM = [240, 234, 220], PAPER = [246, 244, 239], INK = [20, 20, 20];
    function rotate(name, deg) { tp(C.layer(name), "ADBE Rotate Z").expression = cAngle(name + " 기울기", deg); }
    function grain(name, amt) {   // 종이·인쇄 느낌 (흑백 노이즈)
        try {
            C.layer(name).property("ADBE Effect Parade").addProperty("ADBE Noise");
            C.layer(name).property("ADBE Effect Parade").property("ADBE Noise").property(1).setValue(amt);
            try { C.layer(name).property("ADBE Effect Parade").property("ADBE Noise").property(2).setValue(0); } catch (e) {}
        } catch (e) { w("  노이즈 실패 " + name + " " + e.message); }
    }
    function blurIn(name, f0, n) {   // 흐림 → 선명 (셜록현준 큰 글자 0.2초)
        try {
            C.layer(name).property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
            var b = C.layer(name).property("ADBE Effect Parade").property("ADBE Gaussian Blur 2").property(1);
            b.setValueAtTime(f0 * FR, 40); b.setValueAtTime((f0 + n) * FR, 0);
        } catch (e) { w("  흐림 실패 " + name + " " + e.message); }
        anim(name, "fade", f0, n);
    }
    function dashStroke(get, idx, dash, gap) {   // get() = 그 Vectors Group (다시 찾기용)
        var D = get().property(idx).property("ADBE Vector Stroke Dashes");
        D.addProperty("ADBE Vector Stroke Dash 1"); get().property(idx).property("ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Gap 1");
        get().property(idx).property("ADBE Vector Stroke Dashes").property(1).setValue(dash);
        get().property(idx).property("ADBE Vector Stroke Dashes").property(2).setValue(gap);
    }
    B[45] = ["셜록_기본자막", 2, function () {   // 흰 상자 + 검은 굵은 글자 + 오른쪽 아래 청록 그림자
        T("자막", { txt: "사실 인천공항이 만들어진 다음에", font: "GmarketSansMedium", size: 40, col: INK, pos: [958, 993], track: -20 });
        boxFor("자막", "그림자 상자", { col: TD, pad: [13, 13], dx: 7, dy: 7 });
        boxFor("자막", "자막 상자", { col: WHT, pad: [13, 13] });
        master(958, 993); anim("자막", "fade", 0, 2);
    }];
    B[46] = ["셜록_Q카드", 2, function () {   // 왼쪽 위 청록 정사각 + 주황 Q(또는 !) + 찢긴 흰 종이 띠 질문
        T("질문", { txt: "공항이 생긴 후 인천의 변화?", font: "GmarketSansBold", size: 70, just: "L", col: TD, pos: [632, 132], track: -20 });
        boxFor("질문", "종이 띠", { col: PAPER, pad: [32, 25] });
        rough("종이 띠", "종이 띠", 3, 20); grain("종이 띠", 6);
        shape("아이콘 상자", { type: "rect", size: [132, 126], pos: [532, 132], col: TD });
        T("아이콘", { txt: "Q", font: "GmarketSansBold", size: 100, col: ORG, pos: [532, 132], label: "아이콘 (Q 또는 !)" });
        master(532, 132); anim("아이콘 상자", "fade", 0, 2); anim("아이콘", "fade", 0, 2); anim("질문", "fade", 0, 2);
    }];
    B[47] = ["셜록_오늘의추리", 3, function () {   // 찢긴 흰 종이 + 주황 테이프 + "오늘의 추리" + 큰 청록 주제 (글자 타자)
        shape("종이", { type: "rect", size: [600, 300], pos: [1540, 460], col: PAPER, scaleCtl: true });
        rough("종이", "종이", 4, 25); grain("종이", 5); rotate("종이", -1);
        shape("테이프", { type: "rect", size: [80, 32], pos: [1800, 335], col: ORG, op: 90 }); rotate("테이프", -35);
        T("라벨", { txt: "오늘의 추리", font: "GmarketSansMedium", size: 30, col: WHT, pos: [1542, 400], track: -10 });
        boxFor("라벨", "라벨 상자", { col: TD, pad: [14, 10] });
        T("주제", { txt: "인천광역시", font: "GmarketSansBold", size: 90, col: [25, 80, 65], pos: [1540, 495], track: -30 });
        master(1540, 460); anim("종이", "pop", 0); anim("테이프", "fade", 2, 3); anim("라벨", "fade", 2, 3); anim("주제", "type", 3, 15);
    }];
    B[48] = ["셜록_Chapter카드", 3, function () {   // 화면 가득 구겨진 종이 + 청록 "Chapter.1" + 큰 청록 제목 (사진 콜라주는 아래 트랙에)
        bg("종이 배경", CREAM, 100); grain("종이 배경", 8);
        T("라벨", { txt: "Chapter.1", font: "NotoSerifKR-Bold", size: 56, col: [175, 225, 205], pos: [965, 402], italic: true, track: 0 });
        boxFor("라벨", "라벨 상자", { col: TD, pad: [30, 14] });
        rough("라벨 상자", "라벨 상자", 4, 15);
        T("제목", { txt: "인천국제공항", font: "GmarketSansBold", size: 130, col: [25, 85, 70], pos: [955, 565], track: -30 });
        grain("제목", 6);
        master(960, 480); anim("종이 배경", "fade", 0, 3); anim("라벨", "fade", 0, 4); anim("제목", "type", 2, 9);
    }];
    B[49] = ["셜록_장제목_종이띠", 2, function () {   // 크림 종이 띠(검은 글자) + 아래 청록 띠(흰 글자), 살짝 기울어짐
        T("윗줄", { txt: "한국 전통을 담은", font: "GmarketSansBold", size: 64, just: "L", col: INK, pos: [212, 450], rot: -1, track: -20 });
        boxFor("윗줄", "윗줄 띠", { col: CREAM, pad: [22, 14] }); grain("윗줄 띠", 6);
        T("아랫줄", { txt: "고창만의 랜드마크 설계", font: "GmarketSansBold", size: 72, just: "L", col: WHT, pos: [130, 545], rot: 2, track: -20 });
        boxFor("아랫줄", "아랫줄 띠", { col: [40, 140, 135], pad: [40, 16] }); grain("아랫줄 띠", 5);
        master(450, 500); anim("윗줄", "left", 0, 6); anim("아랫줄", "left", 3, 6);
    }];
    B[50] = ["셜록_큰글자_양옆", 2, function () {   // 인물 양옆 큰 흰 글자 2개 + 작은 손글씨 한마디
        T("왼쪽 글자", { txt: "인", font: "BlackHanSans-Regular", size: 300, col: [245, 245, 245], pos: [580, 448], shadow: [35, 3, 12] });
        T("오른쪽 글자", { txt: "천", font: "BlackHanSans-Regular", size: 300, col: [245, 245, 245], pos: [1330, 448], shadow: [35, 3, 12] });
        grain("왼쪽 글자", 6); grain("오른쪽 글자", 6);
        T("손글씨", { txt: "집중 분석!", font: "GangwonEduHyeonokTMedium", size: 60, col: WHT, pos: [1505, 255], rot: 18, shadow: SH });
        master(960, 448); blurIn("왼쪽 글자", 0, 6); blurIn("오른쪽 글자", 0, 6); anim("손글씨", "pop", 18);
    }];
    B[51] = ["셜록_키워드_점선", 2, function () {   // 흰 굵은 두 말 + 가운데 점선 (A ····· B), 점선은 두 말 사이를 따라감
        T("왼쪽", { txt: "구체적인 조건\r& 결이 맞는 건축가", font: "GmarketSansBold", size: 70, col: WHT, pos: [410, 405], shadow: [50, 2, 10], lead: 85 });
        T("오른쪽", { txt: "이상적인 집\r완성!", font: "GmarketSansBold", size: 75, col: WHT, pos: [1510, 405], shadow: [50, 2, 10], lead: 85 });
        var gp = cSlider("점선 여백", 25), lc = cColor("점선 색", WHT), lw = cSlider("점선 두께", 4);
        var S = C.layers.addShape(); S.name = "점선";
        C.layer("점선").property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var v = function () { return C.layer("점선").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); };
        v().addProperty("ADBE Vector Shape - Group"); v().addProperty("ADBE Vector Graphic - Stroke");
        v().property(1).property("ADBE Vector Shape").expression =
            'var a=thisComp.layer("왼쪽"), b=thisComp.layer("오른쪽"), ra=a.sourceRectAtTime(time,false), rb=b.sourceRectAtTime(time,false), g=' + gp + ';' +
            ' var p1=fromComp(a.toComp([ra.left+ra.width, ra.top+ra.height*0.3])), p2=fromComp(b.toComp([rb.left, rb.top+rb.height*0.3]));' +
            ' var k=linear(time,0.2,0.2+10*thisComp.frameDuration,0,1); createPath([p1+[g,0], p1+[g,0]+(p2-p1-[2*g,0])*k], [], [], false)';
        v().property(2).property("ADBE Vector Stroke Color").expression = lc;
        v().property(2).property("ADBE Vector Stroke Width").expression = lw;
        dashStroke(v, 2, 4, 8);
        master(960, 405); anim("왼쪽", "fade", 0, 5); anim("오른쪽", "fade", 8, 5);
    }];
    B[52] = ["셜록_민트강조", 1, function () {   // 흰 굵게 + 민트 강조어
        T("문구", { txt: "반면 {우리나라는...}", font: "GmarketSansBold", size: 90, col: WHT, pos: [963, 884], shadow: [55, 3, 10], accent: MINT, track: -20 });
        master(963, 884); anim("문구", "fade", 0, 4);
    }];
    B[53] = ["셜록_숫자카드", 2, function () {   // 청록 라벨 + 큰 흰 숫자 + 민트 비교
        T("라벨", { txt: "도쿄 인구", font: "GmarketSansMedium", size: 40, just: "L", col: WHT, pos: [114, 668] });
        boxFor("라벨", "라벨 상자", { col: TD, op: 90, pad: [10, 7] });
        T("숫자", { txt: "1,400만", font: "GmarketSansBold", size: 130, just: "L", col: WHT, pos: [100, 780], shadow: [50, 3, 10], track: -30 });
        T("비교", { txt: "서울의 1.5배", font: "GmarketSansBold", size: 60, just: "L", col: MINT, pos: [84, 890], shadow: [50, 2, 8] });
        master(300, 780); anim("라벨", "fade", 0, 4); anim("숫자", "up", 3, 6); anim("비교", "fade", 8, 5);
    }];
    B[54] = ["셜록_인물이름라벨", 2, function () {   // 청록 상자 이름 + 작은 설명 2줄 (인물 누끼·사진 옆)
        T("이름", { txt: "루시오 코스타", font: "GmarketSansBold", size: 40, just: "L", col: WHT, pos: [1022, 421] });
        boxFor("이름", "이름 상자", { col: [40, 150, 130], pad: [10, 8] });
        T("설명", { txt: "브라질리아를 설계한\r브라질의 건축가", font: "GmarketSansMedium", size: 30, just: "L", col: [200, 240, 225], pos: [1022, 505], lead: 42 });
        boxFor("설명", "설명 상자", { col: TD, op: 75, pad: [10, 8] });
        master(1150, 470); anim("이름", "left", 0, 6); anim("설명", "fade", 4, 5);
    }];
    B[55] = ["셜록_인물인용", 2, function () {   // 영문 원문 + 한글 인용(명조) + 작은 출처 줄
        T("영문", { txt: "It’s hard to find such an impressive space as this one.", font: "NotoSerifKR-Regular", size: 34, just: "L", col: [235, 235, 235], pos: [70, 400], shadow: SH, track: 0 });
        T("인용", { txt: "“이처럼 장엄하고 고요한 공간은\r세계 어디에서도 좀처럼 찾기 어렵다.”", font: "NotoSerifKR-Regular", size: 56, just: "L", col: WHT, pos: [70, 510], shadow: SH, lead: 82, track: 0 });
        T("출처", { txt: "프랭크 게리(Frank Gehry)가 2012년 종묘 방문 당시 발언", font: "GmarketSansLight", size: 30, just: "L", col: [210, 210, 210], pos: [70, 680], shadow: SH, track: 0 });
        master(70, 520); anim("영문", "fade", 0, 6); anim("인용", "fade", 3, 8); anim("출처", "fade", 8, 6);
    }];
    B[56] = ["셜록_종이용어카드", 2, function () {   // 크림 종이 카드 + 테이프 + 굵은 이름 + 설명 3줄
        shape("카드", { type: "rect", size: [630, 350], pos: [1525, 745], col: CREAM, radius: 30, scaleCtl: true });
        grain("카드", 5);
        shape("테이프", { type: "rect", size: [90, 30], pos: [1340, 590], col: [150, 90, 60], op: 85 }); rotate("테이프", -25);
        T("이름", { txt: "이재 황윤석", font: "GmarketSansBold", size: 62, col: [140, 45, 25], pos: [1525, 672] });
        T("설명", { txt: "고창 출신의 학자이자 시인.\r조선 영·정조 시대에 활동했으며,\r대표 저서로는 《이재난고》가 있다.", font: "GmarketSansMedium", size: 30, col: [95, 75, 60], pos: [1525, 805], lead: 52, track: -10 });
        master(1525, 745); anim("카드", "pop", 0); anim("테이프", "fade", 2, 3); anim("이름", "fade", 3, 5); anim("설명", "fade", 5, 5);
    }];
    B[57] = ["셜록_지도원라벨", 1, function () {   // 지도 위 청록 원 + 크림 상자 지명
        shape("원", { type: "ellipse", size: [120, 120], pos: [1160, 515], col: TL, op: 85, scaleCtl: true });
        rough("원", "원", 3, 20);
        T("지명", { txt: "인천", font: "GmarketSansBold", size: 60, just: "L", col: INK, pos: [1225, 491] });
        boxFor("지명", "지명 상자", { col: CREAM, pad: [14, 9] });
        master(1160, 515); anim("원", "pop", 0); anim("지명", "fade", 3, 4);
    }];
    B[58] = ["셜록_연표", 3, function () {   // 가로선 + 청록 점 3개 + 위 설명·아래 연도(명조 기울임)
        shape("선", { type: "rect", size: [1920, 4], pos: [960, 876], col: WHT, op: 90 });
        var X = [380, 960, 1536], UP = ["마리나 베이 본격 개발", "마리나 베이 샌즈 개장", "가든스 바이 더 베이 개장"], YR = ["2005", "2005", "2012"];
        for (var k = 1; k <= 3; k++) {
            shape("점" + k, { type: "ellipse", size: [24, 24], pos: [X[k - 1], 876], col: TL, stroke: [WHT, 3] });
            T("설명" + k, { txt: UP[k - 1], font: "GmarketSansMedium", size: 44, col: WHT, pos: [X[k - 1], 822], shadow: SH, track: -20 });
            T("연도" + k, { txt: YR[k - 1], font: "NotoSerifKR-Bold", size: 56, col: WHT, pos: [X[k - 1], 928], shadow: SH, italic: true, track: 0 });
            var s = (k == 1) ? "0.2" : cSlider("항목" + k + " 등장(초)", (k - 1) * 0.8);
            revealAt("설명" + k, s); revealAt("연도" + k, s); revealAt("점" + k, s);
        }
        master(960, 876); anim("선", "fade", 0, 5);
    }];
    B[59] = ["셜록_치수선", 1, function () {   // 양쪽 화살표 점선 + 길이 숫자
        var L = cSlider("선 길이", 1670), lc = cColor("선 색", WHT), lw = cSlider("선 두께", 4);
        var S = C.layers.addShape(); S.name = "치수선";
        var nm = ["선", "왼쪽 화살", "오른쪽 화살"];
        var root = function () { return C.layer("치수선").property("ADBE Root Vectors Group"); };
        for (var q = 0; q < 3; q++) {
            var g = root().addProperty("ADBE Vector Group"); g.name = nm[q];
            root().property(nm[q]).property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
            root().property(nm[q]).property("ADBE Vectors Group").addProperty(q ? "ADBE Vector Graphic - Fill" : "ADBE Vector Graphic - Stroke");
        }
        var K = 'var k=linear(time,0.1,0.1+10*thisComp.frameDuration,0,1), h=' + L + '/2*k;';
        var P = [K + ' createPath([[-h,0],[h,0]],[],[],false)', K + ' createPath([[-h,0],[-h+24,-11],[-h+24,11]],[],[],true)', K + ' createPath([[h,0],[h-24,-11],[h-24,11]],[],[],true)'];
        for (var q = 0; q < 3; q++) {
            var gq = nm[q], vv = function () { return root().property(gq).property("ADBE Vectors Group"); };
            vv().property(1).property("ADBE Vector Shape").expression = P[q];
            if (q) vv().property(2).property("ADBE Vector Fill Color").expression = lc;
            else { vv().property(2).property("ADBE Vector Stroke Color").expression = lc; vv().property(2).property("ADBE Vector Stroke Width").expression = lw; dashStroke(vv, 2, 6, 7); }
        }
        tp(C.layer("치수선"), "ADBE Position").setValue([960, 454]);
        tp(C.layer("치수선"), "ADBE Position").expression = 'value+' + cPoint("치수선 위치");
        tp(C.layer("치수선"), "ADBE Rotate Z").expression = cAngle("치수선 기울기", 0);
        T("길이", { txt: "109m", font: "GmarketSansBold", size: 60, col: WHT, pos: [960, 401], shadow: SH, track: 0 });
        master(960, 430); anim("길이", "fade", 6, 5);
    }];
    B[60] = ["셜록_말풍선", 1, function () {   // 재연 인물 옆 흰 말풍선 + 검은 굵은 글자 (풍선이 글자 크기를 따라감)
        T("말", { txt: "음...여긴 이렇게\r바꿔주세요", font: "GmarketSansBold", size: 40, col: INK, pos: [1272, 470], lead: 52, track: -20 });
        var bc = cColor("말풍선 색", PAPER);
        var S = C.layers.addShape(); S.name = "말풍선";
        var root = function () { return C.layer("말풍선").property("ADBE Root Vectors Group"); };
        var g1 = root().addProperty("ADBE Vector Group"); g1.name = "몸통";
        root().property("몸통").property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
        root().property("몸통").property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        var g2 = root().addProperty("ADBE Vector Group"); g2.name = "꼬리";
        root().property("꼬리").property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
        root().property("꼬리").property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        var R = 'var r=thisLayer.parent.sourceRectAtTime(time,false), cx=r.left+r.width/2, cy=r.top+r.height/2, W=r.width+100, H=r.height+80;';
        var v = function (n) { return root().property(n).property("ADBE Vectors Group"); };
        v("몸통").property(1).property("ADBE Vector Ellipse Size").expression = R + ' [W,H]';
        v("몸통").property(1).property("ADBE Vector Ellipse Position").expression = R + ' [cx,cy]';
        v("몸통").property(2).property("ADBE Vector Fill Color").expression = bc;
        v("꼬리").property(1).property("ADBE Vector Shape").expression = R + ' createPath([[cx+W*0.22,cy+H*0.36],[cx+W*0.48,cy+H*0.62],[cx+W*0.36,cy+H*0.22]],[],[],true)';
        v("꼬리").property(2).property("ADBE Vector Fill Color").expression = bc;
        var L2 = C.layer("말풍선"); L2.parent = C.layer("말");
        tp(L2, "ADBE Anchor Point").setValue([0, 0]); tp(L2, "ADBE Position").setValue([0, 0]); tp(L2, "ADBE Scale").setValue([100, 100]); tp(L2, "ADBE Rotate Z").setValue(0);
        tp(L2, "ADBE Opacity").expression = 'thisLayer.parent.transform.opacity';
        L2.moveAfter(C.layer("말")); BOXES.push("말풍선");
        rough("말풍선", "말풍선", 2, 25);
        master(1272, 470); anim("말", "pop", 0);
    }];
    B[61] = ["셜록_자료큰글자", 2, function () {   // 자료 그림 위 큰 흰 글자 + 작은 설명(→)
        T("제목", { txt: "농업혁명", font: "BlackHanSans-Regular", size: 200, col: [245, 245, 245], pos: [960, 512], shadow: [45, 3, 14], track: -20 });
        grain("제목", 6);
        T("설명", { txt: "수렵·채집 경제 → 농경 중심의 생산 경제", font: "GmarketSansMedium", size: 44, col: WHT, pos: [960, 677], shadow: SH, track: -20 });
        master(960, 560); blurIn("제목", 0, 6); anim("설명", "fade", 6, 6);
    }];
    B[62] = ["셜록_출처", 1, function () {   // 오른쪽 아래 작은 출처
        T("출처", { txt: "출처: Google Earth", font: "GmarketSansMedium", size: 26, just: "R", col: [235, 235, 235], pos: [1900, 1040], shadow: [50, 1, 4], track: 0 });
        master(1900, 1040); anim("출처", "fade", 0, 6);
    }];

    // ───────── 레퍼런스 맞춤 (fit_jeongbo32.jsxinc 의 FIT 표) ─────────
    $.evalFile(new File("C:\\DADA\\9.AI\\vscode\\편집자동화\\scripts\\jeongbo\\ae\\fit_jeongbo32.jsxinc"));
    var TF = 5;   // 다 나타난 뒤 시각에서 잼
    function layerOrNull(n) { for (var i = 1; i <= C.numLayers; i++) if (C.layer(i).name == n) return C.layer(i); return null; }
    function compPos(L) {   // 레이어 기준점이 화면에서 어디 있는지 (부모는 크기·회전 없음 가정)
        var p = tp(L, "ADBE Position").valueAtTime(TF, false), v = [p[0], p[1]], q = L.parent;
        while (q) { var pp = tp(q, "ADBE Position").valueAtTime(TF, false), pa = tp(q, "ADBE Anchor Point").valueAtTime(TF, false); v = [v[0] + pp[0] - pa[0], v[1] + pp[1] - pa[1]]; q = q.parent; }
        return v;
    }
    function movePos(L, d) {   // 위치(키 포함)를 d만큼
        var P = tp(L, "ADBE Position");
        if (P.numKeys) { for (var k = 1; k <= P.numKeys; k++) { var v = P.keyValue(k); P.setValueAtKey(k, [v[0] + d[0], v[1] + d[1]]); } }
        else { var v0 = P.value; P.setValue([v0[0] + d[0], v0[1] + d[1]]); }
    }
    function fitText(name, e) {
        var D = layerOrNull(name); if (!D) { w("  맞춤: 레이어 없음 " + name); return; }
        var S = layerOrNull(name + " 원문") || D;
        var st = tdoc(S), td = st.value;
        if (e.f) td.font = e.f;
        if (e.j) td.justification = JUST[e.j];
        var full = (e.t !== undefined) ? e.t : td.text;
        td.text = full.split("\r")[0]; td.fontSize = 100; st.setValue(td);
        var r = D.sourceRectAtTime(TF, false);
        if (!(r.height > 0)) { w("  맞춤: 높이 0 " + name); return; }
        td = tdoc(S).value; td.fontSize = 100 * e.h / r.height;
        if (e.p) { td.autoLeading = false; td.leading = e.p; }
        td.text = full; tdoc(S).setValue(td);
        var j = e.j || "C", ax = "r.left+r.width/2";
        if (j == "L") ax = "r.left"; else if (j == "R") ax = "r.left+r.width";
        tp(D, "ADBE Anchor Point").expression = 'var r=sourceRectAtTime(time,false); [' + ax + ', r.top+r.height/2]';
        if (e.plain) tp(D, "ADBE Position").expression = 'value+' + ref(name + " 위치");
        if (e.rot !== undefined) { var e2 = fx().property(name + " 기울기"); if (e2) e2.property(1).setValue(e.rot); }
        r = D.sourceRectAtTime(TF, false);
        var cur = compPos(D), want = [e.x, e.top + r.height / 2];
        movePos(D, [want[0] - cur[0], want[1] - cur[1]]);
        w("  맞춤 " + name + ": 크기 " + tdoc(S).value.fontSize.toFixed(1) + (e.p ? " 행간 " + e.p : "") + " → " + want[0] + "," + want[1].toFixed(0));
    }
    function fitBox(name, b) {
        var L = layerOrNull(name); if (!L) { w("  맞춤: 상자 없음 " + name); return; }
        var W = b.wFix ? String(b.wFix) : 'r.width+' + b.w, H = b.hFix ? String(b.hFix) : (String(b.h).charAt(0) == "+" ? 'r.height' + b.h : String(b.h));
        var vg = L.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Size").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); r.width<1?[0,0]:[' + W + ', ' + H + ']';
        vg = L.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        vg.property(1).property("ADBE Vector Rect Position").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); [r.left+r.width/2' + (b.dx ? '+(' + b.dx + ')' : '') + ', r.top+r.height/2' + (b.dy ? '+(' + b.dy + ')' : '') + ']';
        if (b.radius !== undefined) { vg = L.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); vg.property(1).property("ADBE Vector Rect Roundness").setValue(b.radius); }
    }
    function applyFit(id) {
        var F = FIT[id]; if (!F) return;
        if (F.s) for (var k in F.s) { var e = fx().property(k); if (e) e.property(1).setValue(F.s[k]); }
        if (F.pos) for (var k in F.pos) { var L = layerOrNull(k); if (L) { var cur = compPos(L); movePos(L, [F.pos[k][0] - cur[0], F.pos[k][1] - cur[1]]); } }
        if (F.e) for (var k in F.e) fitText(k, F.e[k]);
        if (F.b) for (var k in F.b) fitBox(k, F.b[k]);
        if (F.band) {   // 12: 밑줄 띠 = 글자 높이의 62%, 가운데가 글자 위끝에서 96.6% 아래, 좌우 21px 넘침
            var vg = C.layer("밑줄 띠").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
            vg.property(1).property("ADBE Vector Rect Size").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); var k=linear(time,0.1,0.1+8*thisComp.frameDuration,0,1); r.width<1?[0,0]:[(r.width+42)*k, r.height*0.62]';
            vg = C.layer("밑줄 띠").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
            vg.property(1).property("ADBE Vector Rect Position").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); var k=linear(time,0.1,0.1+8*thisComp.frameDuration,0,1); [r.left-21+(r.width+42)*k/2, r.top+r.height*0.966]';
        }
        if (F.follow) {   // 이름이 대사 왼쪽 끝을 일정 간격으로 따라감 (대사 길이가 바뀌어도)
            var g = cSlider(F.follow.name + " 간격", F.follow.gap);
            tp(C.layer(F.follow.name), "ADBE Position").expression =
                'var D=thisComp.layer("' + F.follow.to + '"), r=D.sourceRectAtTime(time,false), s=D.transform.scale[0]/100;' +
                ' var left=D.transform.position[0]+(r.left-D.transform.anchorPoint[0])*s;' +
                ' [left-' + g + ', value[1]] + ' + ref(F.follow.name + " 위치");
        }
        if (F.frame) {   // 30: 둥근 테두리 액자
            var L = C.layer("액자"), vg = L.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
            vg.property(1).property("ADBE Vector Rect Size").setValue(F.frame.size);
            vg = L.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); vg.property(1).property("ADBE Vector Rect Roundness").setValue(F.frame.radius);
            var cur = compPos(L); movePos(L, [F.frame.pos[0] - cur[0], F.frame.pos[1] - cur[1]]);
            var e = fx().property("액자 두께"); if (e) e.property(1).setValue(F.frame.width);
        }
    }

    // 자간·행간 칸 (2026-10-17 사용자: "행간, 자간 수정이 안 되네. 그래픽 템플릿 32개 모두 행간, 자간 수정되게 해줘")
    // 프리미어는 AE 템플릿의 자간·행간을 못 바꿈 → 글자 요소마다 "<요소> 자간"(1/1000 em)·"<요소> 행간(%)"(글자 크기 대비) 슬라이더를 소스 텍스트 식으로
    // 자기 값(thisProperty.style)을 써서 프리미어에서 바꾼 문구·폰트·크기는 그대로 유지 (2026-10-17 AE 시험)
    function addSpacing() {
        for (var i = 0; i < TEXTS.length; i++) {
            var src = TEXTS[i][0], label = TEXTS[i][1], disp = src.replace(/ 원문$/, "");
            var td = tdoc(C.layer(src)).value;
            var pct = td.autoLeading ? 120 : Math.round(td.leading / td.fontSize * 1000) / 10;
            var T = cSlider(label + " 자간", td.tracking), Lp = cSlider(label + " 행간(%)", pct);
            var tail = '.setTracking(' + T + ').setAutoLeading(false).setLeading(';
            var P = tdoc(C.layer(disp));
            if (disp != src) P.expression = 'var p=thisComp.layer("' + src + '").text.sourceText; p.style.setText((""+p).replace(/[\\{\\}]/g,""))' + tail + 'p.style.fontSize*' + Lp + '/100)';
            else P.expression = 'var s=thisProperty.style; s' + tail + 's.fontSize*' + Lp + '/100)';
        }
    }

    // 그림자 옵션 (2026-10-17 사용자: "모든 자막 템플릿에 그림자 효과 옵션 넣어줘" → "있는 건 그대로 두고, 없는 것만 넣어줘")
    // 이미 그림자가 있는 글자 요소는 손대지 않음. 없는 요소에만 그림자 + "<요소> 그림자" 체크(기본 끔 → 모양 그대로) + 공통 칸 그림자 색·진하기·거리·부드러움·방향
    function addShadows() {
        var todo = [];
        for (var i = 0; i < TEXTS.length; i++) {
            var nm = TEXTS[i][0].replace(/ 원문$/, "");
            if (!C.layer(nm).property("ADBE Effect Parade").property("ADBE Drop Shadow")) todo.push([nm, TEXTS[i][1]]);
        }
        if (!todo.length) return;
        var col = cColor("그림자 색", BLK), op = cSlider("그림자 진하기(%)", 55), dist = cSlider("그림자 거리", 3), soft = cSlider("그림자 부드러움", 10), dir = cAngle("그림자 방향", 135);
        for (var i = 0; i < todo.length; i++) {
            var nm = todo[i][0], label = todo[i][1];
            C.layer(nm).property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
            fx().addProperty("ADBE Checkbox Control"); var k = fx().numProperties; fx().property(k).name = label + " 그림자"; fx().property(k).property(1).setValue(0); ORDER.push(label + " 그림자");
            var M = ["ADBE Drop Shadow-0001", "ADBE Drop Shadow-0002", "ADBE Drop Shadow-0003", "ADBE Drop Shadow-0004", "ADBE Drop Shadow-0005"];
            var X = [col, op + '*2.55*' + ref(label + " 그림자"), dir, dist, soft];
            for (var q = 0; q < 5; q++) C.layer(nm).property("ADBE Effect Parade").property("ADBE Drop Shadow").property(M[q]).expression = X[q];
        }
        w("  그림자 넣음: " + todo.length + "개 요소");
    }

    function exportOne(id) {
        var nm = id + "_" + B[id][0], c = findComp(nm);
        var png = new File(OUT + "\\thumb_" + id + ".png"); if (png.exists) png.remove();
        c.saveFrameToPng(B[id][1], png); for (var z = 0; z < 60 && !png.exists; z++) $.sleep(500);
        c = findComp(nm);
        var d = new Folder(OUT + "\\export_" + id); if (!d.exists) d.create();
        var old = d.getFiles("*.mogrt"); for (var q = 0; q < old.length; q++) old[q].remove();
        w("  내보내기 " + nm);
        var ok = c.exportAsMotionGraphicsTemplate(true, d.fsName);
        w("  export=" + ok);
        if (ok) { var f = new File(d.fsName + "\\done.txt"); f.open("w"); f.write("ok"); f.close(); }
    }
    try {
        app.beginSuppressDialogs();
        new Folder(OUT).create();
        var aep = new File(OUT + "\\jeongbo32.aep");
        if (app.project && app.project.file && app.project.file.fsName == aep.fsName) {}
        else { if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); if (aep.exists) app.open(aep); else { app.newProject(); app.project.save(aep); } }
        w("프로젝트 " + aep.fsName);
        var ids = [], of = new File(OUT + "\\only.txt");
        if (of.exists) { of.open("r"); var s = of.read(); of.close(); var m = s.match(/(\d+)\s*-\s*(\d+)/); for (var i = +m[1]; i <= +m[2]; i++) ids.push(i); }
        else for (var i = 1; i <= 62; i++) if (!new File(OUT + "\\export_" + (i < 10 ? "0" : "") + i + "\\done.txt").exists) ids.push(i);
        // 사용자가 지운 템플릿은 만들지 않음 (2026-10-17 "안쓸건 삭제했어. 데이터도 지워도 돼." · 37·39·44는 "검토했어 필요없는 건 삭제했어. 반영해줘." · 57·58·59·62는 "지운 것 제외하고 반영해줘.")
        var DROP = { 5: 1, 6: 1, 8: 1, 9: 1, 16: 1, 22: 1, 23: 1, 25: 1, 27: 1, 28: 1, 29: 1, 30: 1, 32: 1, 37: 1, 39: 1, 44: 1, 57: 1, 58: 1, 59: 1, 62: 1 }, keep = [];
        for (var i = 0; i < ids.length; i++) if (!DROP[ids[i]]) keep.push(ids[i]);
        ids = keep;
        w("대상 " + ids.join(","));
        for (var n = 0; n < ids.length; n++) {
            var id = ids[n], nm = (id < 10 ? "0" : "") + id;
            newComp(nm, B[id][0]); B[id][2](); applyFit(nm); addSpacing(); addShadows(); register(); app.project.save();
        }
        if (!new File(OUT + "\\noexport.txt").exists) for (var n = 0; n < ids.length; n++) {   // noexport.txt 있으면 만들기만 (확인용)
            var id = ids[n]; var key = (id < 10 ? "0" : "") + id;
            B[key] = B[id]; exportOne(key);
        }
        app.project.save();
        w("Jeongbo 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
