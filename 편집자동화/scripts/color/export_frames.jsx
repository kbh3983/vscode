// 색보정 에이전트 — 프레임 방식 측정: 지정한 프레임만 1장씩 PNG로 내보내기 (playbook 2-2 "In/Out 1프레임 + PNG Sequence")
// 사용: var SEQ_ID="..."; var FRAMES=[3150,6300]; var OUT_DIR="/.../ref_it1"; var PRESET="/.../PNG Sequence (Match Source).epr";
//       $.evalFile(".../export_frames.jsx"); return FRAMES_RESULT;
// 결과: <OUT_DIR>/f<프레임번호>.png (batch.py frame_at 폴더 방식). MCP 45초 제한이 있으니 한 번에 4장쯤씩 나눠 부른다
// 끝나면 In/Out을 지운다 (시퀀스 전체로)
(function () {
    var TPF = 8475667200;   // 29.97fps 1프레임 ticks
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    if (FRAMES.length > 12) { FRAMES_RESULT = "한 번에 12장 넘게 부르지 않음 (" + FRAMES.length + "장) — 나눠서 부를 것 (4K 한 장 약 0.4초)"; return; }
    var dir = new Folder(OUT_DIR); if (!dir.exists) dir.create();
    var done = [];
    for (var j = 0; j < FRAMES.length; j++) {
        var f = FRAMES[j];
        if ((f + 1) * TPF > Number(seq.end)) { done.push(f + "(시퀀스 끝 넘음 — 건너뜀)"); continue; }
        var tmp = new Folder(OUT_DIR + "/_f" + f); if (!tmp.exists) tmp.create();
        seq.setInPoint(String(f * TPF)); seq.setOutPoint(String((f + 1) * TPF));
        // In/Out이 그 프레임으로 잡혔는지 확인 — 안 잡히면 시퀀스 전체를 PNG로 내보냄 (2026-10-26 체어 6,300장·32GB, 색보정 failures.md)
        var span = seq.getOutPointAsTime().seconds - seq.getInPointAsTime().seconds;
        if (Math.abs(seq.getInPointAsTime().seconds - f * TPF / 254016000000) > 0.05 || span > 0.2) { done.push(f + "(In/Out 안 잡힘 — 건너뜀)"); tmp.remove(); continue; }
        seq.exportAsMediaDirect(tmp.fsName + "/f" + f + ".png", PRESET, 1);
        var got = tmp.getFiles("*.png");   // 이름 끝에 번호가 붙어 나옴
        if (got.length) { var dst = new File(OUT_DIR + "/f" + f + ".png"); if (dst.exists) dst.remove(); got[0].rename("f" + f + ".png"); got[0].copy(dst.fsName); got[0].remove(); }
        var rest = tmp.getFiles(); for (var k = 0; k < rest.length; k++) rest[k].remove();
        tmp.remove();
        done.push(f + (got.length ? "" : "(없음)"));
    }
    seq.setInPoint("0"); seq.setOutPoint(String(seq.end));
    FRAMES_RESULT = seq.name + ": " + done.join(",");
})();
