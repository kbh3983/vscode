// 회고 — 시퀀스 전체 구조를 JSON으로 저장 (클립 위치·꺼짐·효과 목록·Lumetri 숫자·모션·그래픽 문구/폰트, 오디오 클립·볼륨)
// 사용: var SEQ_ID="<ID>"; var OUT="<json 경로>"; var DUMPF_RESULT=""; $.evalFile("<이 파일>"); return DUMPF_RESULT;
(function () {
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    function q(x) { return '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"'; }
    function num(v) { return (typeof v == "number" && isFinite(v)) ? String(Math.round(v * 10000) / 10000) : null; }
    function comps(k) {
        var r = [];
        for (var z = 0; z < k.components.numItems; z++) {
            var cm = k.components[z], ps = [];
            for (var p = 0; p < cm.properties.numItems; p++) {
                var pr = cm.properties[p], v = null; try { v = pr.getValue(); } catch (e) {}
                var sv = null;
                if (typeof v == "number") sv = num(v);
                else if (v && v.length !== undefined && typeof v != "string" && v.length <= 4) { var a = []; for (var t = 0; t < v.length; t++) a.push(num(v[t])); sv = "[" + a.join(",") + "]"; }
                else if (typeof v == "string" && v.indexOf("textEditValue") >= 0) sv = q(v);
                else if (typeof v == "boolean") sv = v ? "true" : "false";
                if (sv === null) continue;
                var kf = false; try { kf = pr.isTimeVarying(); } catch (e2) {}
                ps.push('[' + p + ',' + q(pr.displayName) + ',' + sv + (kf ? ',1' : '') + ']');
            }
            r.push('{"n":' + q(cm.displayName) + ',"m":' + q(cm.matchName) + ',"p":[' + ps.join(",") + ']}');
        }
        return r.join(",");
    }
    var V = [];
    for (var v = 0; v < s.videoTracks.numTracks; v++) {
        var tr = s.videoTracks[v], cs = tr.clips, L = [];
        for (var c = 0; c < cs.numItems; c++) {
            var k = cs[c], path = ""; try { path = k.projectItem ? k.projectItem.getMediaPath() : ""; } catch (e) {}
            L.push('{"s":' + k.start.seconds + ',"e":' + k.end.seconds + ',"in":' + k.inPoint.seconds + ',"name":' + q(k.name) + ',"path":' + q(path) + ',"off":' + (k.disabled ? 1 : 0) + ',"c":[' + comps(k) + ']}');
        }
        V.push('{"muted":' + (tr.isMuted() ? 1 : 0) + ',"clips":[' + L.join(",") + ']}');
    }
    var A = [];
    for (var a2 = 0; a2 < s.audioTracks.numTracks; a2++) {
        var at = s.audioTracks[a2], ac = at.clips, L2 = [];
        for (var c2 = 0; c2 < ac.numItems; c2++) { var k2 = ac[c2]; L2.push('{"s":' + k2.start.seconds + ',"e":' + k2.end.seconds + ',"in":' + k2.inPoint.seconds + ',"name":' + q(k2.name) + ',"off":' + (k2.disabled ? 1 : 0) + ',"c":[' + comps(k2) + ']}'); }
        A.push('{"muted":' + (at.isMuted() ? 1 : 0) + ',"clips":[' + L2.join(",") + ']}');
    }
    var M = [], m = s.markers.getFirstMarker();
    while (m) { M.push('{"s":' + m.start.seconds + ',"e":' + m.end.seconds + ',"name":' + q(m.name) + ',"c":' + q(m.comments) + '}'); m = s.markers.getNextMarker(m); }
    var f = new File(OUT); f.encoding = "UTF-8"; f.open("w");
    f.write('{"name":' + q(s.name) + ',"id":' + q(s.sequenceID) + ',"end":' + (s.end / 254016000000) + ',"video":[' + V.join(",") + '],"audio":[' + A.join(",") + '],"markers":[' + M.join(",") + ']}');
    f.close();
    DUMPF_RESULT = s.name + " -> " + OUT;
})();
