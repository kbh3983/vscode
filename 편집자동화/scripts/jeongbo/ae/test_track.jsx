// 시험: 소스 텍스트 식으로 자간·행간을 슬라이더에서 받기 — 자기 값(thisProperty.style)을 쓰면 프리미어에서 바꾼 폰트·문구가 유지되는지 (저장 안 함)
(function () {
    var OUT = "C:\\DADA\\9.AI\\vscode\\편집자동화\\work\\정보성\\템플릿\\ae", log = [];
    function w(s) { log.push(s); var f = new File(OUT + "\\result_tt.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        var c = app.project.items.addComp("tt", 1920, 1080, 1, 2, 29.97);
        var L = c.layers.addText("첫 줄\r둘째 줄"); var st = L.property("ADBE Text Properties").property("ADBE Text Document"), td = st.value;
        td.font = "Pretendard-Bold"; td.fontSize = 80; td.tracking = -10; st.setValue(td);
        var N = c.layers.addNull(); N.name = "조절";
        N.property("ADBE Effect Parade").addProperty("ADBE Slider Control").name = "자간"; N.property("ADBE Effect Parade").property("자간").property(1).setValue(200);
        N.property("ADBE Effect Parade").addProperty("ADBE Slider Control").name = "행간"; N.property("ADBE Effect Parade").property("행간").property(1).setValue(150);
        var X = ['var s=thisProperty.style; s.setTracking(thisComp.layer("조절").effect("자간")(1)).setLeading(s.fontSize*thisComp.layer("조절").effect("행간")(1)/100)',
                 'style.setTracking(thisComp.layer("조절").effect("자간")(1)).setLeading(style.fontSize*thisComp.layer("조절").effect("행간")(1)/100)'];
        for (var i = 0; i < X.length; i++) {
            c.layer(2).property("ADBE Text Properties").property("ADBE Text Document").expression = X[i];
            var p = c.layer(2).property("ADBE Text Properties").property("ADBE Text Document");
            var ok = p.expressionError; var v = p.valueAtTime(1, false);
            w("식" + (i + 1) + " 오류=" + (ok || "없음") + " 자간=" + v.tracking + " 행간=" + v.leading + " 글=" + v.text.replace(/\r/g, "/") + " 폰트=" + v.font + " 크기=" + v.fontSize);
            // 값(프리미어 편집 흉내)을 바꾸면 따라가는지
            var t2 = p.value; t2.text = "바뀐 문구"; t2.fontSize = 60; t2.font = "Pretendard-Light"; p.setValue(t2);
            var v2 = p.valueAtTime(1, false); w("   값 바꾼 뒤: 글=" + v2.text + " 폰트=" + v2.font + " 크기=" + v2.fontSize + " 자간=" + v2.tracking + " 행간=" + v2.leading);
            t2 = p.value; t2.text = "첫 줄\r둘째 줄"; t2.fontSize = 80; t2.font = "Pretendard-Bold"; p.setValue(t2);
        }
        c.remove();
        w("TT 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
