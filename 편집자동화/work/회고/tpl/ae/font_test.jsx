(function () {
    var out = [];
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        app.newProject();
        var comp = app.project.items.addComp("t", 1920, 1080, 1, 1, 29.97);
        var F = ["GmarketSansBold", "Pretendard-Regular", "Pretendard-SemiBold", "GangwonEduAllBold", "Paperlogy-6SemiBold", "NanumMyeongjoExtraBold"];
        for (var i = 0; i < F.length; i++) {
            var L = comp.layers.addText("테스트 가나다 Tip!");
            var st = L.property("ADBE Text Properties").property("ADBE Text Document"); var td = st.value;
            td.font = F[i]; td.fontSize = 80; st.setValue(td);
            var r = L.sourceRectAtTime(0, false);
            out.push(F[i] + " -> " + st.value.font + " h=" + Math.round(r.height) + " w=" + Math.round(r.width));
        }
    } catch (e) { out.push("ERR " + e.message); }
    var f = new File("C:/DADA/9.AI/vscode/편집자동화/work/회고/tpl/ae/font_result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(out.join("\n")); f.close();
})();
