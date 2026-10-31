// 놀심 에이전트 — 포인트 자막 6종 → AE 템플릿(.mogrt) (2026-10-28)
// 사용자: "비어있는 것은 있는 템플릿으로 비슷하게 만들자." → "자 쓰인 영상 6종 먼저 작업하자. 우선 제작 먼저 시작하자."
// 근거: work/놀심/분석/r1_포인트자막_분석.md (종류·등장), 업체 템플릿 측정 work/놀심/템플릿/measure (A_·E_·G9·G10), r1 프레임 측정 measure/r1
//   A 흰 굵은 고딕   : 업체 "상대에 대한 배려가 필요하다" — NotoSansKR-Black, 흰, 그림자(30,30,30) 47%·부드러움 22 / 등장 r1: 위에서 3프레임(-100,-48,-14) + 세로 흐림
//   B 흰 붓글씨      : 업체에 없음 — 충주김생(업체 질문 폰트, 붓글씨) + A 그림자 / 등장 r1: 위에서 3프레임(-80,-51,-24)
//   D 노란 빛        : 업체에 없음 — 한글누리 Regular(r1 둥근 고딕, Bold는 획이 1.8배 굵음) + 주황 번짐 / 등장 r1: 줄 전체가 흐릿하게 나타나 약 10프레임에 선명 (글자마다 8프레임, 왼→오 2프레임 차)
//   E 노랑 박스      : 업체 "사람이 바뀌는 건…" — 코트라 손글씨, 글자(78,64,46), 상자(255,227,101) 72%·높이 104·둥글기 10 / 등장 업체=r1: 8프레임 페이드
//   E2 연두 박스     : E에서 상자만 업체 연두(209,253,157), r1처럼 30px 위 / 등장 r1: 아래에서 3프레임(+104,+37,+8) + 세로 흐림
//   H PD 사선        : 업체에 없음 — NotoSansKR-ExtraBold 흰 + 검은 테두리, 양옆 사선(어두운 선 + 흰 테두리, 높이 154) / 등장 r1: 아래에서 3프레임(+106,+49,+8)
// 표준(playbook_AE변환 15장): 300프레임, 맨 아래 널 "템플릿 조절"에 색·크기·위치 칸, 글자 칸 "자막 텍스트", 폭 1720 넘으면 자동 축소
// 실행: scripts/nolsim/ae/run_ae_mac.sh <이 파일> <OUT/result.txt> "Nolsim 끝|ERR" 900
//   OUT/only.txt  — "A,E" 처럼 고르면 그것만 다시 만듦 / OUT/export.txt 있으면 템플릿으로 내보냄 (없으면 만들기 + 확인 프레임만)
(function () {
    var OUT = "/Users/bbong/dada/vscode/편집자동화/work/놀심/템플릿/ae";
    var FPS = 29.97, FR = 1 / FPS, NF = 300, DUR = NF / FPS;
    var CTL = "템플릿 조절", MAXW = 1720;
    var WHT = [255, 255, 255], BLK = [0, 0, 0];
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "/result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function c1(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function tp(L, m) { return L.property("ADBE Transform Group").property(m); }
    function ref(n) { return 'thisComp.layer("' + CTL + '").effect("' + n + '")(1)'; }
    function findComp(n) { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem && app.project.item(i).name == n) return app.project.item(i); return null; }
    var C, ORDER, TEXTS;
    function fx() { return C.layer(CTL).property("ADBE Effect Parade"); }
    function has(n) { var e = fx(); for (var i = 1; i <= e.numProperties; i++) if (e.property(i).name == n) return true; return false; }
    function cColor(n, v) { if (!has(n)) { fx().addProperty("ADBE Color Control").name = n; var k = c1(v); fx().property(n).property(1).setValue([k[0], k[1], k[2], 1]); ORDER.push(n); } return ref(n); }
    function cSlider(n, v) { if (!has(n)) { fx().addProperty("ADBE Slider Control").name = n; fx().property(n).property(1).setValue(v); ORDER.push(n); } return ref(n); }
    function cPoint(n) { if (!has(n)) { fx().addProperty("ADBE Point Control").name = n; fx().property(n).property(1).setValue([0, 0]); ORDER.push(n); } return ref(n); }

    function newComp(name, nf) {   // nf: 프레임 수 (없으면 300) — Q 카드 58프레임
        var old = findComp(name); if (old) old.remove();
        C = app.project.items.addComp(name, 1920, 1080, 1, nf ? nf / FPS : DUR, FPS);
        
        var N = C.layers.addNull(C.duration); N.name = CTL; N.moveToEnd();
        ORDER = []; TEXTS = [];
        w(name);
    }
    function mkText(name, txt, o) {
        var L = C.layers.addText(txt); L.name = name;
        var st = tdoc(L), td = st.value;
        td.font = o.font; td.fontSize = o.size; td.fillColor = c1(o.col || WHT); td.applyFill = true;
        td.justification = ParagraphJustification.CENTER_JUSTIFY; td.tracking = o.track || 0;
        if (o.selfStroke) { o.stroke = [o.col, o.selfStroke]; }   // 업체 손글씨가 18% 굵음 → 같은 색 테두리로 보정 (2026-10-28 측정)
        if (o.stroke) { td.applyStroke = true; td.strokeColor = c1(o.stroke[0]); td.strokeWidth = o.stroke[1]; td.strokeOverFill = false; } else td.applyStroke = false;
        st.setValue(td);
        if (tdoc(L).value.font != o.font) w("  주의 폰트 " + name + " → " + tdoc(L).value.font);
        return L;
    }
    // 원하는 폭(px)이 되게 글자 크기를 맞춤 (playbook: 크기는 폭으로)
    function fitWidth(name, target) {
        for (var it = 0; it < 4; it++) {
            var L = C.layer(name), r = L.sourceRectAtTime(0, false), td = tdoc(L).value;
            td.fontSize = td.fontSize * target / r.width; tdoc(C.layer(name)).setValue(td);
        }
        w("  크기 " + name + " = " + Math.round(tdoc(C.layer(name)).value.fontSize * 10) / 10);
    }
    function animColor(name, fillExpr, strokeToo) {
        var A = C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A.name = "색 바꾸기";
        var g = function () { return C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").property("색 바꾸기"); };
        g().property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        g().property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color");
        g().property("ADBE Text Animator Properties").property("ADBE Text Fill Color").expression = fillExpr;
        if (strokeToo) {   // 같은 색 테두리(굵기 보정)도 글자 색을 따라감
            g().property("ADBE Text Animator Properties").addProperty("ADBE Text Stroke Color");
            g().property("ADBE Text Animator Properties").property("ADBE Text Stroke Color").expression = fillExpr;
        }
    }
    function shadow(name, col, op, dist, soft) {
        var sc = cColor("그림자 색", col), so = cSlider("그림자 진하기(%)", op), ss = cSlider("그림자 부드러움", soft), sd = cSlider("그림자 거리", dist);
        C.layer(name).property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
        var D = C.layer(name).property("ADBE Effect Parade").property("ADBE Drop Shadow");
        D.property("ADBE Drop Shadow-0001").expression = sc; D.property("ADBE Drop Shadow-0002").expression = so + '*2.55';
        D.property("ADBE Drop Shadow-0003").setValue(135); D.property("ADBE Drop Shadow-0004").expression = sd; D.property("ADBE Drop Shadow-0005").expression = ss;
    }
    // 글자 레이어: 가운데 기준, 위치 칸·크기 칸·자동 축소, 등장 움직임(프레임별 y 이동·투명도)
    //   o.label: 칸 이름 앞말 (두 줄 템플릿 "1줄 "·"2줄 " → "1줄 텍스트"·"1줄 크기(%)"·"1줄 위치 이동"), 없으면 기존 이름
    function textLayer(name, txt, o) {
        var pre = o.label || "";
        mkText(name, txt, o); TEXTS.push([name, pre ? pre + "텍스트" : "자막 텍스트"]);
        animColor(name, cColor("글자 색", o.col || WHT), !!o.selfStroke);
        if (o.fitW) fitWidth(name, o.fitW);
        var L = C.layer(name);
        tp(L, "ADBE Anchor Point").expression = 'var r=sourceRectAtTime(time,false); [r.left+r.width/2, r.top+r.height/2]';
        tp(L, "ADBE Position").setValue(o.pos);
        var pp = cPoint(pre + "위치 이동"), ss = cSlider(pre + "크기(%)", 100);
        var dy = o.dy ? '[' + o.dy.join(",") + ']' : '[0]', op = o.op ? '[' + o.op.join(",") + ']' : '[100]';
        tp(L, "ADBE Position").expression = 'var f=Math.round(time/thisComp.frameDuration), d=' + dy + '; value+' + pp + '+[0, f<d.length?d[f]:0]';
        tp(L, "ADBE Scale").expression = 'var r=sourceRectAtTime(time,false), k=' + ss + '/100; if (r.width*k>' + MAXW + ') k=' + MAXW + '/r.width; [100*k,100*k]';
        if (o.fade) tp(L, "ADBE Opacity").expression = 'var f=time/thisComp.frameDuration; Math.min(100, Math.max(0, f/' + o.fade + '*100))';
        else tp(L, "ADBE Opacity").expression = 'var f=Math.round(time/thisComp.frameDuration), a=' + op + '; f<a.length?a[f]:100';
        return name;
    }
    // 글자 뒤 상자 (글자의 자식 — 글자 크기·위치·움직임을 따라감). 높이는 글자 크기에 비례
    function boxFor(textName, o) {
        var col = cColor("상자 색", o.col), op = cSlider("상자 투명도(%)", o.op), pw = cSlider("상자 가로 여백", o.padX), hh = cSlider("상자 높이", o.h), rr = cSlider("상자 둥글기", o.radius);
        var S = C.layers.addShape(); S.name = "상자";
        var g = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        var vg = function () { return C.layer("상자").property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); };
        vg().property(1).property("ADBE Vector Rect Size").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false), s=thisLayer.parent.text.sourceText.style.fontSize/' + o.size0 + '; r.width<1?[0,0]:[r.width+2*' + pw + '*s, ' + hh + '*s]';
        vg().property(1).property("ADBE Vector Rect Position").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false); [r.left+r.width/2, r.top+r.height/2+' + (o.dy || 0) + ']';
        vg().property(1).property("ADBE Vector Rect Roundness").expression = rr;
        vg().property(2).property("ADBE Vector Fill Color").expression = col;
        S = C.layer("상자"); S.parent = C.layer(textName);
        tp(S, "ADBE Anchor Point").setValue([0, 0]); tp(S, "ADBE Position").setValue([0, 0]); tp(S, "ADBE Scale").setValue([100, 100]);
        tp(S, "ADBE Opacity").expression = op + '*thisLayer.parent.transform.opacity/100';
        S.moveAfter(C.layer(textName));
    }
    // 글자 복사(번짐용) — 문구·폰트·크기는 원본을 따라감
    function glowCopy(src, name, colExpr, blur, op) {
        var L = C.layers.addText("x"); L.name = name;
        tdoc(L).expression = 'var p=thisComp.layer("' + src + '").text.sourceText; p.style.setText(""+p)';
        var E = L.property("ADBE Effect Parade");
        E.addProperty("ADBE Fill"); C.layer(name).property("ADBE Effect Parade").property("ADBE Fill").property("ADBE Fill-0002").expression = colExpr;
        C.layer(name).property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        C.layer(name).property("ADBE Effect Parade").property("ADBE Gaussian Blur 2").property("ADBE Gaussian Blur 2-0001").expression = blur;
        var T = C.layer(name);
        tp(T, "ADBE Anchor Point").expression = 'thisComp.layer("' + src + '").transform.anchorPoint';
        tp(T, "ADBE Position").expression = 'thisComp.layer("' + src + '").transform.position';
        tp(T, "ADBE Scale").expression = 'thisComp.layer("' + src + '").transform.scale';
        tp(T, "ADBE Opacity").expression = op + '*thisComp.layer("' + src + '").transform.opacity/100';
        T.moveAfter(C.layer(src));
        return name;
    }
    // 글자마다 흐림이 풀리며 나타남 (왼→오): span 프레임 안에서 글자마다 len 프레임씩
    function charReveal(name, span, len, blur) {
        var A = C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); A.name = "글자 등장";
        var g = function () { return C.layer(name).property("ADBE Text Properties").property("ADBE Text Animators").property("글자 등장"); };
        g().property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
        g().property("ADBE Text Animator Properties").addProperty("ADBE Text Blur");
        g().property("ADBE Text Animator Properties").property("ADBE Text Opacity").setValue(0);
        g().property("ADBE Text Animator Properties").property("ADBE Text Blur").setValue([blur, blur]);
        g().property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
        g().property("ADBE Text Selectors").property(1).property("ADBE Text Expressible Amount").expression =
            'var f=time/thisComp.frameDuration, n=Math.max(1,textTotal-1), st=(textIndex-1)/n*(' + (span - len) + '); var a=1-Math.min(1,Math.max(0,(f-st)/' + len + ')); a=a*a*(3-2*a); [a*100,a*100,a*100]';
    }
    // 사선 한 개 (어두운 선 + 흰 테두리) — 글자 레이어의 자식, 글자 상자 왼쪽/오른쪽에 붙음
    function slash(textName, label, side) {
        var col = cColor("사선 색", [45, 45, 45]), edge = cColor("사선 테두리 색", WHT), gap = cSlider("사선 간격", 26), ht = cSlider("사선 높이", 154);
        var S = C.layers.addShape(); S.name = label;
        var root = S.property("ADBE Root Vectors Group");
        var g = root.addProperty("ADBE Vector Group");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");   // 2: 어두운 선 (그룹 안 앞 항목이 위에 그려짐 — 2026-10-28 렌더로 확인)
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");   // 3: 흰 테두리 (아래)
        var vg = function () { return C.layer(label).property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); };
        var dxTop = side < 0 ? 1 : -1;   // 왼쪽 "\"(위가 왼쪽) / 오른쪽 "/" — 경로 [-dx/2,-h/2]→[dx/2,h/2]
        vg().property(1).property("ADBE Vector Shape").expression =
            'var h=' + ht + '*thisLayer.parent.text.sourceText.style.fontSize/75, dx=h*0.40*' + dxTop + '; createPath([[-dx/2,-h/2],[dx/2,h/2]],[],[],false)';
        vg().property(2).property("ADBE Vector Stroke Color").expression = col;
        vg().property(2).property("ADBE Vector Stroke Width").expression = '12*thisLayer.parent.text.sourceText.style.fontSize/75';
        vg().property(2).property("ADBE Vector Stroke Line Cap").setValue(2);
        vg().property(3).property("ADBE Vector Stroke Color").expression = edge;
        vg().property(3).property("ADBE Vector Stroke Width").expression = '19*thisLayer.parent.text.sourceText.style.fontSize/75';
        vg().property(3).property("ADBE Vector Stroke Line Cap").setValue(2);
        S = C.layer(label); S.parent = C.layer(textName);
        tp(S, "ADBE Anchor Point").setValue([0, 0]); tp(S, "ADBE Scale").setValue([100, 100]);
        tp(S, "ADBE Position").expression = 'var r=thisLayer.parent.sourceRectAtTime(time,false), s=thisLayer.parent.text.sourceText.style.fontSize/75, h=' + ht + '*s; ' +
            '[' + (side < 0 ? 'r.left-' + gap + '*s-h*0.2' : 'r.left+r.width+' + gap + '*s+h*0.2') + ', r.top+r.height/2]';
        tp(S, "ADBE Opacity").expression = 'thisLayer.parent.transform.opacity';
        S.moveAfter(C.layer(textName));
    }
    // 등장 세로 흐림 — 맨 위 조정 레이어의 방향 흐림(세로), 프레임마다 길이 (r1처럼 처음 2프레임에 강하게)
    //   2026-10-28: 레이어 모션 블러는 saveFrameToPng에 거의 안 나와 r1과 달랐음 → 정해진 값으로
    function dirBlur(lens) {
        var A = C.layers.addSolid([0, 0, 0], "등장 흐림", 1920, 1080, 1, DUR); A.adjustmentLayer = true; A.moveToBeginning();
        C.layer("등장 흐림").property("ADBE Effect Parade").addProperty("ADBE Motion Blur");
        var E = C.layer("등장 흐림").property("ADBE Effect Parade").property("ADBE Motion Blur");
        E.property("ADBE Motion Blur-0001").setValue(0);
        C.layer("등장 흐림").property("ADBE Effect Parade").property("ADBE Motion Blur").property("ADBE Motion Blur-0002").expression =
            'var f=Math.round(time/thisComp.frameDuration), L=[' + lens.join(",") + ']; f<L.length?L[f]:0';
    }
    function register() {
        var ok = [];
        for (var i = 0; i < TEXTS.length; i++) ok.push(TEXTS[i][1] + (tdoc(C.layer(TEXTS[i][0])).addToMotionGraphicsTemplateAs(C, TEXTS[i][1]) ? "" : "(실패)"));
        for (var m = 0; m < ORDER.length; m++) { var pp = fx().property(ORDER[m]).property(1); ok.push(ORDER[m] + (pp.addToMotionGraphicsTemplateAs(C, ORDER[m]) ? "" : "(실패)")); }
        w("  칸 " + ok.length + ": " + ok.join(", "));
    }

    // ───────── 템플릿 6종 ─────────  [이름, 확인 프레임들, 만들기]
    var B = {};
    B.A = ["놀심_A_흰고딕", [0, 1, 2, 3, 20], function () {
        textLayer("자막", "상대에 대한 배려가 필요하다", { font: "NotoSansKR-Black", size: 140, fitW: 1699, pos: [949, 909.5], dy: [-100, -48, -14], op: [25, 50, 75] });
        shadow("자막", [30, 30, 30], 53, 1, 19); dirBlur([60, 45, 15]);
    }];
    B.B = ["놀심_B_붓글씨", [0, 1, 2, 3, 20], function () {
        textLayer("자막", "사람 때문에 잃게 되더라고요", { font: "ChungjuKimSaeng", size: 110, fitW: 1146, pos: [958, 912], dy: [-80, -51, -24], op: [15, 35, 65] });
        shadow("자막", [30, 30, 30], 53, 1, 17); dirBlur([60, 45, 20]);
    }];
    B.D = ["놀심_D_노란빛", [0, 2, 4, 6, 8, 10, 20], function () {
        textLayer("자막", "잘 사는 지름길이 아닐까", { font: "HangeulNuri", size: 110, fitW: 1112, pos: [956, 904] });
        var gc = cColor("번짐 색", [255, 135, 0]), gs = cSlider("번짐 크기", 30), go = cSlider("번짐 진하기(%)", 100);
        glowCopy("자막", "번짐", gc, gs, go);
        glowCopy("자막", "번짐 안쪽", cColor("번짐 안쪽 색", [255, 165, 40]), '' + gs + '*0.25', go);
        charReveal("자막", 10, 8, 30);
        // 번짐 레이어도 같은 글자 등장 (문구는 식으로 따라가지만 애니메이터는 따로)
        charReveal("번짐", 10, 8, 30); charReveal("번짐 안쪽", 10, 8, 30);
        C.layer("번짐 안쪽").moveAfter(C.layer("자막")); C.layer("번짐").moveAfter(C.layer("번짐 안쪽"));
    }];
    // 두 줄 노란 빛 (2026-10-29, 사용자: "2줄 글자 크기, 위치 각각 변경 가능하도록") — 줄마다 글자·크기·위치 칸, 번짐·글자 색은 같이
    //   기본: 이사만루 Light 112.85 (사용자가 D를 모두 이 글꼴로 바꿈), 줄 간격 = 9:42 자막을 두 줄로 나눴을 때 (중심 ±67.5px)
    B.D2 = ["놀심_D2_노란빛2줄", [0, 4, 10, 20], function () {
        var gc = cColor("번짐 색", [255, 135, 0]), gs = cSlider("번짐 크기", 30), go = cSlider("번짐 진하기(%)", 100), gi = cColor("번짐 안쪽 색", [255, 165, 40]);
        var lines = [["1줄", "조금씩 균열 내서", 904 - 67.5], ["2줄", "변화시켜 나가는 게 가장 빠른 방법", 904 + 67.5]];
        for (var i = 0; i < lines.length; i++) {
            var nm = lines[i][0];
            textLayer(nm, lines[i][1], { font: "esamanruOTFLight", size: 112.85, pos: [960, lines[i][2]], label: nm + " " });
            glowCopy(nm, nm + " 번짐", gc, gs, go);
            glowCopy(nm, nm + " 번짐 안쪽", gi, '' + gs + '*0.25', go);
            charReveal(nm, 10, 8, 30); charReveal(nm + " 번짐", 10, 8, 30); charReveal(nm + " 번짐 안쪽", 10, 8, 30);
            C.layer(nm + " 번짐 안쪽").moveAfter(C.layer(nm)); C.layer(nm + " 번짐").moveAfter(C.layer(nm + " 번짐 안쪽"));
        }
    }];
    // 두 줄 붓글씨 (2026-10-29, 13:34 자막 — 사용자: "이것도 줄마다 크기, 사이즈 조정할 수 있게") — 부정적인 말 스타일(빨간 빛)이 기본
    //   글꼴·크기 = 사용자 수정본(솔뫼 김대건 100), 그림자 = 39초 자막(빨강 210,0,0 · 100% · 부드러움 46.39 · 거리 0). 두 번째 빛은 프리미어 '그림자 효과'로 클립에 따로
    //   줄 중심 851 / 971.4 = 13:34 자막을 줄바꿈으로 나눴을 때 화면 위치(859.5 / 978)를 클립 모션(98.43%, y +13.3px)으로 되돌린 값
    B.B2 = ["놀심_B2_붓글씨2줄", [0, 1, 2, 3, 20], function () {
        var lines = [["1줄", "대부분의 현대인들이 겪는 어려움은", 851], ["2줄", "심리적인 괴로움들이거든요", 971.4]];
        for (var i = 0; i < lines.length; i++) {
            textLayer(lines[i][0], lines[i][1], { font: "OTSolmoeKimDaeGeonM", size: 100, pos: [960, lines[i][2]], dy: [-80, -51, -24], op: [15, 35, 65], label: lines[i][0] + " " });
            shadow(lines[i][0], [210, 0, 0], 100, 0, 46.39);
        }
        dirBlur([60, 45, 20]);
    }];
    // Q 카드 글자 (2026-10-29, 사용자: "큰 맥락이 바뀌는 부분에 q카드") — 배경(정지 화면 흐림 + 흰 막)은 따로 렌더해 V1/V6에 깔고 이 템플릿은 글자만
    //   r1 측정(통합분석 2-3): "Q." 세리프 굵게 높이 ≈100px y387~488 / 질문 2줄 둥근 굵은 고딕 글자 높이 60~64px, 줄 y533~596·624~687 (간격 91px), 흰 + 부드러운 그림자
    //   글꼴: 클라이언트 지정 = 채널 소스 Q 카드(NS_Source.prproj "Q. 이민혜 선생님은 어떤 상담사인지?")와 같은 KOTRA_SONGEULSSI-Medium (사용자 2026-10-29: "그게 클라이언트가 사용해달라고 한 폰트야")
    //   (처음엔 Georgia-Bold·Cafe24SsurroundOTF로 만들었다가 바꿈 — 템플릿 글꼴 수정 허용이 꺼져 있으면 클립에서 글꼴 값을 바꿔도 화면은 그대로)
    //   등장: 8~11프레임 페이드 인, 끝나기 11~8프레임 전 페이드 아웃. 앞 12·뒤 12프레임은 보호 구간 → Q1(2.7초)·Q2~(1.93초) 길이가 달라도 같은 움직임
    var QF = "ChungjuKimSaeng", QF2 = "ChungjuKimSaeng", QS = [104, 64.5];   // r1 Q 카드 = "Q."·질문 모두 충주김생체 (Q 글자 모양 대조로 확인, 2026-10-29). 104 → Q 높이 103·폭 104px(r1 102·105), 64.5 → 질문 높이 64~65·글자당 폭 60.1px(r1 63~64·60.4). 클라이언트 소스 Q 카드는 송글씨였음
    B.Q = ["놀심_Q_카드", [0, 9, 12, 30, 47, 50, 57], function () {
        var L3 = [["Q", "Q.", QF, QS[0], 437.5], ["1줄", "인생을 잘 사는", QF2, QS[1], 564.5], ["2줄", "사람들의 특징?", QF2, QS[1], 655.5]];
        for (var i = 0; i < L3.length; i++) {
            var nm = L3[i][0];
            textLayer(nm, L3[i][1], { font: L3[i][2], size: L3[i][3], pos: [960, L3[i][4]], label: nm + " " });
            shadow(nm, [0, 0, 0], 35, 2, 20);
            tp(C.layer(nm), "ADBE Opacity").expression = 'var f=time/thisComp.frameDuration, N=thisComp.duration/thisComp.frameDuration; ' +
                'f<8?0:(f<11?(f-8)/3*100:(f<N-11?100:(f<N-8?(N-8-f)/3*100:0)))';
        }
        // 보호 구간 (프리미어에서 길이를 바꿔도 앞뒤 움직임 유지)
        var mi = new MarkerValue("등장"); mi.duration = 12 * FR; mi.protectedRegion = true;
        var mo = new MarkerValue("퇴장"); mo.duration = 12 * FR; mo.protectedRegion = true;
        C.markerProperty.setValueAtTime(0, mi); C.markerProperty.setValueAtTime(C.duration - 12 * FR, mo);
    }, 58];
    B.E = ["놀심_E_노랑박스", [0, 2, 4, 8, 20], function () {
        textLayer("자막", "사람이 바뀌는 건 거의 불가능 하다", { font: "KOTRA_SONGEULSSI-Medium", size: 70, fitW: 1021, col: [78, 64, 46], selfStroke: 0.6, pos: [958, 938.5], fade: 8 });
        boxFor("자막", { col: [255, 227, 101], op: 72, padX: 14, h: 104, radius: 10, size0: tdoc(C.layer("자막")).value.fontSize });
    }];
    B.E2 = ["놀심_E2_연두박스", [0, 1, 2, 3, 20], function () {
        textLayer("자막", "유년 시절 또 학창 시절에 순조롭거든요", { font: "KOTRA_SONGEULSSI-Medium", size: 70, col: [78, 64, 46], selfStroke: 0.6, pos: [958, 907.5], dy: [104, 37, 8], op: [35, 65, 80] });
        // 글자 크기는 노랑 박스(E)와 같게 (같은 칸 높이)
        var e = findComp("놀심_E_노랑박스"); if (e) { var td = tdoc(C.layer("자막")).value; td.fontSize = tdoc(e.layer("자막")).value.fontSize; tdoc(C.layer("자막")).setValue(td); }
        boxFor("자막", { col: [209, 253, 157], op: 72, padX: 14, h: 104, radius: 10, size0: tdoc(C.layer("자막")).value.fontSize }); dirBlur([55, 40, 12]);
    }];
    B.H = ["놀심_H_PD사선", [0, 1, 2, 3, 20], function () {
        textLayer("자막", "이번에 책에서", { font: "NotoSansKR-ExtraBold", size: 75, stroke: [[25, 25, 25], 7], pos: [960, 914], dy: [106, 49, 8], op: [25, 40, 65] });
        shadow("자막", [0, 0, 0], 45, 3, 8);
        slash("자막", "사선 왼쪽", -1); slash("자막", "사선 오른쪽", 1); dirBlur([50, 35, 12]);
    }];
    var ORDER_ALL = ["A", "B", "D", "E", "E2", "H"];

    function checkFrames(id) {
        var nm = B[id][0], c = findComp(nm), fr = B[id][1];
        for (var i = 0; i < fr.length; i++) {
            var png = new File(OUT + "/check/" + id + "_" + (fr[i] < 10 ? "0" : "") + fr[i] + ".png"); if (png.exists) png.remove();
            c = findComp(nm); c.saveFrameToPng(fr[i] * FR + FR * 0.01, png);
            for (var z = 0; z < 80 && !png.exists; z++) $.sleep(250);
        }
        w("  확인 프레임 " + id + " " + fr.length);
    }
    function exportOne(id) {
        var nm = B[id][0], c = findComp(nm);
        var d = new Folder(OUT + "/export_" + id); if (!d.exists) d.create();
        var old = d.getFiles("*.mogrt"); for (var q = 0; q < old.length; q++) old[q].remove();
        w("  내보내기 " + nm);
        var ok = c.exportAsMotionGraphicsTemplate(true, d.fsName);
        w("  export=" + ok);
    }
    try {
        app.beginSuppressDialogs();
        new Folder(OUT).create(); new Folder(OUT + "/check").create();
        var aep = new File(OUT + "/nolsim6.aep");
        if (app.project && app.project.file && app.project.file.fsName == aep.fsName) {}
        else { if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); if (aep.exists) app.open(aep); else { app.newProject(); app.project.save(aep); } }
        w("프로젝트 " + aep.fsName);
        var ids = ORDER_ALL, of = new File(OUT + "/only.txt");
        if (of.exists) { of.open("r"); ids = of.read().replace(/\s/g, "").split(","); of.close(); }
        var doExport = new File(OUT + "/export.txt").exists;
        w("대상 " + ids.join(",") + (doExport ? " (내보내기)" : " (만들기·확인)"));
        if (!doExport) for (var n = 0; n < ids.length; n++) {
            var id = ids[n]; newComp(B[id][0], B[id][3]); B[id][2](); register(); app.project.save();
        }
        for (var n = 0; n < ids.length; n++) checkFrames(ids[n]);
        if (doExport) for (var n = 0; n < ids.length; n++) exportOne(ids[n]);
        app.project.save();
        w("Nolsim 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
