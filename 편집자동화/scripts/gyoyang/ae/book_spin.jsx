// 2026-10-19 사용자: "중천시퀀스01 8초에 있는 책 표지 이미지가 360도 회전해서 제자리로 돌아오게 모션그래픽 제작해줘. 끝까지 밀여붙여서."
// 표지 한 장 → 두께 있는 3D 책(앞표지·뒷표지·책등·종이 단면)으로 Y축 한 바퀴 + 살짝 들림·기울기·튕김, 면마다 각도 따라 그늘, 모션 블러, 멈출 때 빛 반사, 도는 동안 바닥 그림자
// 끝 프레임 = 원래 클립과 똑같은 자리·크기(위치 250,504 · 크기 33%) → 그대로 이어짐. 결과는 PNG 연속(알파) → ffmpeg로 ProRes 4444
(function () {
    var D = "C:/DADA/9.AI/vscode/편집자동화/work/지식인사이드/테스트/book_spin/";
    var log = []; function w(s) { log.push(s); var f = new File(D + "result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close(); }
    try {
        if (app.project.file) app.project.save();
        app.newProject();
        var FPS = 29.97, NF = 112, FR = 1 / FPS, W = 691, H = 1024, T = 56;
        var C = app.project.items.addComp("책_한바퀴", 1920, 1080, 1, NF / FPS, FPS);
        C.motionBlur = true; C.shutterAngle = 200; C.motionBlurSamplesPerFrame = 16; C.motionBlurAdaptiveSampleLimit = 128;
        function imp(n) { var io = new ImportOptions(new File(D + n)); return app.project.importFile(io); }
        var N = C.layers.addNull(NF / FPS); N.name = "책"; N.threeDLayer = true;
        var tf = function (L) { return L.property("ADBE Transform Group"); };
        var Z0 = T / 2 * 0.33;   // 책 두께 가운데를 축으로 돌리고, 쉬는 자세에서 앞표지가 원본 깊이(0)에 오게
        tf(N).property("ADBE Anchor Point").setValue([0, 0, T / 2]);
        tf(N).property("ADBE Position").setValue([250, 504, Z0]);
        tf(N).property("ADBE Scale").setValue([33, 33, 33]);
        var faces = [];
        function face(name, file, pos, ry, rx) {
            var L = C.layers.add(imp(file)); L.name = name; L.threeDLayer = true; L.motionBlur = true;
            L.parent = N; tf(L).property("ADBE Scale").setValue([100, 100, 100]); tf(L).property("ADBE Position").setValue(pos);   // 부모를 붙이면 AE가 화면 크기를 지키려 자식 크기를 바꿈 → 100으로
            if (ry) tf(L).property("ADBE Rotate Y").setValue(ry);
            if (rx) tf(L).property("ADBE Rotate X").setValue(rx);
            L.property("ADBE Effect Parade").addProperty("ADBE Exposure2");
            // 그늘: 면이 향한 방향과 빛(왼쪽 위 앞) 사이 각도 → 노출. 쉬는 자세의 앞표지 = 정확히 0 (원본 그대로)
            L.property("ADBE Effect Parade").property(1).property(3).expression =
                'var n=toWorldVec([0,0,-1]); n=normalize(n); var Lt=normalize([-0.45,-0.35,-1]); var d=Math.abs(dot(n,Lt)), d0=dot([0,0,-1],Lt);\n' +
                'var b=0.30+0.70*d/d0; Math.log(Math.max(0.05,Math.min(1.2,b)))/Math.log(2)';
            faces.push(L); return L;
        }
        face("뒷표지", "back.png", [0, 0, T], 180, 0);
        face("책등", "spine.png", [-W / 2, 0, T / 2], -90, 0);
        face("종이 오른쪽", "pages_side.png", [W / 2 - 8, 0, T / 2], 90, 0);
        face("종이 위", "pages_tb.png", [-4, -H / 2 + 8, T / 2], 0, 90);
        face("종이 아래", "pages_tb.png", [-4, H / 2 - 8, T / 2], 0, -90);
        var F = face("앞표지", "front.jpg", [0, 0, 0], 0, 0);
        // 쉬는 자세(각도 0)에선 원근 때문에 옆면이 한 줄 보임 → 책이 기울어 있을 때만 보이게 (끝 프레임 = 원본과 똑같이)
        for (var i = 0; i < faces.length - 1; i++) tf(faces[i]).property("ADBE Opacity").expression =
            'var B=thisComp.layer("책").transform, a=Math.abs(Math.sin(B.yRotation*Math.PI/180))+Math.abs(Math.sin(B.xRotation*Math.PI/180))+Math.abs(B.position[2]-9.24)/200; 100*Math.min(1,a*12)';
        // 회전·들림 (책 null)
        function keys(prop, K, dim) {
            for (var i = 0; i < K.length; i++) prop.setValueAtTime(K[i][0] * FR, K[i][1]);
            for (var i = 1; i <= prop.numKeys; i++) {
                var inf = K[i - 1][2] || 50, e = [];
                for (var d = 0; d < dim; d++) e.push(new KeyframeEase(0, inf));
                prop.setTemporalEaseAtKey(i, e, e);
            }
        }
        keys(tf(N).property("ADBE Rotate Y"), [[0, 0, 70], [26, 368, 45], [32, 356, 50], [37, 361, 50], [42, 360, 60]], 1);
        keys(tf(N).property("ADBE Rotate X"), [[0, 0, 60], [12, -9, 40], [28, 1.5, 50], [36, 0, 60]], 1);
        keys(tf(N).property("ADBE Rotate Z"), [[0, 0, 60], [10, -3, 40], [27, 1, 50], [35, 0, 60]], 1);
        keys(tf(N).property("ADBE Position"), [[0, [250, 504, Z0], 70], [13, [250, 478, Z0 - 90], 40], [28, [250, 507, Z0], 55], [33, [250, 503, Z0], 50], [38, [250, 504, Z0], 60]], 1);
        // 멈출 때 앞표지에 빛 한 줄 지나감 (CC Light Sweep: 1 가운데 2 방향 3 모양 4 폭 5 세기 6 가장자리 세기)
        var LS = F.property("ADBE Effect Parade").addProperty("CC Light Sweep");
        LS = F.property("ADBE Effect Parade").property(2);
        LS.property(2).setValue(-28); LS.property(4).setValue(140); LS.property(6).setValue(0);
        LS.property(1).expression = 'var t=time/thisComp.frameDuration; [linear(t,30,52,-420,1150), 512]';
        LS = F.property("ADBE Effect Parade").property(2);
        LS.property(5).expression = 'var t=time/thisComp.frameDuration; t<30||t>52?0:55*Math.sin((t-30)/22*Math.PI)';
        // 도는 동안 바닥 그림자 (책이 들릴수록 진하고 넓게, 옆을 보일 땐 좁게) — 쉬는 자세에선 0
        var S = C.layers.addShape(); S.name = "바닥 그림자";
        var g = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
        g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        S = C.layer("바닥 그림자");
        S.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property("ADBE Vector Ellipse Size").expression =
            'var ry=thisComp.layer("책").transform.yRotation*Math.PI/180; [230*(0.25+0.75*Math.abs(Math.cos(ry)))+40*Math.abs(Math.sin(ry))*0.4, 30]';
        S = C.layer("바닥 그림자");
        S.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(2).property("ADBE Vector Fill Color").setValue([0, 0, 0, 1]);
        tf(S).property("ADBE Position").setValue([250, 700]);
        tf(S).property("ADBE Opacity").expression = 'var p=thisComp.layer("책").transform.position; Math.min(45, Math.max(0,(504-p[1])*1.2 + (9.24-p[2])*0.25))';
        S.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        C.layer("바닥 그림자").property("ADBE Effect Parade").property(1).property(1).setValue(16);
        C.layer("바닥 그림자").moveToEnd();
        app.project.save(new File(D + "book_spin.aep"));
        // 확인 프레임
        var fr = [0, 6, 13, 20, 26, 32, 42, 60, 111];
        for (var i = 0; i < fr.length; i++) C.saveFrameToPng(fr[i] * FR, new File(D + "chk/c_" + fr[i] + ".png"));
        w("BOOK 끝");
    } catch (e) { w("ERR " + e.message + " line " + e.line); }
})();
