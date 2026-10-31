// 터틀볼 원리 그림 3장(V2 바탕 · V3 파란 화살표 · V4 파란 글씨)에 같은 줌인 — 2026-10-23
// 조정 레이어 없이 세 클립의 모션에 같은 줌을 곱함: 화면 점 x → P + z(t)(x − P)
//   클립마다 지금 모션(위치 p(t), 비율 s(t), 기준점 그대로)을 0.1초 간격으로 읽어
//   위치' = P + z(p − P), 비율' = z·s 로 다시 키프레임 → 사용자가 고친 타이밍·모션 유지
// 줌 구간 = 바탕 클립 시작~끝. 정지 이미지는 out = in + 길이 먼저 맞춤
(function () {
    var SEQ = "93fc6463-bc45-49d3-b244-07620aaa616d", Z = 1.08, STEP = 0.1;
    var P = [1000 / 1920, 200 / 1080];      // 줌 중심: 위쪽 (V5 제목 바에 빨간 화살표가 닿지 않게, 10-23 600 → 200)
    var UNDO = (typeof ZOOM_UNDO_P != "undefined") ? ZOOM_UNDO_P : null;
    var NONE = (typeof ZOOM_NONE != "undefined") && ZOOM_NONE;   // true + ZOOM_UNDO_P = 줌 지우기 (10-23 사용자: "효과 지워줘")   // 이미 걸린 줌(그 중심)을 먼저 되돌릴 때
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ) s = app.project.sequences[i];
    function find(v, key) { var t = s.videoTracks[v]; for (var c = 0; c < t.clips.numItems; c++) { var k = t.clips[c]; if (k.end.seconds > 477 && k.start.seconds < 490 && k.name.indexOf(key) >= 0) return k; } return null; }
    function motion(it) { for (var k = 0; k < it.components.numItems; k++) if (it.components[k].matchName == "AE.ADBE Motion") return it.components[k]; }
    function prop(cp, names) { for (var p = 0; p < cp.properties.numItems; p++) for (var n = 0; n < names.length; n++) if (cp.properties[p].displayName == names[n]) return cp.properties[p]; return null; }
    function ct(it, t) { var x = new Time(); x.seconds = it.inPoint.seconds + (t - it.start.seconds); return x; }
    function val(pr, it, t) { return pr.isTimeVarying() ? pr.getValueAtTime(ct(it, t)) : pr.getValue(); }
    function fixOut(it) { var o = new Time(); o.seconds = it.inPoint.seconds + (it.end.seconds - it.start.seconds); it.outPoint = o; }

    var base = find(1, "터틀볼"), ar = find(2, "파란화살표"), lb = find(3, "파란글씨");
    if (!base || !ar || !lb) { ZOOM_RESULT = "클립 없음 " + !!base + !!ar + !!lb; return; }
    var T0 = base.start.seconds, T1 = base.end.seconds;
    function z(t) { return 1 + (Z - 1) * Math.max(0, Math.min(1, (t - T0) / (T1 - T0))); }
    var out = ["줌 " + T0.toFixed(3) + "~" + T1.toFixed(3) + " ×" + Z];
    var list = [[base, "바탕"], [ar, "화살표"], [lb, "글씨"]];
    for (var n = 0; n < list.length; n++) {
        var it = list[n][0]; fixOut(it);
        var m = motion(it), po = prop(m, ["위치", "Position"]), sc = prop(m, ["비율 조정", "Scale"]);
        if (sc.isTimeVarying() && sc.getKeys() && sc.getKeys().length > 0 && list[n][2]) {}
        // 읽을 시간: 0.1초 간격 + 기존 키 시간
        var ts = [], a = it.start.seconds, b = it.end.seconds;
        for (var t = a; t < b - 0.001; t += STEP) ts.push(t);
        ts.push(b - 1 / 30);
        var pr2 = [po, sc];
        for (var w = 0; w < 2; w++) if (pr2[w].isTimeVarying()) { var ks = pr2[w].getKeys(); for (var q = 0; q < ks.length; q++) { var tt = ks[q].seconds - it.inPoint.seconds + a; if (tt >= a && tt <= b) ts.push(tt); } }
        ts.sort(function (x, y) { return x - y; });
        var rows = [], last = -9;
        for (var q2 = 0; q2 < ts.length; q2++) { if (ts[q2] - last < 0.02) continue; last = ts[q2]; rows.push([ts[q2], val(po, it, ts[q2]), val(sc, it, ts[q2])]); }
        po.setTimeVarying(false); sc.setTimeVarying(false); po.setTimeVarying(true); sc.setTimeVarying(true);
        for (var r = 0; r < rows.length; r++) {
            var tr = rows[r][0], p = rows[r][1], sv = rows[r][2], zz = z(tr), x = ct(it, tr);
            if (UNDO) { p = [UNDO[0] + (p[0] - UNDO[0]) / zz, UNDO[1] + (p[1] - UNDO[1]) / zz]; sv = sv / zz; rows[r][2] = sv; }
            if (NONE) zz = 1;   // 줌 빼기만 (되돌린 값 그대로)
            po.addKey(x); po.setValueAtKey(x, [P[0] + zz * (p[0] - P[0]), P[1] + zz * (p[1] - P[1])], true);
            sc.addKey(x); sc.setValueAtKey(x, sv * zz, true);
        }
        out.push(list[n][1] + " " + a.toFixed(3) + "~" + b.toFixed(3) + " 키 " + rows.length + " 첫 비율 " + (rows[0][2] * (NONE ? 1 : z(rows[0][0]))).toFixed(1) + " 끝 비율 " + (rows[rows.length - 1][2] * (NONE ? 1 : z(rows[rows.length - 1][0]))).toFixed(1));
    }
    ZOOM_RESULT = out.join(" | ");
})();
