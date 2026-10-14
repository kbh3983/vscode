// 포인트 에이전트 — 프리미어 템플릿(PR) 후보 클립을 같은 자리·트랙의 AE판(_AE)으로 바꾸기
// 사용: var PLAN="<배치_V2.json>"; var AT=<빈 오디오 트랙 index>; var LIMIT=<최대 몇 개>; var REPLACE_RESULT=""; $.evalFile("<이 파일>"); return REPLACE_RESULT;
// PLAN 후보 중 replace_from(원래 PR 템플릿 이름)이 있는 것만: 그 자리 클립 지우기 → AE판 넣기 → 문구 넣기 → 끝 시간 → 바로 다시 찾아 확인
// 이미 AE판으로 바뀐 자리(MGT 구성요소 있음)는 건너뛴다. AE판 클립 이름이 "제목 없음"으로 들어와서 템플릿 이름으로 바꿔 둔다 → 시간 초과로 끊겨도 다시 실행하면 이어서 함
(function () {
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var plan = JSON.parse(f.read()); f.close();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == plan.sequence_id) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    function find(vt, s) {
        var cs = seq.videoTracks[vt].clips;
        for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - s) < 0.05) return cs[c];
        return null;
    }
    var done = [], failed = [], n = 0, lim = (typeof LIMIT == "number") ? LIMIT : 999;
    for (var p = 0; p < plan.points.length && n < lim; p++) {
        var pt = plan.points[p];
        for (var k = 0; k < pt.candidates.length && n < lim; k++) {
            var c = pt.candidates[k];
            if (!c.replace_from) continue;
            var vt = plan.first_track + k, old = find(vt, pt.start);
            if (old && old.getMGTComponent()) continue;   // 이미 AE판 (PR 그래픽은 MGT 구성요소가 없음)
            n++;
            if (old) old.remove(false, false);
            var t = new Time(); t.seconds = pt.start;
            var item = seq.importMGT(c.path, t.ticks, vt, AT);
            var got = find(vt, pt.start), txt = "";
            if (got) {
                var mgt = got.getMGTComponent();
                if (mgt) for (var q = 0; q < mgt.properties.numItems; q++) {
                    var pr = mgt.properties[q], v = "";
                    try { v = String(pr.getValue()); } catch (e) {}
                    if (v.indexOf("textEditValue") >= 0) { var j = JSON.parse(v); j.textEditValue = pt.text; j.fontTextRunLength = [String(j.textEditValue).length]; j.capPropTextRunCount = 1; var A_ = ["fontEditValue","fontFSAllCapsValue","fontFSBoldValue","fontFSItalicValue","fontFSSmallCapsValue","fontSizeEditValue"]; for (var a_ = 0; a_ < A_.length; a_++) if (j[A_[a_]] && j[A_[a_]].length) j[A_[a_]] = [j[A_[a_]][0]];   /* 글자 묶음을 새 문구 길이 하나로 (fix_runs.jsx 참고) */ pr.setValue(JSON.stringify(j), true); txt = "text"; break; }
                }
                var e2 = new Time(); e2.seconds = pt.end; got.end = e2;
                try { got.name = c.template; } catch (e3) {}
                got = find(vt, pt.start);
            }
            (got ? done : failed).push(pt.n + ":V" + (vt + 1) + " " + (got ? got.name + " " + got.end.seconds.toFixed(2) + " " + txt : "(없음)"));
        }
    }
    REPLACE_RESULT = JSON.stringify({ done: done, failed: failed });
})();
