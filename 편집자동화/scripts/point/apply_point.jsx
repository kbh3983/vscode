// 포인트 에이전트 — 후보 템플릿 배치 (agents/포인트/AGENT.md P5)
// 사용: execute_extendscript code =
//   var PLAN="<work/포인트/<시퀀스>_배치.json 절대경로>"; var AT=<빈 오디오 트랙 index>; [var FROM=<이어서 할 구간 index>;] var POINT_RESULT=""; $.evalFile("<이 파일>"); return POINT_RESULT;
// 전제: 비디오 트랙이 first_track + (최대 후보 수) 개 이상 있고, AT는 비어 있는 오디오 트랙 (템플릿 안 소리가 기존 오디오를 덮지 않게)
// 하는 일: 구간마다 후보 k → 비디오 트랙 first_track+k 에 넣고, 첫 텍스트 필드에 문구, 끝 = 대사 끝, 시퀀스 마커(후보 목록)
// 여러 칸 템플릿(Tip!·노랑 2단·정보 바·해설 — plan.py fields)은 칸 이름(displayName)대로 채운다 (2026-10-12). 효과 제안(suggest)은 마커 설명에
// ExtendScript는 ES3: map/forEach 쓰지 않음
(function () {
    function half(t) { var w = t.split(" "); if (w.length < 2) return t; var best = 1, d = 1e9; for (var k = 1; k < w.length; k++) { var a = w.slice(0, k).join(" ").length, b = w.slice(k).join(" ").length; if (Math.abs(a - b) < d) { d = Math.abs(a - b); best = k; } } return w.slice(0, best).join(" ") + "\r" + w.slice(best).join(" "); }
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var plan = JSON.parse(f.read()); f.close();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == plan.sequence_id) seq = app.project.sequences[i];
    if (!seq) { POINT_RESULT = "시퀀스 없음"; return; }
    app.project.activeSequence = seq;
    var before = [];
    for (var a = 0; a < seq.audioTracks.numTracks; a++) before.push(seq.audioTracks[a].clips.numItems);

    var placed = 0, noText = [], multiText = [], errors = [];
    var from = (typeof FROM == "number") ? FROM : 0; // 중간에 멈췄을 때 이어서 (0부터)
    for (var p = from; p < plan.points.length; p++) {
        var pt = plan.points[p], names = [];
        for (var k = 0; k < pt.candidates.length; k++) {
            var c = pt.candidates[k], vt = plan.first_track + k;
            names.push(c.template + " (V" + (vt + 1) + ")");
            try {
                var t = new Time(); t.seconds = pt.start;
                var item = seq.importMGT(c.path, t.ticks, vt, AT);
                if (!item) { errors.push(pt.n + ":" + c.template + " import 실패"); continue; }
                var mgt = item.getMGTComponent(), fields = [];
                if (mgt) for (var q = 0; q < mgt.properties.numItems; q++) {
                    var pr = mgt.properties[q], v = "";
                    try { v = String(pr.getValue()); } catch (e) {}
                    if (v.indexOf("textEditValue") >= 0) fields.push(pr);
                }
                if (fields.length == 0) noText.push(pt.n + ":" + c.template);
                else if (c.fields) {
                    for (var fq = 0; fq < fields.length; fq++) {
                        var fn = fields[fq].displayName; if (!c.fields.hasOwnProperty(fn)) continue;
                        var jf = JSON.parse(String(fields[fq].getValue()));
                        jf.textEditValue = c.fields[fn]; jf.fontTextRunLength = [String(jf.textEditValue).length]; jf.capPropTextRunCount = 1;
                        var B_ = ["fontEditValue","fontFSAllCapsValue","fontFSBoldValue","fontFSItalicValue","fontFSSmallCapsValue","fontSizeEditValue"]; for (var b_ = 0; b_ < B_.length; b_++) if (jf[B_[b_]] && jf[B_[b_]].length) jf[B_[b_]] = [jf[B_[b_]][0]];
                        fields[fq].setValue(JSON.stringify(jf), true);
                    }
                }
                else {
                    var j = JSON.parse(String(fields[0].getValue()));
                    var tx = c.text || pt.text; j.textEditValue = c.two_line ? half(tx) : tx; j.fontTextRunLength = [String(j.textEditValue).length]; j.capPropTextRunCount = 1; var A_ = ["fontEditValue","fontFSAllCapsValue","fontFSBoldValue","fontFSItalicValue","fontFSSmallCapsValue","fontSizeEditValue"]; for (var a_ = 0; a_ < A_.length; a_++) if (j[A_[a_]] && j[A_[a_]].length) j[A_[a_]] = [j[A_[a_]][0]];   /* 글자 묶음을 새 문구 길이 하나로 (fix_runs.jsx 참고) */
                    fields[0].setValue(JSON.stringify(j), true);
                    if (fields.length > 1) multiText.push(pt.n + ":" + c.template + "(" + fields.length + ")");
                }
                var e2 = new Time(); e2.seconds = pt.end; item.end = e2;
                try { item.name = c.template; } catch (en) {}   // AE 템플릿 클립 이름이 "제목 없음"으로 나옴 → 템플릿 이름 (set_font KEEP_TEMPLATES·보고에 씀)
                if (c.two_line && c.raise) for (var mq = 0; mq < item.components.numItems; mq++) if (item.components[mq].matchName == "AE.ADBE Motion") { var mp = item.components[mq].properties; for (var pp = 0; pp < mp.numItems; pp++) if (mp[pp].displayName == "위치" || mp[pp].displayName == "Position") mp[pp].setValue([0.5, 0.5 - (c.raise === true ? 70 : c.raise) / 1080], true); }   // 두 줄이면 아래 끝에 닿지 않게 70px 위로
                placed++;
            } catch (err) { errors.push(pt.n + ":" + c.template + " " + err); }
        }
        var m = seq.markers.createMarker(pt.start);
        m.name = "포인트 " + pt.n + " [" + pt.type + "]";
        m.comments = "후보: " + names.join(" / ") + "\n대사: " + pt.dialogue + (pt.suggest ? "\n제안: " + pt.suggest : "") + (pt.bcam ? "\nB캠 반응 컷 제안 (한 사람 클로즈업)" : "") + (pt.image_prompt ? "\n설명 이미지 프롬프트(GPT): " + pt.image_prompt : "");
        m.end = pt.end; // Time 객체를 넣으면 실패함, 초(숫자)로 넣는다
    }
    var after = [];
    for (var a2 = 0; a2 < seq.audioTracks.numTracks; a2++) after.push(seq.audioTracks[a2].clips.numItems);
    POINT_RESULT = JSON.stringify({ placed: placed, noText: noText, multiText: multiText, errors: errors, audioBefore: before, audioAfter: after });
})();
