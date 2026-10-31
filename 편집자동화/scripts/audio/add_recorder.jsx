// 오디오 에이전트 — 백업 녹음기 소리를 말소리 트랙(A1) 클립과 같은 구간으로 잘라 빈 오디오 트랙에 싱크 맞춰 넣기 (2026-10-31 이효석님, 사용자: "둘 중 더 나은 걸로 골라서 쓰게")
// 사용: var PLAN="<recorder_plan.json>"; var REC="<녹음기 파일 경로>"; var TR=2; var MUTE=true; $.evalFile("<이 파일>"); return REC_RESULT;
// PLAN = {시퀀스ID: {name, clips:[{start,end,rin(녹음기 초)}], boost(선택적 제한 입력 증폭 값)}} — 녹음기 시간 = 카메라 원본 시간 + 오프셋(시계 차이 보정 포함, 파이썬에서 계산)
// 녹음기 클립마다 '선택적 제한'(최대 −6 dB, 게인 = boost)을 붙여 A1과 같은 크기로 비교할 수 있게 함. MUTE면 그 트랙 음소거 (두 소리 겹치지 않게)
var REC_RESULT = "";
(function () {
    app.enableQE();
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var P = JSON.parse(f.read()); f.close();
    function find(it) { for (var i = 0; i < it.children.numItems; i++) { var c = it.children[i]; if (c.type == 2) { var x = find(c); if (x) return x; } else if (c.getMediaPath && c.getMediaPath().split("/").pop() == REC.split("/").pop()) return c; } return null; }   // 한글 경로는 유니코드 정규화가 달라 전체 비교가 틀림 → 파일 이름으로
    var item = find(app.project.rootItem);
    if (!item) { REC_RESULT = "녹음기 항목 없음"; return; }
    var TPS = 254016000000, out = [];
    function tk(sec) { return String(Math.round(sec * TPS)); }
    for (var k = 0; k < app.project.sequences.numSequences; k++) {
        var s = app.project.sequences[k], p = P[s.sequenceID];
        if (!p) continue;
        app.project.activeSequence = s;
        var tr = s.audioTracks[TR];
        if (tr.clips.numItems) { out.push(s.name + ": A" + (TR + 1) + " 비어 있지 않음 — 건너뜀"); continue; }
        for (var j = 0; j < p.clips.length; j++) {
            var c = p.clips[j];
            item.setInPoint(tk(c.rin), 4); item.setOutPoint(tk(c.rin + (c.end - c.start)), 4);
            var t = new Time(); t.ticks = tk(c.start);
            tr.overwriteClip(item, t);
        }
        var q = qe.project.getActiveSequence(), qt = q.getAudioTrackAt(TR), lm = qe.project.getAudioEffectByName("선택적 제한"), n = 0;
        for (var j = 0; j < qt.numItems; j++) { var it = qt.getItemAt(j); if (it.type == "Empty") continue; it.addAudioEffect(lm); n++; }
        var cs = tr.clips, set = 0, err = 0;
        for (var j = 0; j < cs.numItems; j++) {
            for (var z = 0; z < cs[j].components.numItems; z++) {
                var co = cs[j].components[z];
                if (co.displayName == "선택적 제한") { co.properties[0].setValue(false, true); co.properties[1].setValue(0.94, true); co.properties[2].setValue(p.boost, true); set++; }
            }
            var want = p.clips[j]; if (want && Math.abs(cs[j].start.seconds - want.start) > 0.02) err++;
        }
        if (MUTE) q.getAudioTrackAt(TR).setMute(true);
        out.push(s.name + ": 넣음 " + cs.numItems + "/" + p.clips.length + ", 제한 " + set + ", 위치 어긋남 " + err);
    }
    item.clearInPoint(4); item.clearOutPoint(4);
    REC_RESULT = out.join("\n");
})();
