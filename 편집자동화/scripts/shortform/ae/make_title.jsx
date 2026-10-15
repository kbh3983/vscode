// 숏폼 에이전트 — 상단 제목 2줄을 고칠 수 있는 애프터이펙트 템플릿(.mogrt)으로 (2026-10-14 사용자: "제목도 텍스트로 비디오 시퀀스에 넣는 방법으로")
// 실행: scripts/point/ae/run_ae.ps1 <이 파일> <OUT\result_title.txt> "Title export" 300 → finish_mogrt.py OUT\export "숏폼_상단제목_AE" "숏폼 상단 제목"
// 디자인 = make_assets.py title(): Pretendard Black, 자간 −45, 윗줄 흰 가운데 y227 / 아랫줄 노랑(252,224,1) y337, 크기 100 (폭 797 넘으면 줄임)
//   PIL 기준점 "lm"(줄 가운데) = 글자 기준선 위 35.5px (크기 100) → 기준점 y −35.5, 크기는 기준점 중심으로
// 칸: 윗줄 텍스트·아랫줄 텍스트 + 템플릿 조절(윗줄/아랫줄 색, 윗줄/아랫줄 크기 %, 윗줄/아랫줄 위치 이동) — playbook_AE변환 12장 표준
// 길이: 숏폼 최대 길이를 넘게 120초 (애니메이션 없음)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\숏폼\\tpl\\title";
    var DUR = 120, CTL = "템플릿 조절", MAXW = 797, MID = 35.5;
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_title.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function tdoc(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function tp(L, m) { return L.property("ADBE Transform Group").property(m); }
    function ref(n) { return 'thisComp.layer("' + CTL + '").effect("' + n + '")(1)'; }
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        new Folder(OUT).create();
        app.newProject();
        app.project.save(new File(OUT + "\\title.aep"));
        w("프로젝트 저장");
        var c = app.project.items.addComp("숏폼_상단제목", 1080, 1920, 1, DUR, 29.97);
        var N = c.layers.addNull(DUR); N.name = CTL;
        var fx = N.property("ADBE Effect Parade"), ORDER = [];
        function addCtl(m, n, v) { var e = fx.addProperty(m); e.name = n; e.property(1).setValue(v); ORDER.push(n); }
        addCtl("ADBE Color Control", "윗줄 색", [1, 1, 1, 1]);
        addCtl("ADBE Color Control", "아랫줄 색", [252 / 255, 224 / 255, 1 / 255, 1]);
        addCtl("ADBE Slider Control", "윗줄 크기", 100);
        addCtl("ADBE Slider Control", "아랫줄 크기", 100);
        addCtl("ADBE Point Control", "윗줄 위치 이동", [0, 0]);
        addCtl("ADBE Point Control", "아랫줄 위치 이동", [0, 0]);
        w("조절 칸");
        var LINES = [["윗줄", "목 견인기 써도", [1, 1, 1], 227], ["아랫줄", "거북목 안 펴지는 이유", [252 / 255, 224 / 255, 1 / 255], 337]];
        var TL = [];
        for (var i = 0; i < 2; i++) {
            var nm = LINES[i][0], L = c.layers.addText(LINES[i][1]); L.name = nm;
            var st = tdoc(L), td = st.value;
            td.font = "Pretendard-Black"; td.fontSize = 100; td.fillColor = LINES[i][2]; td.applyFill = true; td.applyStroke = false;
            td.justification = ParagraphJustification.CENTER_JUSTIFY; td.tracking = -45;
            st.setValue(td);
            w(nm + " 폰트 " + tdoc(L).value.font);
            var A = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            A.name = "색 바꾸기";
            A.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            A.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").expression = ref(nm + " 색");
            L = c.layer(nm);
            tp(L, "ADBE Anchor Point").expression = 'var r=sourceRectAtTime(time,false); [r.left+r.width/2, -' + MID + ']';
            tp(L, "ADBE Scale").expression = 'var r=sourceRectAtTime(time,false); var k=Math.min(100,' + MAXW + '/Math.max(1,r.width)*100)*' + ref(nm + " 크기") + '/100; [k,k]';
            tp(L, "ADBE Position").expression = '[540,' + LINES[i][3] + ']+' + ref(nm + " 위치 이동");
            TL.push(nm);
        }
        N.moveToEnd();   // 널은 맨 아래 (12장)
        w("글자 레이어");
        c.openInViewer();
        c = null;
        for (var k = 1; k <= app.project.numItems; k++) if (app.project.item(k).name == "숏폼_상단제목") c = app.project.item(k);
        tdoc(c.layer("윗줄")).addToMotionGraphicsTemplateAs(c, "윗줄 텍스트");
        tdoc(c.layer("아랫줄")).addToMotionGraphicsTemplateAs(c, "아랫줄 텍스트");
        for (var q = 0; q < ORDER.length; q++) c.layer(CTL).property("ADBE Effect Parade").property(ORDER[q]).property(1).addToMotionGraphicsTemplateAs(c, ORDER[q]);
        w("필수 그래픽 등록");
        c.motionGraphicsTemplateName = "숏폼 상단 제목";
        // 확인 프레임 (비동기 → 기다림)
        var png = new File(OUT + "\\check.png"); if (png.exists) png.remove();
        c.saveFrameToPng(1, png);
        for (var z = 0; z < 60 && !png.exists; z++) $.sleep(500);
        w("확인 프레임 " + png.exists);
        app.project.save();
        var d = new Folder(OUT + "\\export"); if (!d.exists) d.create();
        w("내보내기 시작");
        w("Title export=" + c.exportAsMotionGraphicsTemplate(true, d.fsName));
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
