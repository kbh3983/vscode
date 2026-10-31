// 바탕 클립의 비율(크기) 키프레임을 위에 겹친 클립들에 같은 시퀀스 시간·값으로 복사 — 2026-10-23
// (사용자가 바탕에만 줌을 걸면 화살표·글씨가 어긋남). 키 사이 값은 선형으로 계산. 기준점·위치는 바탕과 같아야 함(모두 0.5,0.5)
// 사용: var SEQ_ID="..", BASE_KEY="책상_바탕", TARGET_KEYS=["책상_파란화살표","학생필기_파란글씨"], T0=500, T1=520; $.evalFile(이 파일)
(function () {
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    function find(key) { for (var v = 0; v < s.videoTracks.numTracks; v++) { var t = s.videoTracks[v]; for (var c = 0; c < t.clips.numItems; c++) { var k = t.clips[c]; if (k.name.indexOf(key) >= 0 && k.end.seconds > T0 && k.start.seconds < T1) return k; } } return null; }
    function scaleProp(it) { for (var q = 0; q < it.components.numItems; q++) { var cp = it.components[q]; if (cp.matchName == "AE.ADBE Motion") for (var p = 0; p < cp.properties.numItems; p++) if (cp.properties[p].displayName == "비율 조정" || cp.properties[p].displayName == "Scale") return cp.properties[p]; } }
    var base = find(BASE_KEY); if (!base) { COPY_RESULT = "바탕 없음"; return; }
    var bs = scaleProp(base);
    var keys = [];                                    // [시퀀스 시간, 값]
    if (bs.isTimeVarying()) { var ks = bs.getKeys(); for (var j = 0; j < ks.length; j++) keys.push([base.start.seconds + (ks[j].seconds - base.inPoint.seconds), bs.getValueAtKey(ks[j])]); }
    else keys.push([base.start.seconds, bs.getValue()]);
    function valAt(T) {
        if (T <= keys[0][0]) return keys[0][1];
        for (var j = 1; j < keys.length; j++) if (T <= keys[j][0]) { var a = keys[j - 1], b = keys[j]; return a[1] + (b[1] - a[1]) * (T - a[0]) / (b[0] - a[0]); }
        return keys[keys.length - 1][1];
    }
    var out = ["바탕 키 " + keys.length + " (" + keys[0][0].toFixed(3) + ":" + keys[0][1] + " → " + keys[keys.length - 1][0].toFixed(3) + ":" + keys[keys.length - 1][1] + ")"];
    for (var n = 0; n < TARGET_KEYS.length; n++) {
        var it = find(TARGET_KEYS[n]); if (!it) { out.push(TARGET_KEYS[n] + " 없음"); continue; }
        var sp = scaleProp(it); sp.setTimeVarying(false); sp.setValue(valAt(it.start.seconds), true); sp.setTimeVarying(true);
        var times = [it.start.seconds];
        for (var j2 = 0; j2 < keys.length; j2++) if (keys[j2][0] > it.start.seconds && keys[j2][0] <= it.end.seconds) times.push(keys[j2][0]);
        if (keys[keys.length - 1][0] > it.end.seconds) times.push(it.end.seconds);
        for (var m = 0; m < times.length; m++) { var x = new Time(); x.seconds = it.inPoint.seconds + (times[m] - it.start.seconds); sp.addKey(x); sp.setValueAtKey(x, valAt(times[m]), true); }
        out.push(it.name + " 키 " + sp.getKeys().length + " " + valAt(times[0]).toFixed(2) + "→" + valAt(times[times.length - 1]).toFixed(2));
    }
    COPY_RESULT = out.join(" | ");
})();
