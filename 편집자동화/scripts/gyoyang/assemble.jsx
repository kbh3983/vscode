// 교양 에이전트 — plan.json 대로 원본 시퀀스를 복제해 그래픽·자료화면·효과음·자막 트랙·음량을 넣는다
// 사용: (function(){ PLAN="<plan.json>"; STEP="all"|"base"|"graphics"|"images"|"sfx"|"captions"; AS_RESULT=""; $.evalFile("<이 파일>"); return AS_RESULT; })()
// 트랙: V1 원본 / V2 자료화면 / V3 인용·칠판 / V4 큰자막·Question / V5 이름·웃음 / V6 소제목 띠 / A1 원본(게인) / A2 효과음
// 단계별로 나눠 부른다 (MCP 45초 제한). 원본 시퀀스는 건드리지 않는다
// 주의: images 단계가 2026-10-15 한 번 "\) does not have a value"로 실패해 같은 내용을 직접 실행함 — 다시 쓸 때 먼저 한 장으로 시험
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
    var bin = findBin(P.rootItem, "교양_테스트") || P.rootItem.createBin("교양_테스트");
    var s = seqByName(J.dst);

    if (STEP == "base" || STEP == "all") {
        if (!s) {
            var b = {}; for (var i = 0; i < P.sequences.numSequences; i++) b[P.sequences[i].sequenceID] = 1;
            seqByName(J.src).clone(); for (var i = 0; i < P.sequences.numSequences; i++) if (!b[P.sequences[i].sequenceID]) s = P.sequences[i];
            s.name = J.dst; log.push("복제 " + s.sequenceID);
        }
        P.openSequence(s.sequenceID); P.activeSequence = s;
        app.enableQE(); var q = qe.project.getActiveSequence();
        if (s.videoTracks.numTracks < 6) q.addTracks(6 - s.videoTracks.numTracks, s.videoTracks.numTracks, 0);
        log.push("영상 트랙 " + s.videoTracks.numTracks + " / 오디오 " + s.audioTracks.numTracks);
        var a = s.audioTracks[0].clips;
        for (var c = 0; c < a.numItems; c++) prop(comp(a[c], "Internal Volume Stereo"), "레벨").setValue(lvl(J.gain_db), true);
        log.push("A1 게인 " + J.gain_db + "dB");
    }
    if (STEP == "graphics" || STEP == "all") {
        var n = 0;
        for (var g = 0; g < J.graphics.length; g++) {
            var G = J.graphics[g], tr = s.videoTracks[G.tr];
            if (clipAt(tr, G.s)) continue;
            var it = s.importMGT(J.mogrt_dir + "/" + G.t + ".mogrt", T(G.s).ticks, G.tr, s.audioTracks.numTracks - 1);
            if (!it) { log.push("실패 " + G.t + " " + G.s); continue; }
            var m = it.getMGTComponent(), setN = 0;
            for (var p = 0; p < m.properties.numItems; p++) {
                var pr = m.properties[p], nm = pr.displayName, v = ""; try { v = String(pr.getValue()); } catch (e) {}
                if (G.f && G.f.hasOwnProperty(nm) && v.indexOf("textEditValue") >= 0) {
                    var j = JSON.parse(v), tx = G.f[nm]; j.textEditValue = tx; j.fontTextRunLength = [tx.length]; j.capPropTextRunCount = 1;
                    var A_ = ["fontEditValue", "fontFSAllCapsValue", "fontFSBoldValue", "fontFSItalicValue", "fontFSSmallCapsValue", "fontSizeEditValue"];
                    for (var x = 0; x < A_.length; x++) if (j[A_[x]] && j[A_[x]].length) j[A_[x]] = [j[A_[x]][0]];
                    pr.setValue(JSON.stringify(j), true); setN++;
                } else if (G.sl && G.sl.hasOwnProperty(nm)) { pr.setValue(G.sl[nm], true); setN++; }
                else if (G.pt && G.pt.hasOwnProperty(nm)) { pr.setValue([G.pt[nm][0] / 1920, G.pt[nm][1] / 1080], true);   // AE 점 컨트롤 값 = 픽셀 ÷ 화면 크기 (0.5,0.5를 넣으면 960,540px 밀림) setN++; }
            }
            it.end = T(G.e); try { it.name = G.t.replace("교양_", "").replace("_AE", ""); } catch (e) {}
            n++; log.push(G.t + " " + G.s + " 칸 " + setN);
        }
        log.push("그래픽 " + n);
    }
    if (STEP == "images" || STEP == "all") {
        var V2 = s.videoTracks[1];
        for (var k = 0; k < J.images.length; k++) {
            var I = J.images[k], nm = new File(I.f).displayName, it = inBin(bin, nm);
            if (!it) { P.importFiles([new File(I.f).fsName], true, bin, false); it = inBin(bin, nm); }
            if (clipAt(V2, I.s)) continue;
            V2.overwriteClip(it, I.s); var cl = clipAt(V2, I.s); cl.end = T(I.e);
            // 키 시간은 클립 원본 시간 기준 (= in 점 + 클립 안에서 지난 시간). 정지 이미지는 in 점이 3600초 근처라 시퀀스 시간을 그대로 쓰면 안 보임 (2026-10-15)
            var b0 = cl.inPoint.seconds, D = I.e - I.s, fd = 15 / 29.97;
            var mo = comp(cl, "AE.ADBE Motion"), sc = prop(mo, "비율 조정"); if (!sc.isTimeVarying()) sc.setTimeVarying(true);
            sc.addKey(T(b0)); sc.setValueAtKey(T(b0), 100, true); sc.addKey(T(b0 + D)); sc.setValueAtKey(T(b0 + D), 106, true);   // 천천히 확대
            var op = prop(comp(cl, "AE.ADBE Opacity"), "불투명도"); op.setTimeVarying(true);   // 디졸브처럼 15프레임 페이드
            op.addKey(T(b0)); op.setValueAtKey(T(b0), 0, true); op.addKey(T(b0 + fd)); op.setValueAtKey(T(b0 + fd), 100, true);
            op.addKey(T(b0 + D - fd)); op.setValueAtKey(T(b0 + D - fd), 100, true); op.addKey(T(b0 + D - 1 / 29.97)); op.setValueAtKey(T(b0 + D - 1 / 29.97), 0, true);
            log.push("이미지 " + nm + " " + I.s);
        }
    }
    if (STEP == "sfx" || STEP == "all") {
        var A2 = s.audioTracks[1], cnt = 0;
        for (var k = 0; k < J.sfx.length; k++) {
            var nm = J.sfx[k][0] + ".wav", t0 = J.sfx[k][1], it = inBin(bin, nm);
            if (!it) { P.importFiles([new File(J.sfx_dir + "/" + nm).fsName], true, bin, false); it = inBin(bin, nm); }
            if (clipAt(A2, t0)) continue;
            A2.overwriteClip(it, t0); var cl = clipAt(A2, t0);
            if (cl) { prop(comp(cl, "Internal Volume Stereo"), "레벨").setValue(lvl(J.sfx_db[J.sfx[k][0]]), true); cnt++; }
        }
        log.push("효과음 " + cnt);
    }
    if (STEP == "captions" || STEP == "all") {
        var nm = new File(J.srt).displayName, it = inBin(bin, nm);
        if (!it) { P.importFiles([new File(J.srt).fsName], true, bin, false); it = inBin(bin, nm); }
        log.push("자막 트랙 " + s.createCaptionTrack(it, 0));
    }
    P.save();
    var cnts = []; for (var v = 0; v < s.videoTracks.numTracks; v++) cnts.push("V" + (v + 1) + ":" + s.videoTracks[v].clips.numItems);
    for (var a2 = 0; a2 < s.audioTracks.numTracks; a2++) cnts.push("A" + (a2 + 1) + ":" + s.audioTracks[a2].clips.numItems);
    AS_RESULT = STEP + " | " + log.join("; ") + " | " + cnts.join(" ");
})();
