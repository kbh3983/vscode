// 시퀀스 전체 덤프 (회고·예시 분석용): 트랙별 클립 이름·시간·원본 in/out·비활성·미디어 경로·모션(위치·비율)·그래픽 문구
// 사용: (function(){ NAMES=["시퀀스 이름", ...]; OUT="<json 경로>"; $.evalFile("<이 파일>"); return DUMP_RESULT; })()
(function () {
    function q(x) { return '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ') + '"'; }
    function seqByName(n) { for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].name == n) return app.project.sequences[i]; return null; }
    function clipInfo(k, tr) {
        var pos = null, sc = null, fx = [], txt = [];
        for (var z = 0; z < k.components.numItems; z++) {
            var cp = k.components[z];
            if (cp.matchName == "AE.ADBE Motion") {
                var mp = cp.properties;
                for (var y = 0; y < mp.numItems; y++) { if (mp[y].displayName == "위치") pos = mp[y].getValue(); if (mp[y].displayName == "비율 조정") sc = mp[y].getValue(); }
            } else if (cp.matchName != "AE.ADBE Opacity") fx.push(cp.displayName);
        }
        try { var m = k.getMGTComponent(); if (m) for (var j = 0; j < m.properties.numItems; j++) { var v = String(m.properties[j].getValue()); var mm = v.match(/"textEditValue":"((?:[^"\\]|\\.)*)"/); if (mm) txt.push(mm[1]); } } catch (e) {}
        var path = ""; try { path = k.projectItem ? k.projectItem.getMediaPath() : ""; } catch (e) {}
        return '{"tr":' + q(tr) + ',"name":' + q(k.name) + ',"s":' + k.start.seconds + ',"e":' + k.end.seconds + ',"in":' + k.inPoint.seconds + ',"out":' + k.outPoint.seconds +
            ',"en":' + (k.disabled ? 0 : 1) + ',"path":' + q(path) + ',"pos":' + (pos ? '[' + pos[0] + ',' + pos[1] + ']' : 'null') + ',"sc":' + (sc === null ? 'null' : sc) +
            ',"fx":[' + (fx.length ? q(fx.join("|")) : '') + '],"txt":[' + (txt.length ? q(txt.join(" / ")) : '') + ']}';
    }
    var out = [];
    for (var n = 0; n < NAMES.length; n++) {
        var s = seqByName(NAMES[n]); if (!s) { out.push(q(NAMES[n]) + ':null'); continue; }
        var st = s.getSettings(), C = [];
        for (var v = 0; v < s.videoTracks.numTracks; v++) { var cs = s.videoTracks[v].clips; for (var c = 0; c < cs.numItems; c++) C.push(clipInfo(cs[c], "V" + (v + 1))); }
        for (var a = 0; a < s.audioTracks.numTracks; a++) { var cs2 = s.audioTracks[a].clips; for (var c2 = 0; c2 < cs2.numItems; c2++) { var k = cs2[c2]; C.push('{"tr":"A' + (a + 1) + '","name":' + q(k.name) + ',"s":' + k.start.seconds + ',"e":' + k.end.seconds + ',"in":' + k.inPoint.seconds + ',"out":' + k.outPoint.seconds + ',"en":' + (k.disabled ? 0 : 1) + '}'); } }
        var M = [], m = s.markers.getFirstMarker();
        while (m) { M.push('{"t":' + m.start.seconds + ',"name":' + q(m.name) + ',"c":' + q(m.comments) + '}'); m = s.markers.getNextMarker(m); }
        out.push(q(NAMES[n]) + ':{"id":' + q(s.sequenceID) + ',"w":' + st.videoFrameWidth + ',"h":' + st.videoFrameHeight + ',"end":' + (s.end / 254016000000) + ',"clips":[' + C.join(",") + '],"markers":[' + M.join(",") + ']}');
    }
    var f = new File(OUT); f.encoding = "UTF-8"; f.open("w"); f.write("{" + out.join(",") + "}"); f.close();
    DUMP_RESULT = "ok " + NAMES.length;
})();
