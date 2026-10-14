// 색보정 에이전트 — 계획값을 시퀀스에 넣기
// 사용: var SEQ_ID="<_색보정 시퀀스 ID>"; var PLAN="<..._plan.json>"; var VALS=""; (V1 클립별 값 JSON 경로, 없으면 "")
//       $.evalFile(".../apply_color.jsx"); return COLOR_RESULT;
// V2 카메라 클립 = plan.v2 (꺼진 클립 포함 전체 — 2026-10-12 사용자 지정), V1 카메라 클립은 VALS에 있는 것 = VALS[index] (batch.py 전체 모드면 V1 전체). 엔딩 영상·그래픽(V3 이상)은 건드리지 않음
// 예전 방식(보이는 맨 위만)이 필요하면 var VISIBLE_ONLY=true;
(function () {
    app.enableQE();
    function rd(p) { var f = new File(p); f.encoding = "UTF-8"; f.open("r"); var s = f.read(); f.close(); return JSON.parse(s); }
    var plan = rd(PLAN), per = VALS ? rd(VALS) : {};
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    var q = qe.project.getActiveSequence(), eff = qe.project.getVideoEffectByName("Lumetri 색상");
    function isCam(n) { return (n.indexOf("C0") == 0 || n.indexOf("20260908_B_CAM") == 0) && n.indexOf("엔딩") < 0; }
    function lum(cl) { for (var k = 0; k < cl.components.numItems; k++) if (cl.components[k].displayName == "Lumetri 색상") return cl.components[k]; return null; }
    var res = [];
    for (var T = 0; T < 2; T++) {
        var cs = seq.videoTracks[T].clips, qt = q.getVideoTrackAt(T), added = 0, set = 0, idx = -1;
        for (var j = 0; j < qt.numItems; j++) {
            var it = qt.getItemAt(j);
            if (it.type == "Empty") continue;
            idx++;
            var cl = cs[idx];
            if (!isCam(cl.name)) continue;
            // 2026-10-12부터 A캠·B캠 전체 보정 (사용자가 컷전환을 다시 바꾸므로). VISIBLE_ONLY=true면 예전처럼 꺼진 V2 건너뜀
            if (T == 1 && cl.disabled && typeof VISIBLE_ONLY != "undefined" && VISIBLE_ONLY) continue;
            if (T == 0 && !per[String(idx)]) continue;
            if (!lum(cl)) { it.addVideoEffect(eff); added++; }
            var v = T == 1 ? plan.v2 : per[String(idx)];
            var co = lum(cl);
            for (var p in v) co.properties[parseInt(p)].setValue(v[p], true);
            set++;
        }
        res.push("V" + (T + 1) + " set " + set + " (added " + added + ")");
    }
    COLOR_RESULT = seq.name + ": " + res.join(", ");
})();
