// 포인트 에이전트 — 봄자막 프리미어 템플릿 → 애프터이펙트 템플릿 공통 제작 (playbook_AE변환.md)
// 사용: 설정 파일 하나로 실행 — CFG_FILE 경로를 아래 CFG_PATH.txt에 적고 AfterFX -r (run_ae.ps1)
//   설정(JSON): name, comp, text, dur, size, track, x, y, anchor("center"|"bottom"), fill[], stroke{color,width},
//     colorRange{color,start,end}(단어 기준 %), shadow{color,opacity,dist,dir,soft}, glow{color,opacity,soft},
//     gradient{top,bottom}, charWiggleY{amp,freq}, scaleYKeys[프레임별 %], blur(셔터각), turb{amount,size,complexity,fps,evo},
//     wave{height,width,dir,speed}, out(작업 폴더)
(function () {
    var cf = new File("C:\\DADA\\9.AI\\vscode\\편집자동화\\scripts\\point\\ae\\CFG_PATH.txt"); cf.encoding = "UTF-8"; cf.open("r"); var CFG_FILE = cf.read().replace(/\s+$/, ""); cf.close();
    var f0 = new File(CFG_FILE); f0.encoding = "UTF-8"; f0.open("r"); var C = JSON.parse(f0.read()); f0.close();
    var OUT_DIR = C.out, EXPORT_DIR = OUT_DIR + "\\export";
    var FPS = 29.97, FR = 1 / FPS;
    var log = [];
    function w(s) { log.push(s); }
    function rgb(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    function rgbS(a) { return (a[0] / 255).toFixed(4) + "," + (a[1] / 255).toFixed(4) + "," + (a[2] / 255).toFixed(4); }  // 식 안에 넣을 문자열
    try {
        app.beginSuppressDialogs();
        if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        app.newProject();
        var comp = app.project.items.addComp(C.comp, 1920, 1080, 1, C.dur, FPS);
        if (C.blur) { comp.motionBlur = true; comp.shutterAngle = C.blur; }

        function makeText(name) {
            var T = comp.layers.addText(C.text);
            T.name = name;
            var tr = T.property("ADBE Transform Group");
            tr.property("ADBE Anchor Point").expression = C.anchor == "bottom"
                ? "var r=sourceRectAtTime(0,false);[r.left+r.width/2, r.top+r.height]"
                : "var r=sourceRectAtTime(0,false);[r.left+r.width/2, r.top+r.height/2]";
            tr.property("ADBE Position").setValue([C.x, C.y]);
            if (C.blur) T.motionBlur = true;
            return T;
        }
        function addMotion(T) {
            var tr = T.property("ADBE Transform Group"), fx = T.property("ADBE Effect Parade");
            if (C.scaleYKeys) {
                var sc = tr.property("ADBE Scale");
                for (var k = 0; k < C.scaleYKeys.length; k++) sc.setValueAtTime(k * FR, [100, C.scaleYKeys[k]]);
                for (var h = 1; h <= sc.numKeys; h++) sc.setInterpolationTypeAtKey(h, KeyframeInterpolationType.LINEAR);
            }
            if (C.charWiggleY) {
                var an = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
                an.name = "글자 흔들기";
                an.property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D").setValue([0, C.charWiggleY.amp, 0]);
                var ws = an.property("ADBE Text Selectors").addProperty("ADBE Text Wiggly Selector");
                ws.property("ADBE Text Wiggly Max Amount").setValue(100); ws.property("ADBE Text Wiggly Min Amount").setValue(-100);
                ws.property("ADBE Text Range Type2").setValue(1);   // 글자 기준
                ws.property("ADBE Text Temporal Freq").setValue(C.charWiggleY.freq);
                ws.property("ADBE Text Character Correlation").setValue(0);
            }
            if (C.charBounce) {
                // 글자마다 위아래 흔들림 + 위로 많이 튀었을 때만 살짝 기울기 (사용자 지정 2026-10-11, 봄03: "튀어올랐을대 5도~10도 기울어지게")
                // 두 애니메이터가 같은 식(글자 번호로 정한 noise)을 써서 높이와 기울기가 함께 움직인다
                                var B0 = C.charBounce;
                // random()은 같은 시드여도 속성마다 값이 달라 높이·기울기가 따로 놂 → 위상은 글자 번호로 계산 (2026-10-11 확인)
                var nz = "var ph = (textIndex*137.13) % 1000; var n = noise([time*" + B0.freq + " + ph, textIndex*3.7]);";
                var anP = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
                anP.name = "글자 튀기";
                anP.property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D").setValue([0, B0.amp, 0]);
                var esP = anP.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
                // 선택기 양은 음수가 안 먹어서(위로 못 감) 0~100으로: 아래로 amp만큼 범위, 레이어 위치를 amp/2 올려 가운데 맞춤 (2026-10-11 막대 시험으로 확인)
                esP.property("ADBE Text Expressible Amount").expression = nz + " var v = 50 + n*50; [v, v, v]";
                T.property("ADBE Transform Group").property("ADBE Position").setValue([C.x, C.y - B0.amp / 2]);
                var anR = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
                anR.name = "튈 때 기울기";
                anR.property("ADBE Text Animator Properties").addProperty("ADBE Text Rotation").setValue(B0.tilt);
                var esR = anR.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
                esR.property("ADBE Text Expressible Amount").expression = nz +
                    " var s = 0; for (var q = -3; q <= 3; q++) s += noise([(time + q*thisComp.frameDuration*" + (B0.smooth||1) + ")*" + B0.freq + " + ph, textIndex*3.7]); var up = -s/7; var k = ease(up, " + B0.th + ", " + B0.full + ", 0, 1); var d = (textIndex % 4 < 2) ? 1 : -1; var v = k*d*100; [v, v, v]";  // 기울기는 앞뒤 프레임 높이 평균으로(smooth배 간격 7개) + ease: 천천히 들어가고 빠짐 (사용자: "끊겨보여. 조금더 부드러워 보이게")
            }
            if (C.turb) {
                var td = fx.addProperty("ADBE Turbulent Displace");
                td.property(2).setValue(C.turb.amount); td.property(3).setValue(C.turb.size); td.property(5).setValue(C.turb.complexity);
                // 프리미어 시간 포스터화처럼: k번째 바뀜 = floor(k*30/fps)+1 프레임 (29.97이 아니라 30 기준 — 봄12 원본 8·16·23·31·38·46·53, 05_실망 1·11·21·31에서 확인)
                td.property(6).expression = "var f=timeToFrames(time), st=30/" + C.turb.fps + ", k=0; while (Math.floor((k+1)*st)+1 <= f) k++; k/" + C.turb.fps + "*" + C.turb.evo;
            }
            if (C.wave) {
                var wv = fx.addProperty("ADBE Wave Warp");
                wv.property(1).setValue(1);                   // 사인
                wv.property(2).setValue(C.wave.height); wv.property(3).setValue(C.wave.width);
                wv.property(4).setValue(C.wave.dir); wv.property(5).setValue(C.wave.speed);
            }
        }
        function addLooks(T, withFillLooks) {
            var fx = T.property("ADBE Effect Parade");
            if (C.shadow) {
                var ds = fx.addProperty("ADBE Drop Shadow");
                ds.property("ADBE Drop Shadow-0001").setValue(rgb(C.shadow.color));
                ds.property("ADBE Drop Shadow-0002").setValue(C.shadow.opacity * 2.55);
                ds.property("ADBE Drop Shadow-0003").setValue(C.shadow.dir);
                ds.property("ADBE Drop Shadow-0004").setValue(C.shadow.dist);
                ds.property("ADBE Drop Shadow-0005").setValue(C.shadow.soft);
            }
            if (C.glow) {
                var gl = fx.addProperty("ADBE Drop Shadow");
                gl.name = "번짐";
                gl.property("ADBE Drop Shadow-0001").setValue(rgb(C.glow.color));
                gl.property("ADBE Drop Shadow-0002").setValue(C.glow.opacity * 2.55);
                gl.property("ADBE Drop Shadow-0004").setValue(0);
                gl.property("ADBE Drop Shadow-0005").setValue(C.glow.soft);
            }
        }

        var L = makeText("자막");
        var st = L.property("ADBE Text Properties").property("ADBE Text Document");
        var td0 = st.value;
        td0.font = "Paperlogy-7Bold"; td0.fontSize = C.size; td0.tracking = C.track;
        td0.fillColor = rgb(C.fill); td0.applyFill = true;
        td0.justification = ParagraphJustification.CENTER_JUSTIFY;
        if (C.stroke && !C.gradient) { td0.applyStroke = true; td0.strokeColor = rgb(C.stroke.color); td0.strokeWidth = C.stroke.width; td0.strokeOverFill = false; }
        else td0.applyStroke = false;
        st.setValue(td0);
        w("font=" + st.value.font);
        if (C.colorRange) {   // 단어 일부 색 바꾸기 (원본처럼 앞/뒤 단어 색)
            var an2 = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            an2.name = "단어 색";
            an2.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").setValue(rgb(C.colorRange.color));
            var rs = an2.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            rs.property("ADBE Text Percent Start").setValue(C.colorRange.start); rs.property("ADBE Text Percent End").setValue(C.colorRange.end);
            rs.property("ADBE Text Range Advanced").property("ADBE Text Range Type2").setValue(3);  // 단어 기준
        }
        addMotion(L);

        if (C.gradient) {
            // 그라데이션: 판 + "자막" 알파 매트, 테두리·번짐은 아래 레이어 (문구는 "자막"을 따라감)
            var B = makeText("테두리");
            w("expr");
            B.property("ADBE Text Properties").property("ADBE Text Document").expression =
                "var s=thisComp.layer(\"자막\").text.sourceText; s.style.setText(s.value).setFillColor([" + rgbS(C.stroke.color) + "]).setApplyStroke(true).setStrokeColor([" + rgbS(C.stroke.color) + "]).setStrokeWidth(" + C.stroke.width + ")";
            B.moveAfter(L);
            addMotion(B); addLooks(B);
            var G = comp.layers.addSolid([1, 1, 1], "그라데이션", 1920, 1080, 1, C.dur);
            G.moveBefore(L);
            var ramp = G.property("ADBE Effect Parade").addProperty("ADBE Ramp");
            ramp.property(1).expression = "var L=thisComp.layer(\"자막\"); var r=L.sourceRectAtTime(time,false); fromComp(L.toComp([r.left+r.width/2, r.top]))";
            ramp.property(2).setValue(rgb(C.gradient.top));
            ramp.property(3).expression = "var L=thisComp.layer(\"자막\"); var r=L.sourceRectAtTime(time,false); fromComp(L.toComp([r.left+r.width/2, r.top+r.height]))";
            ramp.property(4).setValue(rgb(C.gradient.bottom));
            G.setTrackMatte(L, TrackMatteType.ALPHA);
        } else addLooks(L);
        w("layers=" + comp.numLayers);

        comp.motionGraphicTemplateName = C.comp;
        w("addToMGT=" + st.addToMotionGraphicsTemplateAs(comp, "자막 텍스트"));
        app.project.save(new File(OUT_DIR + "\\" + C.name + "_AE.aep"));
        new Folder(EXPORT_DIR).create();
        w("export=" + comp.exportAsMotionGraphicsTemplate(true, EXPORT_DIR));
    } catch (e) {
        w("ERROR line " + e.line + ": " + e.toString());
    }
    var f = new File(OUT_DIR + "\\result.txt"); f.encoding = "UTF-8"; f.open("w"); f.write(log.join("\n")); f.close();
    app.endSuppressDialogs(false);
})();
