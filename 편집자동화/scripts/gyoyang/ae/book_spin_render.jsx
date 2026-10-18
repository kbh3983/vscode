// book_spin.jsx 로 만든 "책_한바퀴" 컴프를 PNG 연속(알파)으로 (모션 블러 포함)
(function () {
    var D = "C:/DADA/9.AI/vscode/편집자동화/work/지식인사이드/테스트/book_spin/";
    var C = null; for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem && app.project.item(i).name == "책_한바퀴") C = app.project.item(i);
    var n = Math.round(C.duration * C.frameRate);
    for (var f = 0; f < n; f++) C.saveFrameToPng(f * C.frameDuration, new File(D + "seq/f_" + ("000" + f).slice(-4) + ".png"));
    $.sleep(8000);
    var r = new File(D + "render_done.txt"); r.open("w"); r.write("RENDER 끝 " + n); r.close();
})();
