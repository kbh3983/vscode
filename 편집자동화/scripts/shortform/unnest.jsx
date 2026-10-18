// 숏폼 에이전트 — V1·A1 중첩 클립(<롱폼>_숏폼소스_샷)을 롱폼 원본 클립으로 풀기 (2026-10-16)
// 사용자: "왜 롱폼 원본을 사용하지 않고 중첩 시퀀스로 불러온 거야? 내가 컷 수정하기가 불편하네"
//   → 중첩 대신 원본 카메라 클립을 그대로 놓고, 롱폼에서 넣은 효과(Lumetri 색상·모노 오디오 효과)는 다시 넣어 값 복사
//   스크립트에는 "시퀀스를 개별 클립으로 넣기" 버튼·효과 복사가 없어서 직접 계산함
// 사용: (function(){ SRC_NAME="<숏폼>_정리3"; DST_NAME="<숏폼>_정리4"; MODE="plan|init|video|audio|check"; UN_RESULT=""; $.evalFile("<이 파일>"); return UN_RESULT; })()
//   plan  = 풀 조각 목록만 (바꾸지 않음)
//   init  = SRC를 복제해 DST (자막·프레임·하단 안내 그대로) + V1·A1 비움
//   video = 보이는 영상 조각을 V1에 (위치·비율 = 중첩 클립 값 × 안쪽 클립 값, Lumetri 복사). 같이 들어온 오디오는 지움
//   audio = A1 조각(소리만 서브클립) + 볼륨·채널 혼합기·선택적 제한 값 복사
//   check = 조각 수·틈
(function () {
    var P = app.project, log = [];
    var TPS = 254016000000;
    function seqByName(n) { for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].name == n) return P.sequences[i]; return null; }
    function TK(tk) { var t = new Time(); t.ticks = String(Math.round(tk)); return t; }
    function tk(t) { return Number(t.ticks); }
    function comp(k, name) { for (var z = 0; z < k.components.numItems; z++) if (k.components[z].displayName == name) return k.components[z]; return null; }
    function prop(c, name) { for (var y = 0; y < c.properties.numItems; y++) if (c.properties[y].displayName == name) return c.properties[y]; return null; }
    function fb(root, n) { for (var i = 0; i < root.children.numItems; i++) { var c = root.children[i]; if (c.type == 2) { if (c.name == n) return c; var r = fb(c, n); if (r) return r; } } return null; }

    var src = seqByName(SRC_NAME);
    if (!src) { UN_RESULT = "없음 " + SRC_NAME; return; }
    var nest = src.videoTracks[0].clips[0].projectItem, inner = null;
    for (var i = 0; i < P.sequences.numSequences; i++) if (P.sequences[i].projectItem.nodeId == nest.nodeId) inner = P.sequences[i];
    if (!inner) { UN_RESULT = "V1이 중첩 시퀀스가 아님"; return; }
    var iset = inner.getSettings(), IW = iset.videoFrameWidth, IH = iset.videoFrameHeight;

    // 숏폼 V1 구간 (중첩 클립마다)
    var segs = [], sv = src.videoTracks[0].clips;
    for (var c = 0; c < sv.numItems; c++) {
        var k = sv[c], m = comp(k, "모션");
        segs.push({ st: tk(k.start), en: tk(k.end), sin: tk(k.inPoint), S: prop(m, "비율 조정").getValue(), Pp: prop(m, "위치").getValue(), off: k.disabled });
    }
    // 안쪽에서 보이는 영상 조각: 켜진 클립 중 가장 위 트랙
    function videoPieces(sg) {
        var a = sg.sin, b = sg.sin + (sg.en - sg.st), cut = [a, b], cand = [];
        for (var v = 0; v < inner.videoTracks.numTracks; v++) {
            var cs = inner.videoTracks[v].clips;
            for (var j = 0; j < cs.numItems; j++) {
                var x = cs[j]; if (x.disabled) continue;
                var s0 = tk(x.start), e0 = tk(x.end); if (e0 <= a || s0 >= b) continue;
                cand.push({ v: v, k: x, s: s0, e: e0 });
                if (s0 > a) cut.push(s0); if (e0 < b) cut.push(e0);
            }
        }
        cut.sort(function (p, q) { return p - q; });
        var out = [];
        for (var i = 0; i + 1 < cut.length; i++) {
            var p0 = cut[i], p1 = cut[i + 1]; if (p1 - p0 < 1) continue;
            var mid = (p0 + p1) / 2, top = null;
            for (var j = 0; j < cand.length; j++) if (cand[j].s <= mid && mid < cand[j].e && (!top || cand[j].v > top.v)) top = cand[j];
            if (!top) { out.push({ gap: true, s: p0, e: p1 }); continue; }
            var L = out.length ? out[out.length - 1] : null;
            if (L && !L.gap && L.c.k == top.k && Math.abs(L.e - p0) < 1) L.e = p1; else out.push({ c: top, s: p0, e: p1 });
        }
        return out;
    }
    // (안 씀) 3프레임 미만 조각을 옆에 붙이기 — 미디어가 끊긴 곳에서 1프레임 밀려서 place()의 6프레임 놓기로 바꿈
    function tiny(out) {
        var F = TPS / 29.97 * 2.5;
        for (var i = 0; i < out.length; i++) {
            if (out[i].e - out[i].s >= F || out.length < 2) continue;
            if (i + 1 < out.length) out[i + 1].s = out[i].s; else out[i - 1].e = out[i].e;
            out.splice(i, 1); i--;
        }
        return out;
    }
    function audioPieces(sg) {
        var a = sg.sin, b = sg.sin + (sg.en - sg.st), out = [];
        for (var t = 0; t < inner.audioTracks.numTracks; t++) {
            if (inner.audioTracks[t].isMuted()) continue;
            var cs = inner.audioTracks[t].clips;
            for (var j = 0; j < cs.numItems; j++) {
                var x = cs[j]; if (x.disabled) continue;
                var s0 = tk(x.start), e0 = tk(x.end); if (e0 <= a || s0 >= b) continue;
                out.push({ t: t, k: x, s: Math.max(s0, a), e: Math.min(e0, b) });
            }
        }
        out.sort(function (p, q) { return p.s - q.s; });
        return out;
    }
    function T2s(x) { return (x / TPS).toFixed(3); }

    if (MODE == "plan") {
        for (var i = 0; i < segs.length; i++) {
            var sg = segs[i], vp = videoPieces(sg), ap = audioPieces(sg), r = [];
            for (var j = 0; j < vp.length; j++) r.push(vp[j].gap ? "빈곳 " + T2s(vp[j].s) : "V" + (vp[j].c.v + 1) + " " + vp[j].c.k.name + " " + T2s(vp[j].s) + "-" + T2s(vp[j].e));
            var r2 = []; for (var j = 0; j < ap.length; j++) r2.push("A" + (ap[j].t + 1) + " " + ap[j].k.name + " " + T2s(ap[j].s) + "-" + T2s(ap[j].e));
            log.push(i + " [" + T2s(sg.st) + "-" + T2s(sg.en) + "] " + r.join(", ") + " | " + r2.join(", "));
        }
        UN_RESULT = inner.name + " " + IW + "x" + IH + "\n" + log.join("\n"); return;
    }

    if (MODE == "init") {
        if (seqByName(DST_NAME)) { UN_RESULT = "이미 있음 " + DST_NAME; return; }
        var before = {}; for (var i = 0; i < P.sequences.numSequences; i++) before[P.sequences[i].sequenceID] = 1;
        src.clone();
        var d = null; for (var i = 0; i < P.sequences.numSequences; i++) if (!before[P.sequences[i].sequenceID]) d = P.sequences[i];
        if (!d) { UN_RESULT = "복제 실패"; return; }
        d.name = DST_NAME;
        var vc = d.videoTracks[0].clips; for (var c = vc.numItems - 1; c >= 0; c--) vc[c].remove(false, false);
        for (var t = 0; t < d.audioTracks.numTracks; t++) { var ac = d.audioTracks[t].clips; for (var c = ac.numItems - 1; c >= 0; c--) ac[c].remove(false, false); }
        P.save();
        UN_RESULT = "만듦 " + d.name + " V1 " + d.videoTracks[0].clips.numItems + " A1 " + d.audioTracks[0].clips.numItems; return;
    }

    var d = seqByName(DST_NAME);
    if (!d) { UN_RESULT = "없음 " + DST_NAME; return; }
    P.openSequence(d.sequenceID); P.activeSequence = d; app.enableQE();
    var q = qe.project.getActiveSequence();
    var dset = d.getSettings(), W = dset.videoFrameWidth, H = dset.videoFrameHeight;

    // 조각은 붙이지 않고 그대로: 3프레임 미만은 놓이지 않으므로 6프레임으로 놓고 끝을 줄임(남는 꼬리는 다음 조각이 덮음)
    // 초로 넣으면 프레임 아래로 잘려 1프레임 앞이 됨 → 0.002초 더해 넣음
    function place(track, item, s0, e0, mediaIn) {
        var len = Math.max(e0 - s0, TPS / 29.97 * 6);
        try { item.clearInPoint(4); item.clearOutPoint(4); } catch (e) {}
        item.setInPoint(mediaIn / TPS + 0.002, 4); item.setOutPoint((mediaIn + len) / TPS + 0.002, 4);
        track.overwriteClip(item, s0 / TPS);
        var cs = track.clips, nk = null, idx = -1;
        for (var j = 0; j < cs.numItems; j++) if (Math.abs(tk(cs[j].start) - s0) < TPS / 100) { nk = cs[j]; idx = j; }
        if (nk) nk.end = TK(e0);
        try { item.clearInPoint(4); item.clearOutPoint(4); } catch (e) {}
        return { k: nk, idx: idx };
    }
    function qeItem(qt, idx) { var n = -1; for (var j = 0; j < qt.numItems; j++) { var it = qt.getItemAt(j); if (it.type == "Empty") continue; n++; if (n == idx) return it; } return null; }
    function copyProps(from, to) {
        var bad = 0;
        for (var y = 0; y < from.properties.numItems && y < to.properties.numItems; y++) {
            try { var v = from.properties[y].getValue(); if (v === undefined || v === null) continue; to.properties[y].setValue(v, true); } catch (e) { bad++; }
        }
        return bad;
    }

    if (MODE == "video") {
        var V = d.videoTracks[0], qt = q.getVideoTrackAt(0), lumE = qe.project.getVideoEffectByName("Lumetri 색상");
        var n = 0, nl = 0, bad = 0;
        for (var i = 0; i < segs.length; i++) {
            var sg = segs[i], vp = videoPieces(sg);
            for (var j = 0; j < vp.length; j++) {
                var pc = vp[j]; if (pc.gap) { log.push("빈곳 " + i); continue; }
                var ik = pc.c.k, pos0 = sg.st + (pc.s - sg.sin), pos1 = sg.st + (pc.e - sg.sin);
                var r = place(V, ik.projectItem, pos0, pos1, tk(ik.inPoint) + (pc.s - tk(ik.start)));
                if (!r.k) { log.push("못 놓음 " + i + "/" + j); continue; }
                if (sg.off) r.k.disabled = true;
                // 모션 합치기: 숏폼 화면 위 점 = 중첩 위치 + 중첩 비율 × (안쪽 위치 − 안쪽 가운데)
                var im = comp(ik, "모션"), nm = comp(r.k, "모션");
                var si = prop(im, "비율 조정").getValue(), ip = prop(im, "위치").getValue(), S = sg.S / 100;
                var px = sg.Pp[0] * W + S * (ip[0] * IW - IW / 2), py = sg.Pp[1] * H + S * (ip[1] * IH - IH / 2);
                prop(nm, "위치").setValue([px / W, py / H], true);
                prop(nm, "비율 조정").setValue(si * S, true);
                var cr = ["왼쪽 자르기", "위쪽 자르기", "오른쪽 자르기", "아래쪽 자르기", "회전", "기준점"];
                for (var z = 0; z < cr.length; z++) { var a = prop(im, cr[z]), b = prop(nm, cr[z]); if (a && b) try { b.setValue(a.getValue(), true); } catch (e) {} }
                var io = comp(ik, "불투명도"), no = comp(r.k, "불투명도"); if (io && no) try { no.properties[0].setValue(io.properties[0].getValue(), true); } catch (e) {}
                var il = comp(ik, "Lumetri 색상");
                if (il) {
                    var qi = qeItem(qt, r.idx); if (qi) qi.addVideoEffect(lumE);
                    var nlc = comp(r.k, "Lumetri 색상"); if (nlc) { bad += copyProps(il, nlc); nl++; } else log.push("Lumetri 못 넣음 " + i + "/" + j);
                }
                n++;
            }
        }
        // 같이 들어온 오디오 지우기
        var ra = 0; for (var t = 0; t < d.audioTracks.numTracks; t++) { var ac = d.audioTracks[t].clips; for (var c = ac.numItems - 1; c >= 0; c--) { ac[c].remove(false, false); ra++; } }
        P.save();
        UN_RESULT = "영상 조각 " + n + " (Lumetri " + nl + ", 복사 못한 값 " + bad + ") 같이 들어온 오디오 지움 " + ra + " | " + log.join("; ");
        return;
    }

    if (MODE == "audio") {
        var A = d.audioTracks[0], qa = q.getAudioTrackAt(0);
        var mxE = qe.project.getAudioEffectByName("채널 혼합기"), lmE = qe.project.getAudioEffectByName("선택적 제한");
        var subs = {}, bin = fb(P.rootItem, "숏폼_오디오") || fb(P.rootItem, "숏폼").createBin("숏폼_오디오");
        function audioOnly(it) {
            if (subs[it.nodeId]) return subs[it.nodeId];
            var nm = it.name + "_소리", f = null;
            for (var j = 0; j < bin.children.numItems; j++) if (bin.children[j].name == nm) f = bin.children[j];
            if (!f) {
                try { it.clearInPoint(4); it.clearOutPoint(4); } catch (e) {}
                f = it.createSubClip(nm, TK(0), TK(tk(it.getOutPoint(4))), 0, 0, 1);   // 하드 경계 없음, 영상 X, 소리 O
                if (f) f.moveBin(bin);
            }
            subs[it.nodeId] = f; return f;
        }
        var n = 0, bad = 0;
        for (var i = 0; i < segs.length; i++) {
            var sg = segs[i], ap = audioPieces(sg), ok = comp(src.audioTracks[0].clips[i], "볼륨");
            var outer = ok ? prop(ok, "레벨").getValue() : 0.17782794;
            if (Math.abs(outer - 0.17782794) > 0.001) log.push("중첩 볼륨 0dB 아님 " + i);
            for (var j = 0; j < ap.length; j++) {
                var pc = ap[j], ik = pc.k, pos0 = sg.st + (pc.s - sg.sin), pos1 = sg.st + (pc.e - sg.sin);
                var r = place(A, audioOnly(ik.projectItem), pos0, pos1, tk(ik.inPoint) + (pc.s - tk(ik.start)));
                if (!r.k) { log.push("못 놓음 " + i + "/" + j); continue; }
                var iv = comp(ik, "볼륨"), nv = comp(r.k, "볼륨"); if (iv && nv) bad += copyProps(iv, nv);
                var icv = comp(ik, "채널 볼륨"), ncv = comp(r.k, "채널 볼륨"); if (icv && ncv) bad += copyProps(icv, ncv);
                var mx = null, lims = [];
                for (var z = 0; z < ik.components.numItems; z++) { var co = ik.components[z]; if (co.displayName == "채널 혼합기") mx = co; if (co.displayName == "선택적 제한" && !co.properties[0].getValue()) lims.push(co); }
                var qi = qeItem(qa, r.idx);
                if (mx && qi) qi.addAudioEffect(mxE);
                for (var z = 0; z < lims.length; z++) if (qi) qi.addAudioEffect(lmE);
                var nmx = null, nls = [];
                for (var z = 0; z < r.k.components.numItems; z++) { var co = r.k.components[z]; if (co.displayName == "채널 혼합기") nmx = co; if (co.displayName == "선택적 제한") nls.push(co); }
                if (mx && nmx) bad += copyProps(mx, nmx); else if (mx) log.push("혼합기 못 넣음 " + i);
                for (var z = 0; z < lims.length && z < nls.length; z++) bad += copyProps(lims[z], nls[z]);
                n++;
            }
        }
        // 1프레임 틈 메우기
        for (var t3 = 0; t3 < 2; t3++) { var c4 = [d.videoTracks[0], A][t3].clips; for (var j = 0; j < c4.numItems - 1; j++) { var gap = (tk(c4[j + 1].start) - tk(c4[j].end)) / TPS; if (gap > 0.0001 && gap < 0.1) c4[j].end = TK(tk(c4[j + 1].start)); } }
        P.save();
        UN_RESULT = "오디오 조각 " + n + " (복사 못한 값 " + bad + ") | " + log.join("; ");
        return;
    }

    // verify = 프레임마다(1/29.97초) SRC(중첩)와 DST(원본 클립)의 원본 미디어 위치·캠 비교
    if (MODE == "verify") {
        function at(cs, t) { for (var j = 0; j < cs.numItems; j++) if (cs[j].start.seconds <= t && t < cs[j].end.seconds) return cs[j]; return null; }
        function topV(t) { for (var v = inner.videoTracks.numTracks - 1; v >= 0; v--) { var cs = inner.videoTracks[v].clips; for (var j = 0; j < cs.numItems; j++) { var k = cs[j]; if (!k.disabled && k.start.seconds <= t && t < k.end.seconds) return k; } } return null; }
        var ia = null; for (var t = 0; t < inner.audioTracks.numTracks; t++) if (!inner.audioTracks[t].isMuted() && inner.audioTracks[t].clips.numItems) { ia = inner.audioTracks[t]; break; }
        var bad = [], n0 = 0, end = tk(sv[sv.numItems - 1].end) / TPS;
        for (var t = 0.017; t < end - 0.02; t += 1 / 29.97) {
            n0++;
            var n = at(sv, t); if (!n) continue;
            var it = n.inPoint.seconds + (t - n.start.seconds), kv = topV(it), ka = at(ia.clips, it);
            var nv = at(d.videoTracks[0].clips, t), na = at(d.audioTracks[0].clips, t);
            var dv = kv && nv ? Math.round(((nv.inPoint.seconds + t - nv.start.seconds) - (kv.inPoint.seconds + it - kv.start.seconds)) * 29.97) : 99;
            var da = ka && na ? Math.round(((na.inPoint.seconds + t - na.start.seconds) - (ka.inPoint.seconds + it - ka.start.seconds)) * 29.97) : 99;
            var mv = nv && kv && nv.projectItem.name != kv.projectItem.name;
            if (dv || da || mv) bad.push(t.toFixed(2) + " 영상" + dv + (mv ? "(캠)" : "") + " 소리" + da);
        }
        UN_RESULT = DST_NAME + " 검사 " + n0 + "프레임, 다른 것 " + bad.length + (bad.length ? " | " + bad.slice(0, 15).join("; ") : "");
        return;
    }

    if (MODE == "check") {
        var r = [];
        for (var t = 0; t < 2; t++) {
            var cs = t ? d.audioTracks[0].clips : d.videoTracks[0].clips, gaps = 0, fx = {};
            for (var j = 0; j < cs.numItems; j++) {
                if (j + 1 < cs.numItems && tk(cs[j + 1].start) - tk(cs[j].end) > 1) gaps++;
                for (var z = 0; z < cs[j].components.numItems; z++) { var nm = cs[j].components[z].displayName; fx[nm] = (fx[nm] || 0) + 1; }
            }
            var a = []; for (var x in fx) a.push(x + " " + fx[x]);
            r.push((t ? "A1 " : "V1 ") + cs.numItems + "개 틈 " + gaps + " 끝 " + T2s(tk(cs[cs.numItems - 1].end)) + " | " + a.join(", "));
        }
        r.push("원래 끝 " + T2s(tk(src.videoTracks[0].clips[sv.numItems - 1].end)));
        UN_RESULT = r.join("\n");
    }
})();
