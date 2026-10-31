// 포인트 에이전트 — 시퀀스에 이미 올라간 템플릿 클립의 폰트·크기·스타일 수정 허용 켜기 (2026-10-26 누워서 _정렬 1:36 해설 "폰트 변경이 안 됨")
// 사용: var SEQ_ID="<ID>"; var FIRST=<첫 포인트 트랙 index>; var UNLOCK_RESULT=""; $.evalFile("<이 파일>"); return UNLOCK_RESULT;
// 원인: 우리 _AE 템플릿을 2026-10-17 전에 내보내 텍스트 칸 capPropFontEdit/SizeEdit/FauxStyleEdit가 false → 기본 그래픽 패널에 폰트 칸이 안 나옴
//   템플릿 파일은 allow_font_edit.py로 고치고(새로 넣는 클립), 이미 올라간 클립은 클립마다 값을 따로 가져서 이 스크립트로 켠다
// 문구·폰트·크기·글자 묶음·모션은 건드리지 않고 허용 값 세 개만 바꾼다
(function () {
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    var fields = 0, clips = 0, already = 0, names = {};
    for (var v = FIRST; v < seq.videoTracks.numTracks; v++) {
        var cs = seq.videoTracks[v].clips;
        for (var c = 0; c < cs.numItems; c++) {
            var m = null;
            try { m = cs[c].getMGTComponent(); } catch (e) {}
            if (!m) continue;
            var hit = false;
            for (var p = 0; p < m.properties.numItems; p++) {
                var s = ""; try { s = String(m.properties[p].getValue()); } catch (e) {}
                if (s.indexOf("capPropFontEdit") < 0) continue;
                var j = JSON.parse(s);
                if (j.capPropFontEdit && j.capPropFontSizeEdit && j.capPropFontFauxStyleEdit) { already++; continue; }
                j.capPropFontEdit = true; j.capPropFontSizeEdit = true; j.capPropFontFauxStyleEdit = true;
                m.properties[p].setValue(JSON.stringify(j), true);
                fields++; hit = true;
            }
            if (hit) { clips++; names[cs[c].name] = (names[cs[c].name] || 0) + 1; }
        }
    }
    var n = []; for (var k in names) n.push(k + " " + names[k]);
    UNLOCK_RESULT = JSON.stringify({ clips: clips, fields: fields, already: already, templates: n });
})();
