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
        else for (var i = 1; i <= 32; i++) if (!new File(OUT + "\\export_" + (i < 10 ? "0" : "") + i + "\\done.txt").exists) ids.push(i);
        // 사용자가 지운 템플릿은 만들지 않음 (2026-10-17 "안쓸건 삭제했어. 데이터도 지워도 돼.")
        var DROP = { 5: 1, 6: 1, 8: 1, 9: 1, 16: 1, 22: 1, 23: 1, 25: 1, 27: 1, 28: 1, 29: 1, 30: 1, 32: 1 }, keep = [];
        for (var i = 0; i < ids.length; i++) if (!DROP[ids[i]]) keep.push(ids[i]);
        ids = keep;
        w("대상 " + ids.join(","));
        for (var n = 0; n < ids.length; n++) {
            var id = ids[n], nm = (id < 10 ? "0" : "") + id;
            newComp(nm, B[id][0]); B[id][2](); applyFit(nm); addSpacing(); addShadows(); register(); app.project.save();
        }
        for (var n = 0; n < ids.length; n++) {
            var id = ids[n]; var key = (id < 10 ? "0" : "") + id;
            B[key] = B[id]; exportOne(key);
        }
        app.project.save();
        w("Jeongbo 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
