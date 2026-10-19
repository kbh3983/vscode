// 확인용: AE에 설치된 폰트 중 이름에 찾는 말이 들어간 것의 PostScript 이름 (저장 안 함)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\정보성\\템플릿\\ae", log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_fonts.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        var keys = ["HY", "헤드라인", "HeadLine", "Headline", "에이투지", "A2Z", "a2z"];
        var all = app.fonts.allFonts;
        for (var i = 0; i < all.length; i++) {
            for (var j = 0; j < all[i].length; j++) {
                var F = all[i][j], s = F.familyName + " / " + F.styleName + " / " + F.postScriptName;
                for (var k = 0; k < keys.length; k++) if (s.indexOf(keys[k]) >= 0) { w(s); break; }
            }
        }
        w("FONT 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
