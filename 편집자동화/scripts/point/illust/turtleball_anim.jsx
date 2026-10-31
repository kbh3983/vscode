// 파란 화살표(V3)·파란 글씨(V4) 끝 맞추기 + 등장 키프레임
(function () {
    var SEQ = "93fc6463-bc45-49d3-b244-07620aaa616d", END = 486.786;
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ) s = app.project.sequences[i];
    function find(v, key) { var t = s.videoTracks[v]; for (var c = 0; c < t.clips.numItems; c++) if (t.clips[c].name.indexOf(key) >= 0) return t.clips[c]; return null; }
    function comp(it, mn) { for (var k = 0; k < it.components.numItems; k++) if (it.components[k].matchName == mn) return it.components[k]; return null; }
    function prop(cp, names) { for (var p = 0; p < cp.properties.numItems; p++) for (var n = 0; n < names.length; n++) if (cp.properties[p].displayName == names[n]) return cp.properties[p]; return null; }
    function keys(pr, it, list) {   // list: [[초(클립 시작 기준), 값], ...]
        pr.setTimeVarying(true);
        for (var q = 0; q < list.length; q++) {
            var t = new Time(); t.seconds = it.inPoint.seconds + list[q][0];
            pr.addKey(t); pr.setValueAtKey(t, list[q][1], true);
        }
        return pr.getKeys() ? pr.getKeys().length : 0;
    }
    var out = [];
    var ar = find(2, "파란화살표"), lb = find(3, "파란글씨");
    if (!ar || !lb) { ANIM_RESULT = "클립 없음"; return; }
    var e = new Time(); e.seconds = END; ar.end = e; lb.end = e;

    var oA = prop(comp(ar, "AE.ADBE Opacity"), ["불투명도", "Opacity"]);
    var mA = comp(ar, "AE.ADBE Motion"), pA = prop(mA, ["위치", "Position"]);
    out.push("화살표 불투명 키 " + keys(oA, ar, [[0, 0], [0.5, 100]]));
    out.push("화살표 위치 키 " + keys(pA, ar, [[0, [0.5 + 40 / 1920, 0.5]], [0.5, [0.5, 0.5]]]));

    var C = [1265.5 / 1920, 795.5 / 1080];   // 글씨 상자 가운데 (그림 좌표)
    var oL = prop(comp(lb, "AE.ADBE Opacity"), ["불투명도", "Opacity"]);
    var mL = comp(lb, "AE.ADBE Motion");
    prop(mL, ["기준점", "Anchor Point"]).setValue(C, true);
    prop(mL, ["위치", "Position"]).setValue(C, true);
    out.push("글씨 불투명 키 " + keys(oL, lb, [[0, 0], [0.4, 100]]));
    out.push("글씨 비율 키 " + keys(prop(mL, ["비율 조정", "Scale"]), lb, [[0, 80], [0.33, 105], [0.5, 100]]));
    out.push("화살표 " + ar.start.seconds.toFixed(3) + "~" + ar.end.seconds.toFixed(3) + " in " + ar.inPoint.seconds.toFixed(3));
    out.push("글씨 " + lb.start.seconds.toFixed(3) + "~" + lb.end.seconds.toFixed(3) + " in " + lb.inPoint.seconds.toFixed(3));
    ANIM_RESULT = out.join(" | ");
})();
