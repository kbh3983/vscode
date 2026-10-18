// 브이로그 자막 템플릿 07~12 .mogrt 내보내기 → OUT\export_XX\ (이어서 finish_mogrt.py로 "내 템플릿"에 설치 + 미리보기)
// 내보낼 때마다 컴프 참조가 무효 → 이름으로 다시 찾음, 끝난 것은 done.txt (playbook_AE변환 12장)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\브이로그예능\\템플릿\\ae";
    var IDS = ["07", "08", "09", "10", "11", "12"];
    var log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_export6.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    function byPrefix(p) { for (var k = 1; k <= app.project.numItems; k++) { var it = app.project.item(k); if (it instanceof CompItem && it.name.indexOf(p) == 0) return it; } return null; }
    try {
        app.beginSuppressDialogs();
        var f = new File(OUT + "\\vlog6.aep");
        if (!app.project || !app.project.file || app.project.file.fsName != f.fsName) app.open(f);
        for (var i = 0; i < IDS.length; i++) {
            var d = new Folder(OUT + "\\export_" + IDS[i]);
            if (new File(d.fsName + "\\done.txt").exists) { w(IDS[i] + " 이미 끝"); continue; }
            if (!d.exists) d.create();
            var c = byPrefix("브이로그_" + IDS[i] + "_");
            w(IDS[i] + " 내보내기 시작 " + c.name);
            var ok = c.exportAsMotionGraphicsTemplate(true, d.fsName);
            w(IDS[i] + " export=" + ok);
            if (ok) { var g = new File(d.fsName + "\\done.txt"); g.open("w"); g.write("ok"); g.close(); }
        }
        w("Export 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
