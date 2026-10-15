// 숏폼 에이전트 — 숏폼 V1(롱폼 소스 중첩)을 카메라 구간별 조각으로 다시 놓고 조각마다 비율·위치 (샷사이즈 회고, 2026-10-14)
// 사용: (function(){ SEQ_NAME="<숏폼>_텍스트2"; SRC_NAME="<롱폼>_숏폼소스_샷"; PARTS="<parts json: [{a,b,at,sc,pos:[x,y],cam}]>"; RV_RESULT=""; $.evalFile("<이 파일>"); return RV_RESULT; })()
// - V1 클립을 모두 지우고 parts 순서대로 overwriteClip (오디오 A1도 같은 소스 소리로 덮임 — 소리는 같음)
// - 시간은 프레임 단위(29.97)로 맞춘 초
(function () {
    var P = app.project, s = null, src = null;
    for (var i = 0; i < P.sequences.numSequences; i++) { if (P.sequences[i].name == SEQ_NAME) s = P.sequences[i]; if (P.sequences[i].name == SRC_NAME) src = P.sequences[i]; }
    if (!s || !src) { RV_RESULT = "시퀀스 없음"; return; }
    var f = new File(PARTS); f.encoding = "UTF-8"; f.open("r"); var R = JSON.parse(f.read()); f.close();
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    function motion(k) { var r = {}; for (var z = 0; z < k.components.numItems; z++) if (k.components[z].matchName == "AE.ADBE Motion") { var mp = k.components[z].properties; for (var y = 0; y < mp.numItems; y++) { if (mp[y].displayName == "비율 조정") r.sc = mp[y]; if (mp[y].displayName == "위치") r.pos = mp[y]; } } return r; }
    var V = s.videoTracks[0], A = s.audioTracks[0], log = [];
    var cs = V.clips; for (var c = cs.numItems - 1; c >= 0; c--) cs[c].remove(false, false);
    var it = src.projectItem, ok = 0;
    for (var p = 0; p < R.length; p++) {
        var r = R[p];
        try { it.clearInPoint(4); it.clearOutPoint(4); } catch (e) {}   // 앞 조각의 아웃 점보다 뒤로 인 점을 놓으면 무시돼 0초부터 들어감 (옆구리살_숏폼2에서 발생)
        it.setInPoint(r.a, 4); it.setOutPoint(r.b, 4);
        V.overwriteClip(it, r.at);
        var trs = [V, A];
        for (var q = 0; q < 2; q++) {   // 놓인 자리가 밀렸으면 되돌림 (build_short.jsx와 같음)
            var c2 = trs[q].clips, k = null;
            for (var c = 0; c < c2.numItems; c++) if (Math.abs(c2[c].inPoint.seconds - r.a) < 0.02 && c2[c].start.seconds > r.at + 0.01) k = c2[c];
            if (k) k.move(T(r.at - k.start.seconds));
        }
        var vc = null; c2 = V.clips; for (var c = 0; c < c2.numItems; c++) if (Math.abs(c2[c].start.seconds - r.at) < 0.02) vc = c2[c];
        if (!vc) { log.push("못 찾음 " + p + " " + r.at); continue; }
        if (Math.abs(vc.inPoint.seconds - r.a) > 0.04 || Math.abs(vc.end.seconds - vc.start.seconds - (r.b - r.a)) > 0.04) log.push("인/길이 어긋남 " + p + " in " + vc.inPoint.seconds.toFixed(2) + "/" + r.a);
        var m = motion(vc); m.sc.setValue(r.sc, true); m.pos.setValue(r.pos, true);
        ok++;
    }
    try { it.clearInPoint(4); it.clearOutPoint(4); } catch (e) {}
    var last = R[R.length - 1], endT = last.at + (last.b - last.a);   // 마지막 조각 뒤로 삐져나온 것 정리
    for (var q = 0; q < 2; q++) { var c3 = [V, A][q].clips; for (var c = c3.numItems - 1; c >= 0; c--) if (c3[c].start.seconds >= endT - 0.02) c3[c].remove(false, false); else if (c3[c].end.seconds > endT + 0.02) c3[c].end = T(endT); }
    var filled = 0;   // 초 → 프레임 반올림으로 조각 사이에 1프레임 틈(검은 화면)이 생김 → 앞 클립 끝을 다음 시작까지 늘림
    for (var q = 0; q < 2; q++) { var c4 = [V, A][q].clips; for (var c = 0; c < c4.numItems - 1; c++) { var gap = (Number(c4[c + 1].start.ticks) - Number(c4[c].end.ticks)) / 254016000000; if (gap > 0.0001 && gap < 0.1) { var e2 = new Time(); e2.ticks = c4[c + 1].start.ticks; c4[c].end = e2; filled++; } } }
    if (filled) log.push("틈 메움 " + filled);
    P.save();
    RV_RESULT = SEQ_NAME + " | 조각 " + ok + "/" + R.length + " | V1 " + V.clips.numItems + " A1 " + A.clips.numItems + " | 끝 " + (s.end / 254016000000).toFixed(2) + (log.length ? " | " + log.join("; ") : "");
})();
