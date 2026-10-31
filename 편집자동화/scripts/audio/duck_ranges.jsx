// 오디오 — 정한 구간만 클립 볼륨을 낮추기 (볼륨 레벨 키프레임) (2026-10-26 스틱 뜀뛰기: 운동 구간에서 말 없는 곳의 뛰는 소리 −15 dB)
// 사용: var SEQ_ID="<ID>"; var TRACK=<오디오 트랙 index>; var RANGES=[[시작초,끝초],...]; var DB=-15; var RAMP=0.3; var DUCK_RESULT=""; $.evalFile("<이 파일>"); return DUCK_RESULT;
//   RANGES 안은 지금 레벨 + DB, 밖은 지금 레벨 그대로. 구간 시작·끝 RAMP초 동안 구간 안쪽에서 바뀜 (덕킹 전환 0.3초 — 오디오 criteria)
//   키프레임 시간 = 클립 inPoint + (시퀀스 시간 − 클립 시작). 이미 키프레임이 있는 클립은 건드리지 않고 알림
// 볼륨 레벨 값 = 10^((dB−15)/20) (오디오 AGENT.md)
(function () {
    var s = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) s = app.project.sequences[i];
    function level(c) {
        for (var z = 0; z < c.components.numItems; z++) {
            var cp = c.components[z];
            if (cp.displayName == "볼륨" || cp.displayName == "Volume")
                for (var y = 0; y < cp.properties.numItems; y++) { var n = cp.properties[y].displayName; if (n == "레벨" || n == "Level") return cp.properties[y]; }
        }
        return null;
    }
    // 시퀀스 시간 t의 dB 변화량 (0 또는 DB, 경계에서 RAMP 동안 선형)
    function g(t) {
        for (var r = 0; r < RANGES.length; r++) {
            var a = RANGES[r][0], b = RANGES[r][1];
            if (t < a || t > b) continue;
            var k = Math.min(1, (t - a) / RAMP, (b - t) / RAMP);
            return DB * Math.max(0, k);
        }
        return 0;
    }
    var tr = s.audioTracks[TRACK], done = [], skip = [];
    for (var c = 0; c < tr.clips.numItems; c++) {
        var k = tr.clips[c], cs = k.start.seconds, ce = k.end.seconds, pts = [], hit = false;
        for (var r = 0; r < RANGES.length; r++) {
            var a = RANGES[r][0], b = RANGES[r][1];
            if (b <= cs || a >= ce) continue;
            hit = true;   // 구간 안에 통째로 들어간 클립은 경계 점이 없어도 처리 (2026-10-26 첫 실행에서 2개 빠짐)
            var cand = [a, Math.min(a + RAMP, (a + b) / 2), Math.max(b - RAMP, (a + b) / 2), b];
            for (var q = 0; q < cand.length; q++) if (cand[q] >= cs && cand[q] <= ce) pts.push(cand[q]);
        }
        if (!hit) continue;
        var lv = level(k);
        if (!lv) { skip.push(cs.toFixed(2) + " 볼륨 없음"); continue; }
        if (lv.isTimeVarying()) { skip.push(cs.toFixed(2) + " 이미 키프레임"); continue; }
        var base = 20 * Math.log(lv.getValue()) / Math.LN10 + 15;
        pts.push(cs); pts.push(ce - 0.001);
        pts.sort(function (x, y) { return x - y; });
        lv.setTimeVarying(true);
        var n = 0, last = -1;
        for (var p = 0; p < pts.length; p++) {
            if (pts[p] - last < 0.005) continue;
            last = pts[p];
            var tk = new Time(); tk.seconds = k.inPoint.seconds + (pts[p] - cs);
            lv.addKey(tk);
            lv.setValueAtKey(tk, Math.pow(10, (base + g(pts[p]) - 15) / 20), true);
            n++;
        }
        done.push(cs.toFixed(2) + "-" + ce.toFixed(2) + " " + n + "키");
    }
    DUCK_RESULT = JSON.stringify({ clips: done.length, detail: done, skipped: skip });
})();
