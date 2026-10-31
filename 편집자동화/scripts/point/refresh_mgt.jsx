// 포인트 에이전트 — 이미 올라간 템플릿 클립을 고친 템플릿 파일로 다시 넣기 (같은 시간, 모든 값 그대로) (2026-10-26)
// 왜: 폰트 수정 허용은 클립을 만들 때 정해짐 — 클립의 텍스트 JSON에서 capPropFontEdit를 켜도 기본 그래픽 패널에 폰트 칸이 안 나옴
//     (누워서 _정렬 1:36 해설, unlock_font.jsx로 켠 뒤에도 사용자 "폰트 칸 안 나와"). 템플릿 파일을 allow_font_edit.py로 고친 뒤 새로 넣은 클립은 허용됨
// ⚠ importMGT는 템플릿 전체 길이(15초)로 들어가며 같은 트랙 뒤 클립을 덮어씀 (2026-10-26 첫 시도에서 V3 클립 4개 지워짐)
//   → 원래 트랙에 넣지 않고, 트랙마다 새 빈 트랙(원래 index + OFF)에 시간 순서대로 넣는다. 다 넣은 뒤 finish에서 원래 클립을 지우고 빈 트랙을 없앰 → 쌓는 순서 그대로
// 사용 (공통 변수: SEQ_ID, FIRST=<첫 포인트 트랙>, TPL_DIR=<내 템플릿 폴더>, JOBS_FILE=<jobs.json>, REFRESH_RESULT=""):
//   1) MODE="list"  → 대상 목록 (TPL_DIR에 클립 이름 .mogrt가 있는 그래픽 클립, 트랙·시간 순). 키프레임 있는 클립은 빼고 알림. LAST_TRACK·필요한 새 트랙 수를 돌려줌
//   2) MODE="tracks"; ADD=<개수> → 맨 위에 빈 비디오 트랙 추가
//   3) MODE="run"; FROM; COUNT; OFF=<새 트랙까지 거리>; AT=<빈 오디오 트랙> → 새 트랙에 다시 넣기 (45초 안 넘게 나눠서)
//   4) MODE="finish" → 원래 클립 지우고 빈 비디오 트랙 없애기
// 옮기는 값: 시작·끝·in·out·이름·끔 여부, 그래픽 매개 변수 전부(색은 getColorValue/setColorValue, 텍스트 칸은 예전 JSON + 허용 세 개 켬), 모션·불투명도(순서로 짝)
(function () {
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    app.project.activeSequence = seq;
    function q(x) { return '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
    function findClip(v, s, nm) { var cs = seq.videoTracks[v].clips; for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - s) < 0.02 && (!nm || cs[c].name == nm)) return cs[c]; return null; }
    function hasKeys(k) {
        for (var z = 0; z < k.components.numItems; z++) { var ps = k.components[z].properties; for (var y = 0; y < ps.numItems; y++) { var tv = false; try { tv = ps[y].isTimeVarying(); } catch (e) {} if (tv) return k.components[z].displayName + "/" + ps[y].displayName; } }
        return "";
    }
    function readJobs() { var fi = new File(JOBS_FILE); fi.encoding = "UTF-8"; fi.open("r"); var J = JSON.parse(fi.read()); fi.close(); return J; }
    if (MODE == "list") {
        var out = [], skip = [], last = FIRST;
        for (var v = FIRST; v < seq.videoTracks.numTracks; v++) {
            var cs = seq.videoTracks[v].clips;
            if (cs.numItems) last = v;
            for (var c = 0; c < cs.numItems; c++) {
                var k = cs[c], m = null; try { m = k.getMGTComponent(); } catch (e) {}
                if (!m) { skip.push("V" + (v + 1) + " " + k.start.seconds.toFixed(2) + " " + k.name + " (그래픽 템플릿 아님)"); continue; }
                var nm = String(k.name), f = new File(TPL_DIR + "/" + nm + ".mogrt");
                if (!f.exists) { skip.push("V" + (v + 1) + " " + k.start.seconds.toFixed(2) + " " + nm + " (템플릿 파일 없음)"); continue; }
                var kf = hasKeys(k);
                if (kf) { skip.push("V" + (v + 1) + " " + k.start.seconds.toFixed(2) + " " + nm + " (키프레임 " + kf + ")"); continue; }
                out.push('{"v":' + v + ',"s":' + k.start.seconds + ',"name":' + q(nm) + '}');
            }
        }
        var fo = new File(JOBS_FILE); fo.encoding = "UTF-8"; fo.open("w"); fo.write("[" + out.join(",") + "]"); fo.close();
        REFRESH_RESULT = JSON.stringify({ jobs: out.length, skipped: skip, last_track: last, tracks: seq.videoTracks.numTracks, add: last - FIRST + 1, off: seq.videoTracks.numTracks - FIRST });
        return;
    }
    if (MODE == "tracks") {
        app.enableQE(); app.project.openSequence(seq.sequenceID); app.project.activeSequence = seq;
        qe.project.getActiveSequence().addTracks(ADD, seq.videoTracks.numTracks, 0);
        REFRESH_RESULT = "video tracks " + seq.videoTracks.numTracks;
        return;
    }
    var J = readJobs();
    if (MODE == "finish") {
        var rm = 0, miss = [];
        for (var n0 = 0; n0 < J.length; n0++) { var o = findClip(J[n0].v, J[n0].s, J[n0].name); if (o) { o.remove(false, false); rm++; } else miss.push(n0); }
        app.enableQE(); app.project.openSequence(seq.sequenceID); app.project.activeSequence = seq;
        var before = seq.videoTracks.numTracks;
        try { qe.project.getActiveSequence().removeEmptyVideoTracks(); } catch (e) {}
        REFRESH_RESULT = JSON.stringify({ removed: rm, missing: miss, tracks_before: before, tracks_after: seq.videoTracks.numTracks });
        return;
    }
    var done = [], failed = [];
    for (var n = FROM; n < Math.min(J.length, FROM + COUNT); n++) {
        var jb = J[n], from = findClip(jb.v, jb.s, jb.name), dv = jb.v + OFF;
        if (!from) { failed.push(n + " 원래 클립 못 찾음"); continue; }
        if (findClip(dv, jb.s)) { done.push(n + " (이미 있음)"); continue; }
        // 1. 값 모으기
        var keep = { s: from.start.seconds, e: from.end.seconds, inp: from.inPoint.seconds, name: from.name, off: from.disabled, comps: {}, mgt: [] };
        var mo = from.getMGTComponent();
        for (var p = 0; p < mo.properties.numItems; p++) {
            var pr = mo.properties[p], val = null, col = null;
            try { col = pr.getColorValue(); } catch (e) { col = null; }
            try { val = pr.getValue(); } catch (e) {}
            keep.mgt.push({ n: pr.displayName, v: val, col: (col && col.length == 4) ? col : null });
        }
        for (var z = 0; z < from.components.numItems; z++) {
            var cp = from.components[z]; if (cp.displayName == mo.displayName) continue;
            var vals = []; for (var y = 0; y < cp.properties.numItems; y++) { var vv = null; try { vv = cp.properties[y].getValue(); } catch (e) {} vals.push(vv); }
            keep.comps[cp.matchName] = vals;
        }
        // 2. 새 트랙 같은 시간에 넣기 (원래 클립은 finish 때 지움)
        var t = new Time(); t.seconds = keep.s;
        seq.importMGT(TPL_DIR + "/" + jb.name + ".mogrt", t.ticks, dv, AT);
        var got = findClip(dv, keep.s);
        if (!got) { failed.push(n + " 넣기 실패 V" + (dv + 1) + " " + keep.s.toFixed(2)); continue; }
        // 3. 시간 (in·끝·out — 끝을 끌어 늘릴 수 있게 out = in + 길이)
        if (keep.inp > 0.0001) { var ti = new Time(); ti.seconds = keep.inp; got.inPoint = ti; }
        var te = new Time(); te.seconds = keep.e; got.end = te;
        var to = new Time(); to.seconds = got.inPoint.seconds + (keep.e - keep.s); got.outPoint = to;
        // 4. 그래픽 매개 변수
        var mn = got.getMGTComponent(), miss2 = [];
        for (var a = 0; a < keep.mgt.length; a++) {
            var it = keep.mgt[a], tp = null;
            for (var b = 0; b < mn.properties.numItems; b++) if (mn.properties[b].displayName == it.n) tp = mn.properties[b];
            if (!tp || (it.v === null && !it.col)) { miss2.push(it.n); continue; }
            if (it.col) { tp.setColorValue(it.col[0], it.col[1], it.col[2], it.col[3], true); continue; }
            var sv = String(it.v);
            if (sv.indexOf("textEditValue") >= 0) {
                var jo = JSON.parse(sv); jo.capPropFontEdit = true; jo.capPropFontSizeEdit = true; jo.capPropFontFauxStyleEdit = true;
                tp.setValue(JSON.stringify(jo), true);
            } else tp.setValue(it.v, true);
        }
        // 5. 모션·불투명도 (순서로 짝 — 불투명도에 "혼합 모드"가 두 개)
        for (var z2 = 0; z2 < got.components.numItems; z2++) {
            var cp2 = got.components[z2], src = keep.comps[cp2.matchName]; if (!src) continue;
            for (var y2 = 0; y2 < cp2.properties.numItems && y2 < src.length; y2++) { if (src[y2] === null) continue; try { cp2.properties[y2].setValue(src[y2], true); } catch (e) {} }
        }
        try { got.name = keep.name; } catch (e) {}
        if (keep.off) got.disabled = true;
        done.push(n + (miss2.length ? " (못 옮긴 칸: " + miss2.join("/") + ")" : ""));
    }
    REFRESH_RESULT = JSON.stringify({ done: done.length, detail: done, failed: failed });
})();
