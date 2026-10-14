// 색보정 에이전트 — V1 클립별 값 넣기. 사용: var SEQ_ID="..."; var TXT="<index|14|15|16|19|22|24 줄>"; $.evalFile(...); return V1_RESULT;
(function () {
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    var f = new File(TXT); f.encoding = "UTF-8"; f.open("r"); var L = f.read().split("\n"); f.close();
    var cs = seq.videoTracks[0].clips, P = [14, 15, 16, 19, 22, 24], n = 0;
    for (var i = 0; i < L.length; i++) {
        var a = L[i].split("|"); if (a.length < 7) continue;
        var cl = cs[parseInt(a[0])], co = null;
        for (var k = 0; k < cl.components.numItems; k++) if (cl.components[k].displayName == "Lumetri 색상") co = cl.components[k];
        for (var p = 0; p < P.length; p++) co.properties[P[p]].setValue(parseFloat(a[p + 1]), true);
        n++;
    }
    V1_RESULT = seq.name + " V1 set " + n;
})();
