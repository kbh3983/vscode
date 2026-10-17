// 교양 에이전트 — 포인트자막 대안을 새 트랙에 넣는다 (plan_points.json). 기존 클립은 지우지 않고 기존 그래픽 트랙은 눈만 끔
// 2026-10-17 사용자: "테스트영상_교양_v2 시퀀스에 적절한 포인트자막 새로운 트랙에 추가해줘. 기존에 있던 거랑 새로 추가된 거랑 더 나은 걸로 선택해서 작업하려고 해."
//   → 답: 기존 자리 1:1 + 새 자리 추가 / 같은 채널(지식인초대석) 템플릿 우선 / 기존 끄고 새 것만 켜기
// 사용: (function(){ PLAN="<plan_points.json>"; STEP="tracks"|"graphics"|"sfx"; AS_RESULT=""; $.evalFile("<이 파일>"); return AS_RESULT; })()
// plan의 트랙 번호는 1부터 (V7 = 7). 점 칸 값은 픽셀 → 화면 크기로 나눠 넣음
(function () {
    var P = app.project, log = [];
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var J = JSON.parse(f.read()); f.close();
    function seqByName(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function findBin(root, name) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == name) return c; var r = findBin(c, name); if (r) return r; } } return null; }
    function inBin(bin, name) { for (var i = 0; i < bin.children.numItems; i++) if (bin.children[i].name == name) return bin.children[i]; return null; }
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    function lvl(db) { return Math.pow(10, (db - 15) / 20); }
    function comp(clip, match) { for (var c = 0; c < clip.components.numItems; c++) if (clip.components[c].matchName == match) return clip.components[c]; return null; }
    function prop(cmp, name) { for (var p = 0; p < cmp.properties.numItems; p++) if (cmp.properties[p].displayName == name) return cmp.properties[p]; return null; }
    function clipAt(tr, t0) { var cs = tr.clips; for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - t0) < 0.05) return cs[c]; return null; }
    var s = seqByName(J.seq);
    P.openSequence(s.sequenceID); P.activeSequence = s;

    if (STEP == "tracks") {
        var need = 0; for (var k in J.new_tracks) need = Math.max(need, +k);
        app.enableQE(); var q = qe.project.getActiveSequence();
        if (s.videoTracks.numTracks < need) q.addTracks(need - s.videoTracks.numTracks, s.videoTracks.numTracks, 0);
        for (var k in J.new_tracks) { try { s.videoTracks[+k - 1].name = J.new_tracks[k]; } catch (e) {} }
        for (var i = 0; i < J.hide_tracks.length; i++) s.videoTracks[J.hide_tracks[i] - 1].setMute(1);
        for (var i = 0; i < J.off_tracks.length; i++) s.videoTracks[J.off_tracks[i] - 1].setMute(1);
        var st = []; for (var v = 0; v < s.videoTracks.numTracks; v++) st.push("V" + (v + 1) + (s.videoTracks[v].isMuted() ? "(끔)" : ""));
        log.push(st.join(" "));
    }
    if (STEP == "graphics") {
        var n = 0;
        for (var g = 0; g < J.graphics.length; g++) {
            var G = J.graphics[g], tr = s.videoTracks[G.tr - 1];
            if (clipAt(tr, G.s)) continue;
            var it = s.importMGT(J.mogrt_dir + "/" + G.t + ".mogrt", T(G.s).ticks, G.tr - 1, s.audioTracks.numTracks - 1);
            if (!it) { log.push("실패 " + G.t + " " + G.s); continue; }
            var m = it.getMGTComponent(), setN = 0, miss = [];
            var want = {}; for (var x in G.f) want[x] = 1; if (G.sl) for (var x in G.sl) want[x] = 1; if (G.pt) for (var x in G.pt) want[x] = 1;
            for (var p = 0; p < m.properties.numItems; p++) {
                var pr = m.properties[p], nm = pr.displayName, v = ""; try { v = String(pr.getValue()); } catch (e) {}
                if (G.f && G.f.hasOwnProperty(nm) && v.indexOf("textEditValue") >= 0) {
                    var j = JSON.parse(v), tx = G.f[nm]; j.textEditValue = tx; j.fontTextRunLength = [tx.length]; j.capPropTextRunCount = 1;
                    var A_ = ["fontEditValue", "fontFSAllCapsValue", "fontFSBoldValue", "fontFSItalicValue", "fontFSSmallCapsValue", "fontSizeEditValue"];
                    for (var y = 0; y < A_.length; y++) if (j[A_[y]] && j[A_[y]].length) j[A_[y]] = [j[A_[y]][0]];
                    pr.setValue(JSON.stringify(j), true); setN++; delete want[nm];
                } else if (G.sl && G.sl.hasOwnProperty(nm)) { pr.setValue(G.sl[nm], true); setN++; delete want[nm]; }
                else if (G.pt && G.pt.hasOwnProperty(nm)) { pr.setValue([G.pt[nm][0] / 1920, G.pt[nm][1] / 1080], true); setN++; delete want[nm]; }
            }
            for (var x in want) miss.push(x);
            it.end = T(G.e); try { it.name = G.t.replace("정보성_", "").replace("_AE", ""); } catch (e) {}
            n++; log.push(G.t.substr(4, 2) + "@" + G.s + " 칸" + setN + (miss.length ? " 못찾음:" + miss.join("/") : ""));
        }
        log.push("그래픽 " + n);
    }
    if (STEP == "sfx") {
        var bin = findBin(P.rootItem, "교양_테스트"), A = s.audioTracks[J.sfx_track - 1], cnt = 0;
        for (var k = 0; k < J.sfx.length; k++) {
            var nm = J.sfx[k][0] + ".wav", t0 = J.sfx[k][1], it = inBin(bin, nm);
            if (!it) { P.importFiles([new File(J.sfx_dir + "/" + nm).fsName], true, bin, false); it = inBin(bin, nm); }
            if (clipAt(A, t0)) continue;
            A.overwriteClip(it, t0); var cl = clipAt(A, t0);
            if (cl) { prop(comp(cl, "Internal Volume Stereo"), "레벨").setValue(lvl(J.sfx_db[J.sfx[k][0]]), true); cnt++; }
        }
        log.push("효과음 " + cnt);
    }
    P.save();
    var cnts = []; for (var v = 0; v < s.videoTracks.numTracks; v++) cnts.push("V" + (v + 1) + ":" + s.videoTracks[v].clips.numItems);
    for (var a2 = 0; a2 < s.audioTracks.numTracks; a2++) cnts.push("A" + (a2 + 1) + ":" + s.audioTracks[a2].clips.numItems);
    AS_RESULT = STEP + " | " + log.join("; ") + " | " + cnts.join(" ");
})();
