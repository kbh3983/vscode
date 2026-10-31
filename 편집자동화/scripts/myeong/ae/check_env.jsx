// 명강의모음 AE판 — AE 환경 확인 (버전, 필요한 폰트가 AE에서 보이는지)
(function () {
    var OUT = "/Users/bbong/dada/vscode/편집자동화/work/명강의모음/ae_templates/ae_env.txt";
    var r = ["AE " + app.version];
    var want = ["esamanruOTFLight", "esamanruOTFMedium", "SDNemonyTTF-aBasic", "SDMyeongjoNeoa-gExBd"];
    for (var i = 0; i < want.length; i++) {
        var ok = "?";
        try { var f = app.fonts.getFontsByPostScriptName(want[i]); ok = f && f.length ? f[0].familyName + " / " + f[0].styleName : "없음"; } catch (e) { ok = "err " + e; }
        r.push(want[i] + ": " + ok);
    }
    var f = new File(OUT); f.encoding = "UTF-8"; f.open("w"); f.write(r.join("\n")); f.close();
})();
