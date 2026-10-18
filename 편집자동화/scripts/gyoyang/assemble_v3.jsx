// 교양 에이전트 — 비워 둔 시퀀스(테스트영상_교양_v3)에 포인트 자막·자료화면·효과음을 plan 대로 넣는다 (2026-10-18)
// 사용자: "테스트영상_교양_v3 시퀀스에 지금까지 학습한 내용과 새로 추가된 그래픽 템플릿을 포함해서, 포인트 자막, 자료화면, 효과음 적재적소에 넣어줘."
// 사용: (function(){ PLAN="<plan_v3.json>"; STEP="tracks"|"images"|"graphics"|"sfx"|"clear"; AS_RESULT=""; $.evalFile("<이 파일>"); return AS_RESULT; })()
// assemble.jsx·assemble_points.jsx와 다른 점: 이미지·그래픽마다 트랙을 고름(이미지 겹쳐 바꾸기), 색 칸(0~255), 모션 위치(mo), 효과음마다 파일·dB
// plan 트랙 번호는 1부터. 점 칸 값은 픽셀 → 화면 크기로 나눠 넣음. MCP 45초 제한 → graphics는 from/to로 나눠 부른다
(function () {
    var P = app.project, log = [];
    var f = new File(PLAN); f.encoding = "UTF-8"; f.open("r"); var J = JSON.parse(f.read()); f.close();
    function seqByName(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function findBin(root, name) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == name) return c; var r = findBin(c, name); if (r) return r; } } return null; }
    function inBin(bin, name) { for (var i = 0; i < bin.children.numItems; i++) if (bin.children[i].name == name) return bin.children[i]; return null; }
    function T(sec) { var t = new Time(); t.seconds = sec; return t; }
    function lvl(db) { return Math.pow(10, (db - 15) / 20); }   // 볼륨 레벨 값 (0dB = 0.17783)
    function comp(clip, match) { for (var c = 0; c < clip.components.numItems; c++) if (clip.components[c].matchName == match) return clip.components[c]; return null; }
    function prop(cmp, name) { for (var p = 0; p < cmp.properties.numItems; p++) if (cmp.properties[p].displayName == name) return cmp.properties[p]; return null; }
    function clipAt(tr, t0) { var cs = tr.clips; for (var c = 0; c < cs.numItems; c++) if (Math.abs(cs[c].start.seconds - t0) < 0.05) return cs[c]; return null; }
    var bin = findBin(P.rootItem, J.bin) || P.rootItem.createBin(J.bin);
    var s = seqByName(J.seq);
    P.openSequence(s.sequenceID); P.activeSequence = s;

    if (STEP == "tracks") {
        for (var k in J.track_names) s.videoTracks[+k - 1].name = J.track_names[k];
        for (var k in J.audio_names) s.audioTracks[+k - 1].name = J.audio_names[k];
        for (var v = 1; v < s.videoTracks.numTracks; v++) s.videoTracks[v].setMute(0);
        var st = []; for (var v = 0; v < s.videoTracks.numTracks; v++) st.push("V" + (v + 1) + (s.videoTracks[v].isMuted() ? "(끔)" : ""));
        log.push(st.join(" "));
    }
    if (STEP == "clear") {   // v2에서 남은 효과음 등 지정 오디오 트랙 비우기
        for (var i = 0; i < J.clear_audio.length; i++) {
            var A = s.audioTracks[J.clear_audio[i] - 1], n0 = A.clips.numItems;
            for (var c = A.clips.numItems - 1; c >= 0; c--) A.clips[c].remove(false, false);
            log.push("A" + J.clear_audio[i] + " " + n0 + "개 지움");
        }
    }
    if (STEP == "fix") {   // 이미 올린 그래픽 고치기: {tr, s, remove} 또는 {tr, s, sl, pt, c}
        for (var k = 0; k < J.fix.length; k++) {
            var X = J.fix[k], cl = clipAt(s.videoTracks[X.tr - 1], X.s);
            if (!cl) { log.push("없음 V" + X.tr + "@" + X.s); continue; }
            if (X.remove) { cl.remove(false, false); log.push("지움 V" + X.tr + "@" + X.s); continue; }
            var m = cl.getMGTComponent(), setN = 0;
            for (var p = 0; p < m.properties.numItems; p++) {
                var pr = m.properties[p], nm = pr.displayName;
                if (X.sl && X.sl.hasOwnProperty(nm)) { pr.setValue(X.sl[nm], true); setN++; }
                else if (X.pt && X.pt.hasOwnProperty(nm)) { pr.setValue([X.pt[nm][0] / 1920, X.pt[nm][1] / 1080], true); setN++; }
                else if (X.c && X.c.hasOwnProperty(nm)) { var C = X.c[nm]; pr.setColorValue(255, C[0], C[1], C[2], true); setN++; }
            }
            log.push("V" + X.tr + "@" + X.s + " 칸" + setN);
        }
    }
    if (STEP == "images") {
        for (var k = 0; k < J.images.length; k++) {
            var I = J.images[k], V = s.videoTracks[I.tr - 1], nm = new File(I.f).displayName, it = inBin(bin, nm);
            if (!it) { P.importFiles([new File(I.f).fsName], true, bin, false); it = inBin(bin, nm); }
            if (clipAt(V, I.s)) continue;
            V.overwriteClip(it, I.s); var cl = clipAt(V, I.s); cl.end = T(I.e);
            // 키 시간은 클립 원본 시간 기준 (= in 점 + 지난 시간). 정지 이미지는 in 점이 3600초 근처 (2026-10-15 함정)
            var b0 = cl.inPoint.seconds, D = I.e - I.s, fi = (I.fin || 15) / 29.97, fo = (I.fout || 15) / 29.97;
            var mo = comp(cl, "AE.ADBE Motion"), sc = prop(mo, "비율 조정"); if (!sc.isTimeVarying()) sc.setTimeVarying(true);
            var z0 = I.z ? I.z[0] : 100, z1 = I.z ? I.z[1] : 106;
            sc.addKey(T(b0)); sc.setValueAtKey(T(b0), z0, true); sc.addKey(T(b0 + D)); sc.setValueAtKey(T(b0 + D), z1, true);   // 천천히 확대
            var op = prop(comp(cl, "AE.ADBE Opacity"), "불투명도"); op.setTimeVarying(true);   // 디졸브처럼 페이드
            if (fi > 0) { op.addKey(T(b0)); op.setValueAtKey(T(b0), 0, true); }
            op.addKey(T(b0 + fi)); op.setValueAtKey(T(b0 + fi), 100, true);
            op.addKey(T(b0 + D - fo)); op.setValueAtKey(T(b0 + D - fo), 100, true);
            if (fo > 0) { op.addKey(T(b0 + D - 1 / 29.97)); op.setValueAtKey(T(b0 + D - 1 / 29.97), 0, true); }
            log.push(nm + "@" + I.s);
        }
    }
    if (STEP == "graphics") {
        var n = 0, a = (typeof FROM != "undefined") ? FROM : 0, b = (typeof TO != "undefined") ? TO : J.graphics.length;
        for (var g = a; g < Math.min(b, J.graphics.length); g++) {
            var G = J.graphics[g], tr = s.videoTracks[G.tr - 1];
            if (clipAt(tr, G.s)) continue;
            var it = s.importMGT(J.mogrt_dir + "/" + G.t + ".mogrt", T(G.s).ticks, G.tr - 1, s.audioTracks.numTracks - 1);
            if (!it) { log.push("실패 " + G.t + " " + G.s); continue; }
            it.end = T(G.e);   // importMGT는 10초로 들어가 뒤 클립을 덮으니 바로 자름 (2026-10-17 함정)
            var m = it.getMGTComponent(), setN = 0, miss = [], want = {};
            var groups = [G.f, G.sl, G.pt, G.c];
            for (var q = 0; q < groups.length; q++) if (groups[q]) for (var x in groups[q]) want[x] = 1;
            for (var p = 0; p < m.properties.numItems; p++) {
                var pr = m.properties[p], nm = pr.displayName, v = ""; try { v = String(pr.getValue()); } catch (e) {}
                if (G.f && G.f.hasOwnProperty(nm) && v.indexOf("textEditValue") >= 0) {
                    var j = JSON.parse(v), tx = G.f[nm]; j.textEditValue = tx; j.fontTextRunLength = [tx.length]; j.capPropTextRunCount = 1;
                    var A_ = ["fontEditValue", "fontFSAllCapsValue", "fontFSBoldValue", "fontFSItalicValue", "fontFSSmallCapsValue", "fontSizeEditValue"];
                    for (var y = 0; y < A_.length; y++) if (j[A_[y]] && j[A_[y]].length) j[A_[y]] = [j[A_[y]][0]];
                    pr.setValue(JSON.stringify(j), true); setN++; delete want[nm];
                } else if (G.sl && G.sl.hasOwnProperty(nm)) { pr.setValue(G.sl[nm], true); setN++; delete want[nm]; }
                else if (G.pt && G.pt.hasOwnProperty(nm)) { pr.setValue([G.pt[nm][0] / 1920, G.pt[nm][1] / 1080], true); setN++; delete want[nm]; }
                else if (G.c && G.c.hasOwnProperty(nm)) { var C = G.c[nm]; try { pr.setColorValue(255, C[0], C[1], C[2], true); setN++; delete want[nm]; } catch (e) { log.push("색 실패 " + nm); } }
            }
            if (G.mo) { var mo = comp(it, "AE.ADBE Motion"); prop(mo, "위치").setValue([G.mo[0] / 1920, G.mo[1] / 1080], true); }
            for (var x in want) miss.push(x);
            try { it.name = G.name || G.t.replace("정보성_", "").replace("교양_", "").replace("_AE", ""); } catch (e) {}
            n++; log.push(g + ":" + G.t.substr(0, 8) + "@" + G.s + " 칸" + setN + (miss.length ? " 못찾음:" + miss.join("/") : ""));
        }
        log.push("그래픽 " + n);
    }
    if (STEP == "sfx") {
        var cnt = 0;
        for (var k = 0; k < J.sfx.length; k++) {
            var X = J.sfx[k], A = s.audioTracks[X.tr - 1], nm = X.f, it = inBin(bin, nm);
            if (!it) { P.importFiles([new File(J.sfx_dir + "/" + nm).fsName], true, bin, false); it = inBin(bin, nm); }
            if (!it) { log.push("못 가져옴 " + nm); continue; }
            if (clipAt(A, X.t)) continue;
            A.overwriteClip(it, X.t); var cl = clipAt(A, X.t);
            if (cl) { if (X.len) cl.end = T(X.t + X.len); prop(comp(cl, "Internal Volume Stereo"), "레벨").setValue(lvl(X.db), true); cnt++; }
        }
        log.push("효과음 " + cnt);
    }
    P.save();
    var cnts = []; for (var v = 0; v < s.videoTracks.numTracks; v++) cnts.push("V" + (v + 1) + ":" + s.videoTracks[v].clips.numItems);
    for (var a2 = 0; a2 < s.audioTracks.numTracks; a2++) cnts.push("A" + (a2 + 1) + ":" + s.audioTracks[a2].clips.numItems);
    AS_RESULT = STEP + " | " + log.join("; ") + " | " + cnts.join(" ");
})();
