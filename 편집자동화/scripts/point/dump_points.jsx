// 포인트 에이전트 — 포인트 자막 클립 목록(트랙·시간·이름·모션) 저장 (가이드 맞추기 fit_guide.py 입력)
// 사용: var SEQ_ID="<ID>"; var TRACKS=[2,4,5,6,7]; (0부터, 소제목 트랙 제외) var OUT="<json 경로>"; var DUMP_RESULT=""; $.evalFile("<이 파일>"); return DUMP_RESULT;
// 프로필·배너 이름은 뺀다
(function () {
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    function q(x) { return '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
    var out = [];
    for (var t = 0; t < TRACKS.length; t++) {
        var v = TRACKS[t]; if (v >= s.videoTracks.numTracks) continue;
        var cs = s.videoTracks[v].clips;
        for (var c = 0; c < cs.numItems; c++) {
            var k = cs[c]; if (k.name == "프로필" || k.name.indexOf("배너") >= 0) continue;
            var pos = [0.5, 0.5], sc = 100;
            for (var z = 0; z < k.components.numItems; z++) if (k.components[z].matchName == "AE.ADBE Motion") {
                var mp = k.components[z].properties;
                for (var y = 0; y < mp.numItems; y++) { if (mp[y].displayName == "위치") pos = mp[y].getValue(); if (mp[y].displayName == "비율 조정") sc = mp[y].getValue(); }
            }
            out.push('{"v":' + v + ',"s":' + k.start.seconds + ',"e":' + k.end.seconds + ',"name":' + q(k.name) + ',"pos":[' + pos[0] + ',' + pos[1] + '],"sc":' + sc + '}');
        }
    }
    var f = new File(OUT); f.encoding = "UTF-8"; f.open("w"); f.write("[" + out.join(",") + "]"); f.close();
    DUMP_RESULT = out.length + " clips";
})();
