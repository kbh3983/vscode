// 숏폼 에이전트 — <숏폼>_텍스트2 를 복제해 <숏폼>_샷 을 만들고 V1을 샷사이즈 조각으로 다시 놓기 (rebuild_v1.jsx)
// 사용: (function(){ NAMES=["목교정기_숏폼2", …]; LONGS={"목교정기_숏폼2":"목교정기", …}; PARTS_DIR="<parts 폴더>"; RV_FILE="<rebuild_v1.jsx>"; SA_RESULT=""; $.evalFile("<이 파일>"); return SA_RESULT; })()
(function () {
    var P = app.project, out = [];
    for (var n = 0; n < NAMES.length; n++) {
        var nm = NAMES[n] + "_샷", src = null, done = false;
        for (var i = 0; i < P.sequences.numSequences; i++) { if (P.sequences[i].name == nm) done = true; if (P.sequences[i].name == NAMES[n] + "_텍스트2") src = P.sequences[i]; }
        if (done) { out.push("이미 있음 " + nm); continue; }
        var b = {}; for (var i = 0; i < P.sequences.numSequences; i++) b[P.sequences[i].sequenceID] = 1;
        src.clone(); var s = null; for (var i = 0; i < P.sequences.numSequences; i++) if (!b[P.sequences[i].sequenceID]) s = P.sequences[i];
        s.name = nm;
        SEQ_NAME = nm; SRC_NAME = LONGS[NAMES[n]] + "_숏폼소스_샷"; PARTS = PARTS_DIR + "/" + NAMES[n] + ".json"; RV_RESULT = "";
        $.evalFile(RV_FILE);
        out.push(RV_RESULT);
    }
    SA_RESULT = out.join("\n");
})();
