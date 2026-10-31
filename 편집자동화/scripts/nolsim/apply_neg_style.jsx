// 놀심 에이전트 — 부정적인 말의 포인트 자막을 '빨간 빛 붓글씨'로 바꿈 (2026-10-29, 사용자: 레퍼런스는 부정적인 단어에 39초 스타일을 씀)
// 사용: execute_extendscript code = var PLAN="<plan.json>"; var NP_RESULT=""; $.evalFile("<이 파일>"); return NP_RESULT;
// PLAN = {sequence_name, targets:[{tr(0부터), s(시작 초)}]}
// B가 아니면 같은 트랙·시간·문구로 B 템플릿을 새로 넣고(원래 클립 삭제), 템플릿 그림자를 39초 자막 값으로 맞춤.
// 두 번째 빛(그림자 효과)은 이 스크립트 뒤에 MCP apply_effect로 넣음 — 결과의 nodeId 목록 사용
(function () {
    var MGT = "/Users/bbong/Library/Application Support/Adobe/Common/Motion Graphics Templates/놀심_B_붓글씨_AE.mogrt";
    var SH = { dist: 0, soft: 46.39, op: 100, rgb: [210, 0, 0] };
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var D = JSON.parse(f.read()); f.close();
    var seq = app.project.activeSequence;
    if (!seq || seq.name != D.sequence_name) { NP_RESULT = "활성 시퀀스가 " + D.sequence_name + " 아님"; return; }
    var TPF = Number(seq.timebase);
    function comp(cl, mn) { for (var i = 0; i < cl.components.numItems; i++) if (cl.components[i].matchName == mn) return cl.components[i]; return null; }
    function find(tr, s) { var cs = seq.videoTracks[tr].clips; for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - s) < 0.02) return cs[c]; return null; }
    var out = [], ids = [];
    for (var k = 0; k < D.targets.length; k++) {
        var t = D.targets[k], cl = find(t.tr, t.s);
        if (!cl) { out.push(t.s + " 클립 없음"); continue; }
        var nm = cl.name, txt = nm.substring(nm.indexOf(" · ") + 3), was = nm.split(" · ")[0];
        if (was != "놀심_B_붓글씨") {
            var st = cl.start.ticks, en = cl.end.seconds, sec = cl.start.seconds;
            cl.remove(false, false);
            var c = seq.importMGT(MGT, String(st), t.tr, 3);
            if (!c) { out.push(t.s + " 넣기 실패 (원래 클립 삭제됨: " + nm + ")"); continue; }
            var e = new Time(); e.seconds = en; c.end = e;
            var o = new Time(); o.seconds = c.inPoint.seconds + (en - sec); c.outPoint = o;
            var m = c.getMGTComponent(), done = false;
            for (var j = 0; j < m.properties.numItems; j++) {
                var pr = m.properties[j], v = ""; try { v = pr.getValue(); } catch (x) {}
                if (typeof v == "string" && v.indexOf("textEditValue") >= 0) {
                    var js = JSON.parse(v); js.textEditValue = txt; js.fontTextRunLength = [txt.length]; js.capPropTextRunCount = 1;
                    pr.setValue(JSON.stringify(js), true); done = (JSON.parse(pr.getValue()).textEditValue == txt); break;
                }
            }
            c.name = "놀심_B_붓글씨 · " + txt;
            var mo = comp(c, "AE.ADBE Motion");   // 기존 B 자막 크기 규칙: 23자 이하 102.5% / 그보다 길면 98.43%
            if (txt.length <= 23) { mo.properties[1].setValue(102.5, true); mo.properties[0].setValue([0.5, 0.4974], true); }
            else { mo.properties[1].setValue(98.43, true); mo.properties[0].setValue([0.5, 0.51235], true); }
            cl = c; if (!done) out.push(t.s + " 문구 확인 실패");
        }
        var g = comp(cl, "AE.ADBE Capsule"), P = {};
        for (var j = 0; j < g.properties.numItems; j++) P[g.properties[j].displayName] = g.properties[j];
        P["그림자 거리"].setValue(SH.dist, true); P["그림자 부드러움"].setValue(SH.soft, true); P["그림자 진하기(%)"].setValue(SH.op, true);
        try { P["그림자 색"].setColorValue(255, SH.rgb[0], SH.rgb[1], SH.rgb[2], true); } catch (x) { P["그림자 색"].setValue(72288491479760896, true); }
        ids.push(cl.nodeId);
        out.push(cl.start.seconds.toFixed(2) + " " + was.replace("놀심_", "") + "→B " + txt + " | 그림자 " + P["그림자 거리"].getValue() + "/" + P["그림자 부드러움"].getValue().toFixed(2) + "/" + P["그림자 진하기(%)"].getValue() + "/" + P["그림자 색"].getValue() + " | " + cl.nodeId);
    }
    NP_RESULT = out.join("\n") + "\nIDS=" + ids.join(",");
})();
