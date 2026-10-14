// 포인트 에이전트 — 특정 템플릿 후보 클립을 다른 템플릿으로 바꾸기 (같은 자리·트랙, 문구·폰트·글자 묶음 길이·끝 시간·이름·마커)
// 사용: var SEQ_ID="<ID>"; var FIRST=<첫 포인트 트랙 index>; var FROM="<바꿀 템플릿 이름(클립 이름)>"; var TO_NAME="<새 템플릿 이름>"; var TO_PATH="<새 .mogrt>";
//       var AT=<빈 오디오 트랙>; var FONT="Paperlogy-7Bold"; var SWAP_RESULT=""; $.evalFile("<이 파일>"); return SWAP_RESULT;
(function () {
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    function textOf(cl) {
        var m = cl.getMGTComponent(); if (!m) return null;
        for (var q = 0; q < m.properties.numItems; q++) { var v = ""; try { v = String(m.properties[q].getValue()); } catch (e) {} if (v.indexOf("textEditValue") >= 0) return JSON.parse(v).textEditValue; }
        return null;
    }
    var jobs = [];
    for (var v = FIRST; v < seq.videoTracks.numTracks; v++) {
        var cs = seq.videoTracks[v].clips;
        for (var c = 0; c < cs.numItems; c++) if (cs[c].name == FROM) jobs.push({ v: v, s: cs[c].start.seconds, e: cs[c].end.seconds, t: textOf(cs[c]) });
    }
    var done = [], failed = [];
    for (var k = 0; k < jobs.length; k++) {
        var jb = jobs[k], cs2 = seq.videoTracks[jb.v].clips, old = null;
        for (var c2 = 0; c2 < cs2.numItems; c2++) if (Math.abs(cs2[c2].start.seconds - jb.s) < 0.05) old = cs2[c2];
        if (old) old.remove(false, false);
        var t = new Time(); t.seconds = jb.s;
        seq.importMGT(TO_PATH, t.ticks, jb.v, AT);
        var got = null; cs2 = seq.videoTracks[jb.v].clips;
        for (var c3 = 0; c3 < cs2.numItems; c3++) if (Math.abs(cs2[c3].start.seconds - jb.s) < 0.05) got = cs2[c3];
        if (!got) { failed.push("V" + (jb.v + 1) + " " + jb.s.toFixed(2)); continue; }
        var m = got.getMGTComponent(), first = true;
        if (m) for (var q = 0; q < m.properties.numItems; q++) {
            var s = ""; try { s = String(m.properties[q].getValue()); } catch (e) {}
            if (s.indexOf("textEditValue") < 0) continue;
            var j = JSON.parse(s);
            j.textEditValue = first ? jb.t : j.textEditValue; first = false;
            j.fontTextRunLength = [String(j.textEditValue).length]; j.capPropTextRunCount = 1;
            if (j.capPropFontEdit) j.fontEditValue = [FONT];
            var A_ = ["fontFSAllCapsValue", "fontFSBoldValue", "fontFSItalicValue", "fontFSSmallCapsValue", "fontSizeEditValue"];
            for (var a_ = 0; a_ < A_.length; a_++) if (j[A_[a_]] && j[A_[a_]].length) j[A_[a_]] = [j[A_[a_]][0]];
            m.properties[q].setValue(JSON.stringify(j), true);
        }
        var e2 = new Time(); e2.seconds = jb.e; got.end = e2;
        try { got.name = TO_NAME; } catch (e3) {}
        done.push("V" + (jb.v + 1) + " " + jb.s.toFixed(2) + " " + jb.t);
    }
    var mk = 0, mm = seq.markers.getFirstMarker();
    while (mm) { if (mm.comments.indexOf(FROM) >= 0) { mm.comments = mm.comments.split(FROM).join(TO_NAME); mk++; } mm = seq.markers.getNextMarker(mm); }
    SWAP_RESULT = JSON.stringify({ found: jobs.length, done: done, failed: failed, markers: mk });
})();
