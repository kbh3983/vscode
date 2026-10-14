// 포인트 에이전트 — 비교 시퀀스에 원본(V1)·AE(V2) 짝을 시간 순서로 놓기 (사용자 확인용)
// 사용: var SEQ_ID="<ID>"; var PAIRS=[[원본이름, 문구, 길이], ...]; var START=<초>; var GAP=<초>; [var ONLY_AE=true; var OFFSET_Y=-0.25;] var LR_RESULT=""; $.evalFile("<이 파일>")
// ONLY_AE: V2(AE)만 다시 놓기, OFFSET_Y: V2를 위로 올리기(모션 위치, 화면 비율) — 원본과 위아래로 같이 보이게
(function () {
    var D = "C:\\Users\\bbong\\AppData\\Roaming\\Adobe\\Common\\Motion Graphics Templates\\";
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    var tpf = Number(seq.timebase), out = [];
    for (var k = 0; k < PAIRS.length; k++) {
        var S = START + k * GAP, t = new Time();
        t.ticks = String(Math.round(S * 254016000000 / tpf) * tpf);
        for (var v = (typeof ONLY_AE != "undefined" && ONLY_AE) ? 1 : 0; v < 2; v++) {
            var path = D + PAIRS[k][0] + (v ? "_AE" : "") + ".mogrt";
            seq.importMGT(path, t.ticks, v, seq.audioTracks.numTracks - 1);
            var cs = seq.videoTracks[v].clips, B = null;
            for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - t.seconds) < 0.02) B = cs[c];
            if (!B) { out.push(PAIRS[k][0] + " V" + (v + 1) + " 실패"); continue; }
            var e = new Time(); e.seconds = t.seconds + PAIRS[k][2]; B.end = e;
            if (v && typeof OFFSET_Y == "number") for (var q = 0; q < B.components.numItems; q++) {
                var co = B.components[q];
                if (co.displayName == "모션") for (var u = 0; u < co.properties.numItems; u++) { var pp = co.properties[u]; if (pp.displayName == "위치") { var pv = pp.getValue(); pp.setValue([pv[0], pv[1] + OFFSET_Y], true); } }
            }
            var m = B.getMGTComponent();
            if (m && v) for (var p = 0; p < m.properties.numItems; p++) {
                var pr = m.properties[p], s = String(pr.getValue());
                if (s.indexOf("textEditValue") >= 0) { var j = JSON.parse(s); j.textEditValue = PAIRS[k][1]; j.fontEditValue = ["Paperlogy-7Bold"]; pr.setValue(JSON.stringify(j), true); }
            }
        }
        var mk = seq.markers.createMarker(t.seconds); mk.name = PAIRS[k][0]; mk.comments = "V1 원본 / V2 AE"; mk.end = t.seconds + PAIRS[k][2];
        out.push(PAIRS[k][0] + " @" + t.seconds.toFixed(2));
    }
    LR_RESULT = out.join(" | ");
})();
