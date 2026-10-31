// 놀심 에이전트 — 템플릿 파일을 고친 뒤(칸 범위 등) 이미 올라간 클립 하나를 같은 자리에 다시 넣고 값 그대로 옮기기 (2026-10-29)
// 사용: execute_extendscript code = var TR=<트랙 0부터>; var S=<시작 초>; var MGT="<mogrt 경로>"; var NP_RESULT=""; $.evalFile("<이 파일>"); return NP_RESULT;
// 옮기는 값: 시작·끝·이름, 그래픽 매개 변수 전부(색은 getColorValue/setColorValue, 텍스트 칸은 JSON 통째), 모션
// ⚠ '그림자 효과' 같은 클립 효과는 옮기지 않음 → 결과의 DS=색/불투명도/방향/거리/부드러움 값으로 MCP apply_effect 뒤 다시 넣을 것 (2026-10-29 B2에서 빠짐)
// 확인: 프로젝트 템플릿 항목 수가 그대로여도 새 범위는 적용됨 (같은 칸에 150 넣어 새 클립 150 / 옛 클립 100으로 확인)
// ⚠ importMGT는 템플릿 길이(10초)로 덮어씀 → 시작+10.1초 안에 같은 트랙 다음 클립이 있으면 멈춤 (agents/놀심/failures.md 2026-10-29)
(function () {
    var seq = app.project.activeSequence;
    function cp(k, n) { for (var i = 0; i < k.components.numItems; i++) if (k.components[i].matchName == n || k.components[i].displayName == n) return k.components[i]; return null; }
    var cs = seq.videoTracks[TR].clips, a = null, nx = null;
    for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - S) < 0.02) { a = cs[c]; nx = (c + 1 < cs.numItems) ? cs[c + 1] : null; }
    if (!a) { NP_RESULT = "STOP 클립 없음"; return; }
    if (nx && a.start.seconds + 10.1 > nx.start.seconds) { NP_RESULT = "STOP 뒤 클립과 10초 안 (" + nx.start.seconds.toFixed(2) + ")"; return; }
    // 1) 값 읽기
    var st = a.start.ticks, en = a.end.ticks, nm = a.name, G = [], g = cp(a, "AE.ADBE Capsule");
    for (var p = 0; p < g.properties.numItems; p++) {
        var pr = g.properties[p], v = null, col = null; try { v = pr.getValue(); } catch (e) {}
        if (pr.displayName.indexOf("색") >= 0) { try { col = pr.getColorValue(); } catch (e) {} }
        G.push([pr.displayName, v, col]);
    }
    var mo = cp(a, "AE.ADBE Motion"), M = [];
    for (var p = 0; p < mo.properties.numItems; p++) { try { M.push(mo.properties[p].getValue()); } catch (e) { M.push(null); } }
    var ds = cp(a, "그림자 효과"), DS = null;
    if (ds) DS = [ds.properties[0].getColorValue(), ds.properties[1].getValue(), ds.properties[2].getValue(), ds.properties[3].getValue(), ds.properties[4].getValue()];
    // 2) 다시 넣기
    a.remove(false, false);
    var d = seq.importMGT(MGT, String(st), TR, 3);
    if (!d) { NP_RESULT = "import 실패 — 원래 클립 삭제됨: " + nm; return; }
    var e = new Time(); e.ticks = en; d.end = e;
    var o = new Time(); o.ticks = String(Number(d.inPoint.ticks) + Number(en) - Number(st)); d.outPoint = o;
    d.name = nm;
    // 3) 값 옮기기 (이름으로 짝)
    var g2 = cp(d, "AE.ADBE Capsule"), bad = [];
    for (var k = 0; k < G.length; k++) {
        var q = null; for (var p = 0; p < g2.properties.numItems; p++) if (g2.properties[p].displayName == G[k][0]) q = g2.properties[p];
        if (!q) { bad.push(G[k][0] + " 칸 없음"); continue; }
        if (G[k][2] && G[k][2].length == 4) q.setColorValue(G[k][2][0], G[k][2][1], G[k][2][2], G[k][2][3], true);
        else if (G[k][1] !== null) q.setValue(G[k][1], true);
        var now = (G[k][2] && G[k][2].length == 4) ? String(q.getColorValue()) : String(q.getValue());
        var want = (G[k][2] && G[k][2].length == 4) ? String(G[k][2]) : String(G[k][1]);
        if (now != want) bad.push(G[k][0] + " 다름");
    }
    var mo2 = cp(d, "AE.ADBE Motion");
    for (var p = 0; p < mo2.properties.numItems && p < M.length; p++) if (M[p] !== null) { try { mo2.properties[p].setValue(M[p], true); } catch (x) {} }
    NP_RESULT = "OK " + d.nodeId + " " + d.start.seconds.toFixed(3) + "-" + d.end.seconds.toFixed(3) + (DS ? " DS=" + DS.join("/") : "") + (bad.length ? " | 확인: " + bad.join(", ") : " | 값 모두 같음");
})();
