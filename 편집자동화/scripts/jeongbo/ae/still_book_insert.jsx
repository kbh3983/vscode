// 책 인서트 템플릿 정지 화면 (미리보기·확인용) — 컴프 하나씩 따로 부름 (한 스크립트에서 여러 번 saveFrameToPng 하면 첫 장만 저장될 수 있음)
// 사용: 맨 위 STILL = ["컴프 이름", 초, "출력.png"] 를 바꿔 부름 (make 스크립트가 끝난 같은 프로젝트에서)
(function () {
    var J = $.global.STILL;
    var c = null;
    for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i).name == J[0]) c = app.project.item(i);
    if (!c) return;
    c.saveFrameToPng(J[1], new File(J[2]));
})();
