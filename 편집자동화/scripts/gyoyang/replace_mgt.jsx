// 시퀀스에 올라간 그래픽 클립을 새로 설치한 템플릿으로 바꿔 넣는다 — 문구·조절 값·모션·불투명도·시작·끝 그대로 (2026-10-18)
// 템플릿을 고쳐도 이미 올라간 클립은 안 바뀜 → 이 스크립트로 교체 (교양 learnings "새로 넣고 값 옮기기")
// 사용: (function(){ TRACK=5; MAP={"클립 이름":"템플릿 파일 이름(.mogrt 없이)"}; AS_RESULT=""; $.evalFile("<이 파일>"); return AS_RESULT; })()
//   TRACK = 1부터. 그 트랙에서 MAP에 있는 클립을 모두 먼저 빼고 시간 순서대로 다시 넣음
//   (importMGT는 10초짜리로 들어가 같은 트랙 뒤 클립을 덮으므로 — 2026-10-17 함정)
// 그래픽 매개변수 외 효과가 붙은 클립은 건너뜀 (옮기지 못하는 값이 생기므로)
(function () {
    var s = app.project.activeSequence, V = s.videoTracks[TRACK - 1], log = [], recs = [];
    var MD = "C:/Users/bbong/AppData/Roaming/Adobe/Common/Motion Graphics Templates/";
    function comp(cl, mn) { for (var k = 0; k < cl.components.numItems; k++) if (cl.components[k].matchName == mn) return cl.components[k]; return null; }
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    for (var c = 0; c < V.clips.numItems; c++) {
        var cl = V.clips[c];
        if (!MAP.hasOwnProperty(cl.name)) continue;
        if (cl.components.numItems > 3) { log.push("건너뜀(효과 있음) " + cl.name); continue; }
        var m = cl.getMGTComponent(), vals = {}, cols = {};
        for (var p = 0; p < m.properties.numItems; p++) {
            var pr = m.properties[p], nm = pr.displayName;
            try { cols[nm] = pr.getColorValue(); continue; } catch (e) {}
            try { vals[nm] = pr.getValue(); } catch (e) {}
        }
        var mo = comp(cl, "AE.ADBE Motion"), op = comp(cl, "AE.ADBE Opacity"), mv = [];
        for (var p = 0; p < mo.properties.numItems; p++) { try { mv.push(mo.properties[p].getValue()); } catch (e) { mv.push(null); } }
        recs.push({ name: cl.name, t: MAP[cl.name], s: cl.start.seconds, e: cl.end.seconds, vals: vals, cols: cols, mv: mv, op: op.properties[0].getValue(), keys: op.properties[0].isTimeVarying() || mo.properties[0].isTimeVarying() || mo.properties[1].isTimeVarying() });
    }
    for (var i = 0; i < recs.length; i++) if (recs[i].keys) { AS_RESULT = "중단: 키프레임 있는 클립 " + recs[i].name; return; }
    // 빼기 (뒤에서부터)
    for (var c = V.clips.numItems - 1; c >= 0; c--) { var cl = V.clips[c]; for (var i = 0; i < recs.length; i++) if (cl.name == recs[i].name && Math.abs(cl.start.seconds - recs[i].s) < 0.01) { cl.remove(false, false); break; } }
    recs.sort(function (a, b) { return a.s - b.s; });
    for (var i = 0; i < recs.length; i++) {
        var R = recs[i];
        var it = s.importMGT(MD + R.t + ".mogrt", T(R.s).ticks, TRACK - 1, s.audioTracks.numTracks - 1);
        if (!it) { log.push("실패 " + R.name); continue; }
        it.end = T(R.e); it.name = R.name;
        var n = it.getMGTComponent(), cnt = 0, nw = [];
        for (var p = 0; p < n.properties.numItems; p++) {
            var pr = n.properties[p], nm = pr.displayName;
            if (R.cols.hasOwnProperty(nm)) { var C = R.cols[nm]; pr.setColorValue(C[0], C[1], C[2], C[3], true); cnt++; }
            else if (R.vals.hasOwnProperty(nm)) { pr.setValue(R.vals[nm], true); cnt++; }
            else nw.push(nm);
        }
        var mo = comp(it, "AE.ADBE Motion");
        for (var p = 0; p < mo.properties.numItems && p < R.mv.length; p++) if (R.mv[p] !== null) { try { mo.properties[p].setValue(R.mv[p], true); } catch (e) {} }
        comp(it, "AE.ADBE Opacity").properties[0].setValue(R.op, true);
        log.push(R.name + " " + R.s.toFixed(2) + " 옮김" + cnt + " 새칸" + nw.length);
    }
    app.project.save();
    AS_RESULT = "V" + TRACK + " | " + log.join("; ");
})();
