// v2 확인: 숨은 원문 칸의 폰트·크기를 바꾸면 화면 글자가 따라가는지 (큰자막·웃음) — 프로젝트를 저장하지 않음
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\지식인사이드\\tpl_v2";
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_test.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function find(n) { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem && app.project.item(i).name == n) return app.project.item(i); return null; }
    try {
        app.beginSuppressDialogs();
        var f = new File(OUT + "\\gyoyang7_v2.aep");
        if (!app.project || !app.project.file || app.project.file.fsName != f.fsName) app.open(f);
        var T = [["큰자막", "원문", "글자", 2], ["웃음", "글자 입력", "ㅋ1", 1]];
        for (var i = 0; i < T.length; i++) {
            var c = find(T[i][0]), S = c.layer(T[i][1]), D = c.layer(T[i][2]);
            var st = S.property("ADBE Text Properties").property("ADBE Text Document"), td = st.value;
            var f0 = D.property("ADBE Text Properties").property("ADBE Text Document").valueAtTime(T[i][3], false);
            w(T[i][0] + " 바꾸기 전 화면 글자: " + f0.font + " " + f0.fontSize);
            td.font = "Pretendard-Light"; td.fontSize = 60; st.setValue(td);
            var f1 = D.property("ADBE Text Properties").property("ADBE Text Document").valueAtTime(T[i][3], false);
            w(T[i][0] + " 원문을 Pretendard-Light 60으로 → 화면 글자: " + f1.font + " " + f1.fontSize);
        }
        app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        w("Test 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
