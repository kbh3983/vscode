// 포인트 에이전트 — 문구를 바꾼 뒤 남은 "글자 묶음 길이(fontTextRunLength)"를 새 문구 길이에 맞추기
// 원인: 템플릿 원래 문구 길이로 묶음이 남아 있으면 폰트(페이퍼로지 등)가 앞 몇 글자에만 적용되고 나머지는 원래 폰트로 나옴
// 사용: var SEQ_ID="<ID>"; var FIRST=<첫 포인트 트랙 index>; var FIX=true|false; var RUNS_RESULT=""; $.evalFile("<이 파일>"); return RUNS_RESULT;
// FIX=false면 찾기만. 고칠 때는 묶음을 하나로 합치고 글자별 배열(폰트·크기·굵게 등)은 첫 값 하나로
(function () {
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    var found = [], fixed = 0, clips = 0;
    var ARR = ["fontEditValue", "fontFSAllCapsValue", "fontFSBoldValue", "fontFSItalicValue", "fontFSSmallCapsValue", "fontSizeEditValue"];
    for (var v = FIRST; v < seq.videoTracks.numTracks; v++) {
        var cs = seq.videoTracks[v].clips;
        for (var c = 0; c < cs.numItems; c++) {
            var m = cs[c].getMGTComponent(); if (!m) continue; clips++;
            for (var p = 0; p < m.properties.numItems; p++) {
                var s = ""; try { s = String(m.properties[p].getValue()); } catch (e) {}
                if (s.indexOf("textEditValue") < 0) continue;
                var j = JSON.parse(s), runs = j.fontTextRunLength || [], sum = 0;
                for (var r = 0; r < runs.length; r++) sum += runs[r];
                var len = String(j.textEditValue).length;
                if (sum == len) continue;
                found.push("V" + (v + 1) + " " + cs[c].start.seconds.toFixed(1) + "s " + cs[c].name + " [" + m.properties[p].displayName + "] 묶음 " + runs.join("+") + " / 글자 " + len);
                if (!FIX) continue;
                j.fontTextRunLength = [len];
                for (var a = 0; a < ARR.length; a++) if (j[ARR[a]] && j[ARR[a]].length) j[ARR[a]] = [j[ARR[a]][0]];
                j.capPropTextRunCount = 1;
                m.properties[p].setValue(JSON.stringify(j), true);
                fixed++;
            }
        }
    }
    RUNS_RESULT = JSON.stringify({ clips: clips, mismatched: found.length, fixed: fixed, list: found });
})();
