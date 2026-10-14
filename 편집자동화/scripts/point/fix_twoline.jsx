// 포인트 에이전트 — 윗줄/아랫줄 두 줄 템플릿(PYNPA 강조말 등)에 문구를 반씩 나눠 넣기
// 사용: var PLAN="<배치.json>"; var TWOLINE_RESULT=""; $.evalFile("<이 파일>"); return TWOLINE_RESULT;
// apply_point.jsx는 첫 텍스트 필드에만 문구를 넣어서, 아랫줄에 템플릿 기본 문구가 남는다
(function () {
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var plan = JSON.parse(f.read()); f.close();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == plan.sequence_id) seq = app.project.sequences[i];
    function split(s) {
        var w = s.split(" "); if (w.length < 2) return [s, ""];
        var best = 1, diff = 1e9;
        for (var k = 1; k < w.length; k++) {
            var a = w.slice(0, k).join(" ").length, b = w.slice(k).join(" ").length;
            if (Math.abs(a - b) < diff) { diff = Math.abs(a - b); best = k; }
        }
        return [w.slice(0, best).join(" "), w.slice(best).join(" ")];
    }
    function setText(pr, s) { var j = JSON.parse(String(pr.getValue())); j.textEditValue = s; j.fontTextRunLength = [String(j.textEditValue).length]; j.capPropTextRunCount = 1; var A_ = ["fontEditValue","fontFSAllCapsValue","fontFSBoldValue","fontFSItalicValue","fontFSSmallCapsValue","fontSizeEditValue"]; for (var a_ = 0; a_ < A_.length; a_++) if (j[A_[a_]] && j[A_[a_]].length) j[A_[a_]] = [j[A_[a_]][0]];   /* 글자 묶음을 새 문구 길이 하나로 (fix_runs.jsx 참고) */ pr.setValue(JSON.stringify(j), true); }
    var fixed = [];
    for (var p = 0; p < plan.points.length; p++) {
        var pt = plan.points[p];
        for (var v = plan.first_track; v < seq.videoTracks.numTracks; v++) {
            var cs = seq.videoTracks[v].clips;
            for (var c = 0; c < cs.numItems; c++) {
                var it = cs[c]; if (Math.abs(it.start.seconds - pt.start) > 0.05) continue;
                var mgt = it.getMGTComponent(); if (!mgt) continue;
                var up = null, dn = null;
                for (var q = 0; q < mgt.properties.numItems; q++) {
                    var n = mgt.properties[q].displayName;
                    if (n == "윗줄 텍스트") up = mgt.properties[q];
                    if (n == "아랫줄 텍스트") dn = mgt.properties[q];
                }
                if (!up || !dn) continue;
                var tx = pt.text.replace(/[\{\}\[\]]/g, "");   // 색 표시({하늘} [초록])는 두 줄 템플릿엔 없음 — 빼고 넣음 (2026-10-13)
                var s = tx.indexOf(" / ") >= 0 ? tx.split(" / ") : split(tx);   // "윗줄 / 아랫줄"로 정해 준 문구는 그대로 나눔 (2026-10-12)
                setText(up, s[0]); setText(dn, s.slice(1).join(" "));
                fixed.push(pt.n + ":V" + (v + 1) + " [" + s[0] + " / " + s[1] + "]");
            }
        }
    }
    TWOLINE_RESULT = JSON.stringify({ fixed: fixed.length, list: fixed });
})();
