// 놀심 에이전트 — 포인트 자막 배치 (2026-10-28)
// 사용: execute_extendscript code =
//   var PLAN="<plan.json>"; var STEP="place"|"hide"|"punch"; var FROM=0; var TO=25; var NP_RESULT=""; $.evalFile("<이 파일>"); return NP_RESULT;
// place : 포인트 자막 V6(index 5)·PD 사선 V7(index 6)에 놀심 AE 템플릿을 넣고 문구·끝 시간 (FROM~TO 번째 항목)
// hide  : 포인트 자막·사선 동안 기본 자막(V2 그래픽)을 자르고 끔 (criteria: 강조 자막 동안 기본 자막 뺌)
// punch : punch=1인 항목 구간의 V1을 잘라 113.5%·얼굴 쪽 위치 (criteria: 펀치인은 포인트 자막과 같은 프레임)
// ExtendScript ES3: map/forEach 쓰지 않음
(function () {
    var MGT = "/Users/bbong/Library/Application Support/Adobe/Common/Motion Graphics Templates/";
    var TPL = { A: "놀심_A_흰고딕_AE", B: "놀심_B_붓글씨_AE", D: "놀심_D_노란빛_AE", E: "놀심_E_노랑박스_AE", E2: "놀심_E2_연두박스_AE", H: "놀심_H_PD사선_AE" };
    var VT_POINT = (typeof VTP == "number") ? VTP : 5, VT_H = (typeof VTH == "number") ? VTH : 6, AT = 3, SUB_TRACK = 1;   // 2026-10-28 사용자가 V4·V5로 옮김 → VTP=3, VTH=4로 부름
    var PUNCH_SCALE = 113.5, PUNCH_POS = [0.5113, 0.5287];   // 얼굴 (800,310)이 제자리에 남는 위치
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var plan = JSON.parse(f.read()); f.close();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == plan.sequence_id) seq = app.project.sequences[i];
    if (!seq) { NP_RESULT = "시퀀스 없음"; return; }
    app.project.activeSequence = seq;
    var TPF = Number(seq.timebase), TPS = 254016000000;
    function ticks(sec) { return Math.round(sec * TPS / TPF) * TPF; }
    function tm(sec) { var t = new Time(); t.ticks = String(ticks(sec)); return t; }
    function tc(sec) { return tm(sec).getFormatted(seq.getSettings().videoFrameRate, seq.getSettings().videoDisplayFormat); }
    var P = plan.points, out = [];

    if (STEP == "place") {
        var ok = 0, bad = [];
        for (var k = FROM; k < Math.min(TO, P.length); k++) {
            var p = P[k], vt = (p.type == "H") ? VT_H : VT_POINT;
            var c = seq.importMGT(MGT + TPL[p.type] + ".mogrt", String(ticks(p.s)), vt, AT);
            if (!c) { bad.push(k + " 넣기 실패"); continue; }
            c.end = tm(p.e);
            var o = new Time(); o.seconds = c.inPoint.seconds + (p.e - p.s); c.outPoint = o;   // 끝을 늘릴 수 있게 (포인트 apply_point.jsx와 같음)
            var m = c.getMGTComponent(), done = false;
            for (var j = 0; j < m.properties.numItems; j++) {
                var pr = m.properties[j], v = ""; try { v = pr.getValue(); } catch (e) {}
                if (typeof v == "string" && v.indexOf("textEditValue") >= 0) {
                    var js = JSON.parse(v); js.textEditValue = p.text; js.fontTextRunLength = [p.text.length]; js.capPropTextRunCount = 1;
                    pr.setValue(JSON.stringify(js), true); done = (JSON.parse(pr.getValue()).textEditValue == p.text); break;
                }
            }
            c.name = TPL[p.type].replace("_AE", "") + " · " + p.text;
            if (done) ok++; else bad.push(k + " 문구 실패");
        }
        out.push("place " + FROM + "~" + (Math.min(TO, P.length) - 1) + ": ok " + ok + (bad.length ? " / " + bad.join(", ") : ""));
    }
    if (STEP == "hide" || STEP == "punch") {
        app.enableQE();
        var q = qe.project.getActiveSequence();
        var tr = (STEP == "hide") ? SUB_TRACK : 0;
        var R = [];
        for (var k = 0; k < P.length; k++) if (STEP == "hide" || P[k].punch) R.push([P[k].s, P[k].e]);
        var qt = q.getVideoTrackAt(tr);
        for (var k = 0; k < R.length; k++) { qt.razor(tc(R[k][0])); qt.razor(tc(R[k][1])); }
        var cs = seq.videoTracks[tr].clips, n = 0, partial = 0;
        function inside(a, b) {
            for (var r = 0; r < R.length; r++) {
                var s = ticks(R[r][0]), e = ticks(R[r][1]);
                if (a >= s - TPF / 2 && b <= e + TPF / 2) return 1;
            }
            return 0;
        }
        for (var c = 0; c < cs.numItems; c++) {
            var cl = cs[c], a = Number(cl.start.ticks), b = Number(cl.end.ticks);
            if (!inside(a, b)) continue;
            if (STEP == "hide") { cl.disabled = true; n++; }
            else {
                var mo = null;
                for (var j = 0; j < cl.components.numItems; j++) if (cl.components[j].matchName == "AE.ADBE Motion") mo = cl.components[j];
                mo.properties[1].setValue(PUNCH_SCALE, true); mo.properties[0].setValue(PUNCH_POS, true); n++;
            }
        }
        out.push(STEP + ": 구간 " + R.length + ", 바꾼 클립 " + n);
    }
    NP_RESULT = out.join(" | ");
})();
