// 포인트 에이전트 — 포인트 트랙 중 하나만 보이게(또는 모두 숨기고) 한 프레임씩 PNG로 렌더. 끝나면 트랙 보기 상태·In/Out 되돌림
// 사용: var SEQ_ID="<ID>"; var FIRST=<첫 포인트 트랙>; var LAST=<마지막 포인트 트랙>; var JOBS=[[트랙index(-1=모두 숨김), 초, "출력.png"], ...]; var SOLO_RESULT=""; $.evalFile("<이 파일>"); return SOLO_RESULT;
// PNG 이름 끝에 0이 붙음 (PNG Sequence 프리셋)
(function () {
    var seq = null;
    for (var i = 0; i < app.project.sequences.numSequences; i++) if (app.project.sequences[i].sequenceID == SEQ_ID) seq = app.project.sequences[i];
    var pr = "C:\\Program Files\\Adobe\\Adobe Premiere Pro 2026\\MediaIO\\systempresets\\3F3F3F3F_504E4720\\PNG Sequence (Match Source).epr";
    var orig = [];
    for (var v = FIRST; v <= LAST; v++) orig.push(seq.videoTracks[v].isMuted());
    var res = [];
    for (var j = 0; j < JOBS.length; j++) {
        for (var v2 = FIRST; v2 <= LAST; v2++) seq.videoTracks[v2].setMute(v2 == JOBS[j][0] ? 0 : 1);
        seq.setInPoint(JOBS[j][1]); seq.setOutPoint(JOBS[j][1] + 0.03);
        res.push(seq.exportAsMediaDirect(String(JOBS[j][2]).split("/").join("\\"), pr, 1));   // exportAsMediaDirect는 / 경로면 "Unable to initialize export"
    }
    for (var v3 = FIRST; v3 <= LAST; v3++) seq.videoTracks[v3].setMute(orig[v3 - FIRST] ? 1 : 0);
    seq.setInPoint(0); seq.setOutPoint(seq.end / 254016000000);
    var bad = 0; for (var k = 0; k < res.length; k++) if (res[k] != "No Error") bad++;
    var firstErr = ""; for (var k2 = 0; k2 < res.length; k2++) if (res[k2] != "No Error") { firstErr = res[k2] + " @" + JOBS[k2][2]; break; }
    SOLO_RESULT = res.length + " rendered, errors " + bad + (firstErr ? " (" + firstErr + ")" : "");
})();
