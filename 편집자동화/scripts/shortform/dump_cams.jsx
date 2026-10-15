// 숏폼 에이전트 — 롱폼 숏폼소스의 카메라 클립 목록 (샷사이즈 회고용)
// 사용: (function(){ OUT="<json>"; $.evalFile("<이 파일>"); return DC_RESULT; })()
// V1 = B캠(20260908_B_C…), V2 = A캠(C00xx.MP4) — V2가 위라 켜진 V2 클립이 있으면 A캠이 보임
(function () {
    var P = app.project, R = {};
    function motion(k) { var r = { sc: 100, pos: [0.5, 0.5] }; for (var z = 0; z < k.components.numItems; z++) if (k.components[z].matchName == "AE.ADBE Motion") { var mp = k.components[z].properties; for (var y = 0; y < mp.numItems; y++) { try { if (mp[y].displayName == "비율 조정") r.sc = mp[y].getValue(); if (mp[y].displayName == "위치") r.pos = mp[y].getValue(); if (mp[y].displayName == "비율 조정") r.kf = mp[y].isTimeVarying(); } catch (e) {} } } return r; }
    for (var i = 0; i < P.sequences.numSequences; i++) {
        var s = P.sequences[i]; if (s.name.indexOf("_숏폼소스") < 0) continue;
        var T = [];
        for (var v = 0; v < 2; v++) {
            var cs = s.videoTracks[v].clips;
            for (var c = 0; c < cs.numItems; c++) { var k = cs[c], m = motion(k); var mp = ""; try { mp = k.projectItem.getMediaPath(); } catch (e) {}
                T.push({ v: v + 1, s: k.start.seconds, e: k.end.seconds, inp: k.inPoint.seconds, on: !k.disabled, name: k.name, path: mp, sc: m.sc, pos: m.pos, kf: !!m.kf }); }
        }
        R[s.name.replace("_숏폼소스", "")] = T;
    }
    var f = new File(OUT); f.encoding = "UTF-8"; f.open("w"); f.write(JSON.stringify(R)); f.close();
    DC_RESULT = "ok";
})();
