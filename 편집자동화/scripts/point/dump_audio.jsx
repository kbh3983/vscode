// 포인트 에이전트 — 말소리 오디오 트랙 클립 목록(원본 파일·원본 시작·시퀀스 위치) 저장 (cue_words.py 입력)
// 사용: var SEQ_ID="<ID>"; var TRACK=<오디오 트랙 index, 보통 0 = A1>; var OUT="<json 경로>"; var DUMPA_RESULT=""; $.evalFile("<이 파일>"); return DUMPA_RESULT;
(function () {
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    function q(x) { return '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
    var cs = s.audioTracks[TRACK].clips, out = [];
    for (var c = 0; c < cs.numItems; c++) {
        var k = cs[c], path = "";
        try { path = k.projectItem.getMediaPath(); } catch (e) {}
        if (!path) continue;
        out.push('{"s":' + k.start.seconds + ',"e":' + k.end.seconds + ',"in":' + k.inPoint.seconds + ',"path":' + q(path) + '}');
    }
    var f = new File(OUT); f.encoding = "UTF-8"; f.open("w"); f.write("[" + out.join(",") + "]"); f.close();
    DUMPA_RESULT = out.length + " clips";
})();
