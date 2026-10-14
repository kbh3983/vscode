// 포인트 에이전트 — 우리가 만든 AE 템플릿 17개 길이를 450프레임(15.02초)으로 (2026-10-13 사용자: "자막이 생각보다 짧아서 길게 늘여 써야 하는데
//   그래픽 템플릿 포인트 자막 길이가 짧아서, 새로 생성한 그래픽 템플릿 모두 15초로 기본값 늘려서 수정할 수 있어?")
// 길이만 바꾼다: 컴포지션·작업 영역·레이어 끝, 안에 쓰인 프리컴프도 짧으면 같이. 색·크기 칸은 그대로
// 마지막 키가 이전 끝(10초) 근처에 있으면 기록 (끝에서 사라지는 애니메이션이 있는지 확인용)
// 실행: run_ae.ps1 <이 파일> <결과 txt> "EXTEND END|ERR" 1200. 원본 .aep는 _백업1013_10초.aep로 복사. 내보내기 → extend_export\<이름> → finish_mogrt.py
(function () {
    var R = "C:\\DADA\\9.AI\\vscode\\편집자동화\\";
    var EXP = R + "work\\포인트\\ae_templates\\extend_export\\";
    var LOG = R + "work\\포인트\\ae_templates\\extend_result.txt";
    var FRAMES = 450;
    var NAME = {
        "실망_우울_좌절_AE": "05_실망 우울 좌절 모션자막_AE", "분노_화나는_AE": "08_분노 화나는 모션자막_AE", "분노_화나는2_AE": "10_분노 화나는 모션자막_AE",
        "잔망스럽고_귀여운_AE": "봄자막 03-잔망스럽고 귀여운 움직임_AE", "즐겁게_흥얼거리는_AE": "봄자막 04-즐겁게 흥얼거리는 움직임_AE",
        "뿅_솟아오르는_AE": "봄자막 06-뿅 솟아오르는(빠르게)_AE", "꼬물꼬물_AE": "봄자막 12-꼬물꼬물_AE", "기분좋은_AE": "봄자막 13-기분좋은 움직임_AE",
        "정보바_세트안내": "정보바_세트안내_AE", "해설_괄호": "해설_괄호_AE", "Tip_동작요령_2단": "Tip_동작요령_2단_AE", "요령_노랑_2단": "요령_노랑_2단_AE",
        "정보바_2줄": "정보바_2줄_AE", "요약_색강조_한줄": "요약_색강조_한줄_AE",
        "요약_2단_초록": "요약_2단_초록_AE", "요약_2단_빨강": "요약_2단_빨강_AE", "요약_2단_노랑": "요약_2단_노랑_AE"
    };
    var P = ["work\\포인트\\ae_templates\\05_실망\\05_실망_AE.aep", "work\\포인트\\ae_templates\\08_분노\\08_분노_AE.aep",
             "work\\포인트\\ae_templates\\10_분노\\10_분노_AE.aep", "work\\포인트\\ae_templates\\봄03\\봄03_AE.aep",
             "work\\포인트\\ae_templates\\봄04\\봄04_AE.aep", "work\\포인트\\ae_templates\\봄06\\봄06_AE.aep",
             "work\\포인트\\ae_templates\\봄12\\봄12_AE.aep", "work\\포인트\\ae_templates\\봄13\\봄13_AE.aep",
             "work\\회고\\tpl\\ae\\info4.aep", "work\\회고\\목교정기\\tpl\\ae\\info2.aep", "work\\회고\\자세교정\\tpl\\ae\\sum2.aep"];
    var log = [];
    function w(s) { log.push(s); var f = new File(LOG); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function lastKey(g, a) {   // 속성 묶음 안 마지막 키 시각
        for (var i = 1; i <= g.numProperties; i++) {
            var p = g.property(i);
            if (p.propertyType == PropertyType.PROPERTY) { if (p.numKeys > 0) a.t = Math.max(a.t, p.keyTime(p.numKeys)); }
            else lastKey(p, a);
        }
        return a.t;
    }
    var seen = {};
    function extend(c, d, depth) {   // 컴포지션과 그 안 프리컴프 길이 늘리기
        if (seen[c.id]) return; seen[c.id] = true;
        var old = c.duration;
        if (c.duration < d) c.duration = d;
        if (depth == 0) { c.workAreaStart = 0; c.workAreaDuration = d; }
        for (var j = 1; j <= c.numLayers; j++) {
            var L = c.layer(j), lk = L.locked;
            if (L.source instanceof CompItem) extend(L.source, d, depth + 1);
            var k = lastKey(L, { t: -1 });
            if (k > old - 1) w("   주의: " + c.name + "/" + L.name + " 마지막 키 " + Math.round(k * 100) / 100 + "초 (이전 끝 " + Math.round(old * 100) / 100 + "초)");
            if (L.outPoint >= old - c.frameDuration) { L.locked = false; L.outPoint = d; L.locked = lk; }   // 끝까지 가던 레이어만
            else w("   참고: " + c.name + "/" + L.name + " 원래 " + Math.round(L.outPoint * 100) / 100 + "초에 끝남 — 그대로");
        }
        if (depth > 0) w("   프리컴프 " + c.name + " " + Math.round(old * 100) / 100 + " → " + Math.round(c.duration * 100) / 100 + "초");
    }
    try {
        app.beginSuppressDialogs();
        new Folder(EXP).create();
        for (var k = 0; k < P.length; k++) {
            var path = R + P[k], bak = new File(path.replace(".aep", "_백업1013_10초.aep"));
            if (!new File(path).exists) { w("파일 없음 " + path); continue; }
            if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            if (!bak.exists) { new File(path).copy(bak.fsName); w("백업 " + bak.name); }
            app.open(new File(path));
            seen = {};   // 프로젝트마다 id가 다시 매겨짐
            var done = [];
            for (var i = 1; i <= app.project.numItems; i++) {
                var c = app.project.item(i);
                if (!(c instanceof CompItem) || !NAME[c.name]) continue;
                var d = FRAMES * c.frameDuration, before = c.duration;
                w(c.name + " 시작 (" + Math.round(before * 1000) / 1000 + "초)");
                extend(c, d, 0);
                w(c.name + " 길이 " + Math.round(before * 1000) / 1000 + " → " + Math.round(c.duration * 1000) / 1000 + "초");
                done.push(c.name);
            }
            app.project.save(new File(path));
            for (var n = 0; n < done.length; n++) {
                var cc = null; for (var z = 1; z <= app.project.numItems; z++) if (app.project.item(z) instanceof CompItem && app.project.item(z).name == done[n]) cc = app.project.item(z);   // 내보내면 앞 참조가 무효 → 이름으로 다시
                var dir = new Folder(EXP + NAME[done[n]]); if (!dir.exists) dir.create();
                if (new File(dir.fsName + "/done.txt").exists) { w("  내보내기 " + done[n] + " 이미 함"); continue; }
                w("  내보내기 시작 " + done[n]);
                var okx = cc.exportAsMotionGraphicsTemplate(true, dir.fsName); w("  내보내기 " + done[n] + " = " + okx);
                if (okx) { var df = new File(dir.fsName + "/done.txt"); df.open("w"); df.write("1"); df.close(); }
            }
        }
        app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        w("EXTEND END");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
