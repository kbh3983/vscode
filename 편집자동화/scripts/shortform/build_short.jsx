// 숏폼 에이전트 S4 — shorts.json 의 숏폼 하나를 프리미어 시퀀스로 만들기 (템플릿 v2 복제)
// 사용: (function(){ SHORTS="<shorts.json>"; IDX=0; TEMPLATE_ID="7791e04b-..."; BUILD_RESULT=""; $.evalFile("<이 파일>"); return BUILD_RESULT; })()
// 트랙: V1 롱폼 소스(중첩) 조각 / V3 프레임 / V4 자막 / V5 안내 박스 / V6 상단 제목, A1 소스 오디오. 시각 장치는 마커로 제안만
(function () {
    var P = app.project;
    function rd(p) { var f = new File(p); f.encoding = "UTF-8"; f.open("r"); var t = f.read(); f.close(); return JSON.parse(t); }
    function seqById(id) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].sequenceID == id) return P.sequences[i]; return null; }
    function findItem(root, name) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { var r = findItem(c, name); if (r) return r; } else if (c.name == name) return c; } return null; }
    function inBin(bin, name) { for (var i = 0; i < bin.children.numItems; i++) if (bin.children[i].name == name) return bin.children[i]; return null; }
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    function motion(k) { var r = {}; for (var z = 0; z < k.components.numItems; z++) if (k.components[z].matchName == "AE.ADBE Motion") { var mp = k.components[z].properties; for (var y = 0; y < mp.numItems; y++) { if (mp[y].displayName == "비율 조정") r.sc = mp[y]; if (mp[y].displayName == "위치") r.pos = mp[y]; } } return r; }
    var S = rd(SHORTS)[IDX], log = [];
    var tpl = seqById(TEMPLATE_ID), src = seqById(S.src_id);
    // 1. 템플릿 복제 (같은 이름 있으면 _2)
    var names = {}; for (var i = 0; i < P.sequences.numSequences; i++) names[P.sequences[i].name] = P.sequences[i].sequenceID;
    var nm = S.name, n2 = 2; while (names[nm]) { nm = S.name + "_" + n2; n2++; }
    var before = {}; for (var i = 0; i < P.sequences.numSequences; i++) before[P.sequences[i].sequenceID] = 1;
    tpl.clone(); var s = null; for (var i = 0; i < P.sequences.numSequences; i++) if (!before[P.sequences[i].sequenceID]) s = P.sequences[i];
    s.name = nm;
    var TR = []; for (var v = 0; v < s.videoTracks.numTracks; v++) TR.push(s.videoTracks[v]); for (var a = 0; a < s.audioTracks.numTracks; a++) TR.push(s.audioTracks[a]);
    for (var t = 0; t < TR.length; t++) { var cs = TR[t].clips; for (var c = cs.numItems - 1; c >= 0; c--) cs[c].remove(false, false); }
    // 2. 이미지 가져오기 (숏폼마다 빈)
    var parent = null; for (var i = 0; i < P.rootItem.children.numItems; i++) if (P.rootItem.children[i].type == 2 && P.rootItem.children[i].name == "숏폼_첫작업") parent = P.rootItem.children[i];   // findItem은 빈을 못 찾음 (숏폼마다 빈이 새로 생겼던 버그, 2026-10-14)
    if (!parent) parent = P.rootItem.createBin("숏폼_첫작업");
    var bin = parent.createBin(nm);
    var files = [S.title_png]; for (var j = 0; j < S.subs.length; j++) files.push(S.subs[j].png);
    P.importFiles(files, true, bin, false);
    // 3. 롱폼 소스 조각
    var it = src.projectItem;
    for (var p = 0; p < S.pieces.length; p++) {
        var pc = S.pieces[p];
        it.setInPoint(pc.src_in, 4); it.setOutPoint(pc.src_out, 4);
        s.videoTracks[0].overwriteClip(it, pc.at);
        var trs = [s.videoTracks[0], s.audioTracks[0]];
        for (var q = 0; q < 2; q++) {
            var cs = trs[q].clips, k = null;
            for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].inPoint.seconds - pc.src_in) < 0.05 && Math.abs(cs[c].start.seconds - pc.at) > 0.01 && cs[c].start.seconds > pc.at) k = cs[c];
            if (k) k.move(T(pc.at - k.start.seconds));
        }
        var vc = null, cs = s.videoTracks[0].clips; for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - pc.at) < 0.05) vc = cs[c];
        if (!vc) { log.push("조각 " + p + " 못 찾음"); continue; }
        var m = motion(vc); m.sc.setValue(pc.crop.k * 100, true);
        m.pos.setValue([(540 + (960 - pc.crop.cx) * pc.crop.k) / 1080, 958.5 / 1920], true);
    }
    try { it.clearInPoint(4); it.clearOutPoint(4); } catch (e) {}
    // 4. 이미지 배치
    function place(tr, item, t0, t1) { if (!item) { log.push("없음 " + t0); return; } s.videoTracks[tr].overwriteClip(item, t0); var cs = s.videoTracks[tr].clips; for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - t0) < 0.05) { cs[c].end = T(t1); return; } log.push("배치 실패 V" + (tr + 1) + " " + t0); }
    place(2, findItem(P.rootItem, "00_프레임.png"), 0, S.dur);
    for (var j = 0; j < S.subs.length; j++) place(3, inBin(bin, "sub_" + ("00" + j).slice(-3) + ".png"), S.subs[j].s, S.subs[j].e);
    for (var j = 0; j < S.boxes.length; j++) place(4, findItem(P.rootItem, S.boxes[j].file), S.boxes[j].s, S.boxes[j].e);
    place(5, inBin(bin, "title.png"), 0, S.dur);
    // 5. 시각 장치 제안 마커
    for (var j = 0; j < S.devices.length; j++) { var d = S.devices[j]; var mk = s.markers.createMarker(d.t); mk.name = "시각 장치 제안: " + d.kind; mk.comments = d.text; try { mk.setColorByIndex(3); } catch (e) {} }
    P.save();
    var cnt = []; for (var v = 0; v < 6; v++) cnt.push("V" + (v + 1) + ":" + s.videoTracks[v].clips.numItems);
    BUILD_RESULT = nm + " " + s.sequenceID + " | " + cnt.join(" ") + " A1:" + s.audioTracks[0].clips.numItems + " | 끝 " + (s.end / 254016000000).toFixed(2) + "/" + S.dur + (log.length ? " | " + log.join("; ") : "");
})();
