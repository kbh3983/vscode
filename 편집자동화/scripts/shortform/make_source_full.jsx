// 숏폼 에이전트 — 숏폼소스를 복제해 A캠(V2) 클립을 원본 전체 화면(4K → 비율 50, 가운데)으로 → <롱폼>_숏폼소스_샷
// 롱폼의 A캠 확대(펀치인)가 숏폼 1:1 칸에서 두 사람을 양 끝으로 자르던 문제 (2026-10-14 샷사이즈 회고). 프레이밍은 숏폼 쪽 클립 비율·위치로 잡는다
// 사용: (function(){ LONG="<롱폼 이름>"; MS_RESULT=""; $.evalFile("<이 파일>"); return MS_RESULT; })()
(function () {
    var P = app.project, src = null, nm = LONG + "_숏폼소스_샷";
    for (var i = 0; i < P.sequences.numSequences; i++) { if (P.sequences[i].name == nm) { MS_RESULT = "이미 있음 " + nm + " " + P.sequences[i].sequenceID; return; } if (P.sequences[i].name == LONG + "_숏폼소스") src = P.sequences[i]; }
    var before = {}; for (var i = 0; i < P.sequences.numSequences; i++) before[P.sequences[i].sequenceID] = 1;
    src.clone(); var s = null; for (var i = 0; i < P.sequences.numSequences; i++) if (!before[P.sequences[i].sequenceID]) s = P.sequences[i];
    s.name = nm;
    var cs = s.videoTracks[1].clips, n = 0;
    for (var c = 0; c < cs.numItems; c++) {
        var k = cs[c];
        for (var z = 0; z < k.components.numItems; z++) if (k.components[z].matchName == "AE.ADBE Motion") {
            var mp = k.components[z].properties;
            for (var y = 0; y < mp.numItems; y++) { if (mp[y].displayName == "비율 조정") mp[y].setValue(50, true); if (mp[y].displayName == "위치") mp[y].setValue([0.5, 0.5], true); if (mp[y].displayName == "회전") mp[y].setValue(0, true); if (mp[y].displayName == "기준점") mp[y].setValue([0.5, 0.5], true); }
        }
        n++;
    }
    P.save();
    MS_RESULT = nm + " " + s.sequenceID + " | A 클립 " + n;
})();
