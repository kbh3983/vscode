// 포인트 에이전트 — 포인트 트랙(first_track 이상) 템플릿의 모든 텍스트 필드 폰트 바꾸기
// 사용: var SEQ_ID="<ID>"; var FIRST=<첫 포인트 트랙 index>; var FONT="<PostScript 이름>"; var FONT_RESULT=""; $.evalFile("<이 파일>"); return FONT_RESULT;
// AE로 만든 템플릿만 바뀐다 (MGT 속성 JSON의 fontEditValue). 프리미어로 만든 "그래픽"은 스크립트로 바꾸면 글자가 깨져서 건너뛴다
// KEEP_TEMPLATES: 원래 폰트를 유지하는 템플릿 (2026-10-12 사용자: "응 유지해줘" — 정보형 4종 _AE). 클립 이름(apply_point가 템플릿 이름으로 붙임)으로 찾는다
//   폰트 이름으로 찾으면 안 됨 — PYNPA-뾰족말-노랑 등 다른 템플릿도 기본 폰트가 지마켓산스라 같이 빠짐 (2026-10-12 시험). 나중에 템플릿 컨셉별 폰트를 정하면 여기에 더한다
(function () {
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    var KEEP_TEMPLATES = ["Tip_동작요령_2단", "요령_노랑_2단", "정보바_세트안내", "해설_괄호", "요약_색강조_한줄", "정보바_2줄", "요약_2단_"];   // 2026-10-13 목교정기 사용자 제작 2종 추가 (원본 폰트)
    function keep(n) { for (var k = 0; k < KEEP_TEMPLATES.length; k++) if (String(n).indexOf(KEEP_TEMPLATES[k]) == 0) return true; return false; }
    var changed = 0, clips = 0, kept = 0, skipped = [];
    for (var v = FIRST; v < seq.videoTracks.numTracks; v++) {
        var cs = seq.videoTracks[v].clips;
        for (var c = 0; c < cs.numItems; c++) {
            var m = cs[c].getMGTComponent();
            if (!m) { skipped.push("V" + (v + 1) + " " + cs[c].start.seconds.toFixed(1) + "s " + cs[c].name); continue; }
            if (keep(cs[c].name)) { kept++; clips++; continue; }
            var hit = false;
            for (var p = 0; p < m.properties.numItems; p++) {
                var s = ""; try { s = String(m.properties[p].getValue()); } catch (e) {}
                if (s.indexOf("textEditValue") < 0) continue;
                var j = JSON.parse(s);
                if (!j.capPropFontEdit) continue;
                // 글자 묶음을 문구 길이 하나로 맞춘 뒤 폰트를 넣는다 — 묶음이 원래 문구 길이로 남으면 앞 몇 글자만 바뀜 (fix_runs.jsx)
                j.fontTextRunLength = [String(j.textEditValue).length]; j.capPropTextRunCount = 1;
                var A_ = ["fontFSAllCapsValue","fontFSBoldValue","fontFSItalicValue","fontFSSmallCapsValue","fontSizeEditValue"];
                for (var a_ = 0; a_ < A_.length; a_++) if (j[A_[a_]] && j[A_[a_]].length) j[A_[a_]] = [j[A_[a_]][0]];
                j.fontEditValue = [FONT];
                m.properties[p].setValue(JSON.stringify(j), true);
                changed++; hit = true;
            }
            if (hit) clips++; else skipped.push("V" + (v + 1) + " " + cs[c].start.seconds.toFixed(1) + "s " + cs[c].name + " (텍스트 필드 없음)");
        }
    }
    FONT_RESULT = JSON.stringify({ clips: clips, fields: changed, kept: kept, skipped: skipped });
})();
