// 색보정 에이전트 — 시퀀스 비디오 트랙을 video.json으로 저장 (batch.py 입력)
// 사용: var SEQ_ID="..."; var OUT="C:/.../<이름>_video.json"; $.evalFile(".../dump_video.jsx"); return DUMP_RESULT;
(function () {
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    function q(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
    var out = '{"name":' + q(seq.name) + ',"id":' + q(seq.sequenceID) + ',"end":' + seq.end / 254016000000 + ',"tracks":{';
    for (var t = 0; t < seq.videoTracks.numTracks; t++) {
        var tr = seq.videoTracks[t];
        out += (t ? ',' : '') + '"V' + (t + 1) + '":[';
        for (var c = 0; c < tr.clips.numItems; c++) {
            var k = tr.clips[c], p = "";
            try { p = k.projectItem ? k.projectItem.getMediaPath() : ""; } catch (e) {}
            out += (c ? ',' : '') + '{"name":' + q(k.name) + ',"start":' + k.start.seconds + ',"end":' + k.end.seconds +
                ',"in":' + k.inPoint.seconds + ',"path":' + q(p) + ',"disabled":' + (k.disabled ? 'true' : 'false') + '}';
        }
        out += ']';
    }
    out += '},"markers":' + seq.markers.numMarkers + '}';
    var f = new File(OUT); f.encoding = "UTF-8"; f.open("w"); f.write(out); f.close();
    DUMP_RESULT = seq.name + " -> " + OUT;
})();
