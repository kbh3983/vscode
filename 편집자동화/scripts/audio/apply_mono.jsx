// 오디오 에이전트 — 모노 사운드 적용 (agents/오디오/playbook_모노.md 4-3·4-4)
// 사용: execute_extendscript code =
//   var SEQ_ID="<새 시퀀스 ID>"; var PLAN="<work/모노/<시퀀스>_plan.json 절대경로>"; $.evalFile("<이 파일>"); return MONO_RESULT;
// 하는 일: ① 대상 트랙 외 카메라 음성 트랙 음소거(효과음·BGM·빈 트랙은 그대로) ② 두 마이크 클립에 채널 혼합기 + 선택적 제한 추가
//          ③ 기존 선택적 제한·채우기 이펙트 바이패스, 값 설정. 엔딩 영상 등 다른 소스 클립은 건드리지 않음
// ExtendScript는 ES3: map/forEach 쓰지 않음
(function () {
    app.enableQE();
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var plan = JSON.parse(f.read()); f.close();
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    var q = qe.project.getActiveSequence();
    var T = plan.track - 1;
    function base(p) { return p.split("\\").pop(); }
    var srcNames = {}; for (var i = 0; i < plan.sources.length; i++) srcNames[base(plan.sources[i])] = true;

    var muted = [];
    for (var t = 0; t < seq.audioTracks.numTracks; t++) {
        if (t == T) continue;
        var cs = seq.audioTracks[t].clips, cam = cs.numItems > 0;
        for (var c = 0; c < cs.numItems; c++) if (!/\.(mp4|mov|mxf)$/i.test(base(cs[c].projectItem.getMediaPath())) || /엔딩/.test(cs[c].name)) cam = false;
        if (cam) { q.getAudioTrackAt(t).setMute(true); muted.push("A" + (t + 1)); }
    }

    var mxE = qe.project.getAudioEffectByName("채널 혼합기"), lmE = qe.project.getAudioEffectByName("선택적 제한");
    var qt = q.getAudioTrackAt(T), added = 0;
    for (var j = 0; j < qt.numItems; j++) {
        var it = qt.getItemAt(j);
        if (it.type == "Empty" || !srcNames[it.name]) continue;
        it.addAudioEffect(mxE); it.addAudioEffect(lmE); added++;
    }

    var cs = seq.audioTracks[T].clips, set = 0, skipped = 0, M = plan.mixer, Lm = plan.limiter;
    for (var c = 0; c < cs.numItems; c++) {
        var cl = cs[c];
        if (!srcNames[base(cl.projectItem.getMediaPath())]) { skipped++; continue; }
        var lims = [], mx = null, fills = [];
        for (var k = 0; k < cl.components.numItems; k++) {
            var co = cl.components[k], n = co.displayName;
            if (n == "선택적 제한") lims.push(co); else if (n == "채널 혼합기") mx = co;
            else if (n == "좌측과 우측 채우기" || n == "우측과 좌측 채우기") fills.push(co);
        }
        for (var i = 0; i < fills.length; i++) fills[i].properties[0].setValue(true, true);
        for (var i = 0; i < lims.length - 1; i++) lims[i].properties[0].setValue(true, true);
        mx.properties[2].setValue(M.LtoL, true); mx.properties[3].setValue(M.RtoL, true);
        mx.properties[10].setValue(M.LtoR, true); mx.properties[11].setValue(M.RtoR, true);
        var lm = lims[lims.length - 1];
        lm.properties[0].setValue(false, true); lm.properties[1].setValue(Lm.max, true); lm.properties[2].setValue(Lm.boost, true);
        set++;
    }
    MONO_RESULT = seq.name + ": effects added " + added + ", set " + set + ", other clips untouched " + skipped + ", muted " + muted.join(",");
})();
