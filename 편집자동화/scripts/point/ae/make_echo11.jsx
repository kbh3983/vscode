// 자막효과_만들기.jsx
// 프리미어 '기운없어_자막' 시퀀스의 참고 영상(기운없어_자막.mp4 + 메아리 자막.mp4 10구간)을
// 프레임 단위로 분석한 값으로 11개 자막 효과 컴포지션을 만든다.
// 실행: AE > 파일 > 스크립트 > 스크립트 파일 실행 (Bridge 창 Auto-run은 잠시 끄기)
// 결과 보고서: 같은 폴더의 자막효과_report.txt
//
// 구조: 효과마다 '<ID>_글자' 프리컴프(외곽/흰 테두리/채움 3겹 텍스트) + 본 컴프 '<ID>_<이름>'
//   본 컴프 안에서 '본문' 레이어(등장·퇴장)와 '잔상' 레이어(메아리)가 프리컴프를 재사용한다.
//   글자 수정은 '<ID>_글자' 컴프의 '텍스트' 레이어만 고치면 나머지가 따라간다.
//   타이밍 값은 각 레이어 익스프레션 맨 앞 K 배열(초, 값)에 있다.

(function () {
    var log = [];
    var here = Folder.myDocuments.fsName + "/ae-mcp-bridge";
    // run_ae.ps1(AfterFX -r)로 보내면 알림 창이 AE를 막으므로 띄우지 않는다
    var QUIET = /point_ae_run/i.test(String($.fileName));
    var FOLDER_NAME = "자막효과_기운없어_메아리";
    var W = 1920, H = 1080, FPS = 29.97;
    // 다시 만들 효과 ID. 비워 두면 폴더를 지우고 11개 전부 새로 만든다.
    // ID를 적으면 그 컴포지션만 '안의 내용'을 다시 만든다 (컴포지션 자체는 유지 → 프리미어 Dynamic Link 안 끊김)
    var ONLY = ["E00"];
    // true면 컴프는 건드리지 않고 그래픽 템플릿(.mogrt) 내보내기만 한다
    var EXPORT_ONLY = false;
    // false면 그래픽 템플릿 내보내기를 건너뛴다 (조정 반복 중)
    var DO_EXPORT = true;
    // 확인용 렌더 출력 폴더 (aerender가 한글 컴프 이름을 못 읽어서 렌더 대기열 번호로 렌더한다)
    var RENDER_DIR = here + "/render";

    function inList(arr, v) { for (var i = 0; i < arr.length; i++) if (arr[i] === v) return true; return false; }
    function findComp(name) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem && it.name === name) return it;
        }
        return null;
    }
    function clearLayers(c) { for (var i = c.numLayers; i >= 1; i--) { c.layer(i).locked = false; c.layer(i).remove(); } }
    // 있으면 비우고 재사용, 없으면 새로 만든다
    function reuseComp(name, dur, folder) {
        var c = findComp(name);
        if (c) { clearLayers(c); c.duration = dur; log.push("  재사용: " + name); }
        else { c = app.project.items.addComp(name, W, H, 1, dur, FPS); c.parentFolder = folder; }
        return c;
    }

    // ---------- 공통 도우미 ----------
    function hex(h) {
        h = h.replace("#", "");
        return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255];
    }
    function ser(v) {
        if (v instanceof Array) { var a = []; for (var i = 0; i < v.length; i++) a.push(ser(v[i])); return "[" + a.join(",") + "]"; }
        return String(v);
    }
    // 익스프레션용 구간 보간 함수: m=0 ease, 1 linear, 2 hold
    var LIB = "function C(K,m){var t=time-inPoint;var n=K.length;if(t<=K[0][0])return K[0][1];if(t>=K[n-1][0])return K[n-1][1];" +
        "for(var i=0;i<n-1;i++){if(t<K[i+1][0]){if(m==0)return ease(t,K[i][0],K[i+1][0],K[i][1],K[i+1][1]);" +
        "if(m==1)return linear(t,K[i][0],K[i+1][0],K[i][1],K[i+1][1]);return K[i][1];}}return K[n-1][1];}\n";

    function setExpr(prop, expr, label) {
        try { prop.expression = expr; log.push("  expr ok: " + label); }
        catch (e) { log.push("  FAIL expr " + label + ": " + e.toString()); }
    }
    function setVal(effect, mn, value) {
        try {
            var p = effect.property(mn);
            if (!p) { log.push("  NOT FOUND " + mn); return; }
            p.setValue(value);
        } catch (e) { log.push("  FAIL " + mn + " = " + value + ": " + e.toString()); }
    }
    function setFxExpr(effect, mn, expr) {
        try { effect.property(mn).expression = expr; }
        catch (e) { log.push("  FAIL fx expr " + mn + ": " + e.toString()); }
    }
    function dumpEffect(effect) {
        log.push("  --- " + effect.name + " [" + effect.matchName + "]");
        for (var i = 1; i <= effect.numProperties; i++) {
            var p = effect.property(i), v = "";
            try { if (p.propertyValueType !== PropertyValueType.NO_VALUE) v = " = " + p.value; } catch (e) {}
            log.push("    " + i + " " + p.matchName + " | " + p.name + v);
        }
    }

    // ---------- 폰트 찾기 (설치된 폰트 목록에서 이름으로 검색) ----------
    var FONTS = [];
    try {
        var fams = app.fonts.allFonts;
        for (var fi = 0; fi < fams.length; fi++) for (var fj = 0; fj < fams[fi].length; fj++) FONTS.push(fams[fi][fj]);
    } catch (e) { log.push("app.fonts 사용 불가: " + e.toString()); }
    function norm(s) { return String(s).toLowerCase().replace(/[\s\-_.]/g, ""); }
    // key 형식: "포함할글자" 또는 "포함할글자!제외할글자"
    function findFont(keys) {
        for (var k = 0; k < keys.length; k++) {
            var parts = keys[k].split("!"), need = norm(parts[0]), not = parts[1] ? norm(parts[1]) : null;
            for (var i = 0; i < FONTS.length; i++) {
                var f = FONTS[i], hay = "";
                try { hay = norm(f.familyName) + norm(f.styleName) + "|" + norm(f.postScriptName); } catch (e) { continue; }
                if (hay.indexOf(need) !== -1 && (!not || hay.indexOf(not) === -1)) return f.postScriptName;
            }
        }
        return null;
    }

    // ---------- 프리컴프: 3겹 텍스트 ----------
    // s: {text, font:[원본폰트 키들], fallback:[대체폰트 키들], italicOnFallback, width, fill:[위색,아래색], white, whiteColor, outer, outerColor, shadow}
    function makeTextDoc(layer, s, mode, fontName, size, italic) {
        var td = layer.property("ADBE Text Properties").property("ADBE Text Document").value;
        try { td.resetCharStyle(); } catch (e0) {}
        td.text = s.text;
        if (fontName) td.font = fontName;
        td.fontSize = size;
        td.fauxItalic = italic;
        td.tracking = s.tracking || 0;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        if (mode === "fill") {
            td.applyFill = true; td.fillColor = hex(s.fill[0]);
            td.applyStroke = false;
        } else if (mode === "white") {
            td.applyFill = true; td.fillColor = hex(s.whiteColor || "#FFFFFF");
            td.applyStroke = true; td.strokeColor = hex(s.whiteColor || "#FFFFFF"); td.strokeWidth = s.white;
            td.strokeOverFill = false;
        } else { // outer
            td.applyFill = true; td.fillColor = hex(s.outerColor);
            td.applyStroke = true; td.strokeColor = hex(s.outerColor); td.strokeWidth = s.outer;
            td.strokeOverFill = false;
        }
        layer.property("ADBE Text Properties").property("ADBE Text Document").setValue(td);
    }

    function addTextLayer(pre, s, mode, name, fontName, size, italic) {
        var L = pre.layers.addText(s.text);
        L.name = name;
        makeTextDoc(L, s, mode, fontName, size, italic);
        var tr = L.property("ADBE Transform Group");
        setExpr(tr.property("ADBE Anchor Point"), "var r=sourceRectAtTime(time,false);[r.left+r.width/2,r.top+r.height/2]", name + " 가운데 정렬");
        tr.property("ADBE Position").setValue([W / 2, H / 2]);
        if (name !== "텍스트") setExpr(L.property("ADBE Text Properties").property("ADBE Text Document"), 'thisComp.layer("텍스트").text.sourceText', name + " 글자 따라가기");
        return L;
    }

    function addShadow(L, sh) {
        var fx = L.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
        try { fx.property("ADBE Drop Shadow-0001").setValue(hex(sh.color).concat([1])); } catch (e) { log.push("  FAIL shadow color: " + e.toString()); }
        // 불투명도: 버전에 따라 0~255 또는 0~100 범위라 둘 다 시도
        try { fx.property("ADBE Drop Shadow-0002").setValue(sh.op * 2.55); }
        catch (e1) { try { fx.property("ADBE Drop Shadow-0002").setValue(sh.op); } catch (e2) { log.push("  FAIL shadow opacity: " + e2.toString()); } }
        setVal(fx, "ADBE Drop Shadow-0003", sh.dir);
        setVal(fx, "ADBE Drop Shadow-0004", sh.dist);
        setVal(fx, "ADBE Drop Shadow-0005", sh.soft);
        return fx;
    }

    function addGradient(L, top, bottom) {
        var fxs = L.property("ADBE Effect Parade");
        var ramp = fxs.addProperty("ADBE Ramp");
        setFxExpr(ramp, "ADBE Ramp-0001", "var r=thisLayer.sourceRectAtTime(time,false);[r.left+r.width/2,r.top]");
        try { ramp.property("ADBE Ramp-0002").setValue(hex(top).concat([1])); } catch (e) { log.push("  FAIL ramp color1: " + e.toString()); }
        setFxExpr(ramp, "ADBE Ramp-0003", "var r=thisLayer.sourceRectAtTime(time,false);[r.left+r.width/2,r.top+r.height]");
        try { ramp.property("ADBE Ramp-0004").setValue(hex(bottom).concat([1])); } catch (e) { log.push("  FAIL ramp color2: " + e.toString()); }
        // 그라데이션이 레이어 전체를 칠하므로 글자 모양(원본 알파)으로 다시 잘라낸다
        var sm = fxs.addProperty("ADBE Set Matte3");
        setVal(sm, "ADBE Set Matte3-0001", L.index);
        return [ramp, sm];
    }

    // 그라데이션: 컴프 크기 솔리드에 그라데이션 램프를 깔고, 글자 레이어를 알파 매트로 써서 글자 모양만 남긴다
    // (텍스트 레이어에 직접 램프를 걸면 좌표계가 어긋나 한 가지 색으로만 나왔음)
    function addGradientSolid(pre, fillLayer, top, bottom) {
        var g = pre.layers.addSolid([1, 1, 1], "그라데이션", W, H, 1, pre.duration);
        g.moveBefore(fillLayer);
        var fxs = g.property("ADBE Effect Parade");
        var ramp = fxs.addProperty("ADBE Ramp");
        var src = 'var L=thisComp.layer("텍스트");var r=L.sourceRectAtTime(time,false);';
        setFxExpr(ramp, "ADBE Ramp-0001", src + "L.toComp([r.left+r.width/2,r.top])");
        try { ramp.property("ADBE Ramp-0002").setValue(hex(top).concat([1])); } catch (e) { log.push("  FAIL ramp color1: " + e.toString()); }
        setFxExpr(ramp, "ADBE Ramp-0003", src + "L.toComp([r.left+r.width/2,r.top+r.height])");
        try { ramp.property("ADBE Ramp-0004").setValue(hex(bottom).concat([1])); } catch (e) { log.push("  FAIL ramp color2: " + e.toString()); }
        try { g.setTrackMatte(fillLayer, TrackMatteType.ALPHA); log.push("  gradient matte ok"); }
        catch (e) { log.push("  FAIL gradient matte: " + e.toString()); }
        return g;
    }

    function makeTextPrecomp(folder, id, s, dur) {
        var pre = reuseComp(id + "_글자", dur, folder);

        var fontName = findFont(s.font), italic = !!s.italic, usedFallback = false;
        if (!fontName) { fontName = findFont(s.fallback); usedFallback = true; if (s.italicOnFallback) italic = true; }
        log.push(id + " 폰트: " + (fontName || "(못 찾음, 기본 폰트)") + (usedFallback ? "  ← 원본 폰트 '" + s.fontLabel + "' 없어서 대체" : "") + (italic ? " +기울임" : ""));

        // 크기 맞추기: 100pt로 재서 목표 폭이 되도록
        var probe = pre.layers.addText(s.text);
        makeTextDoc(probe, s, "fill", fontName, 100, italic);
        var wid = probe.sourceRectAtTime(0, false).width;
        probe.remove();
        var size = wid > 0 ? Math.round(100 * s.width / wid) : 100;
        log.push("  글자 크기 " + size + "pt (목표 폭 " + s.width + "px)");

        if (s.outer) {
            var o = addTextLayer(pre, s, "outer", "외곽", fontName, size, italic);
            if (s.shadow) addShadow(o, s.shadow);
        }
        var wl = s.white ? addTextLayer(pre, s, "white", "흰테두리", fontName, size, italic) : null;
        var f = addTextLayer(pre, s, "fill", "텍스트", fontName, size, italic);
        // 그림자는 가장 바깥 층에. 채움 층에 걸면 그라데이션 매트가 그림자까지 칠하므로 흰테두리가 있으면 거기에 건다
        if (!s.outer && s.shadow) addShadow(wl || f, s.shadow);
        if (s.fill.length > 1) addGradientSolid(pre, f, s.fill[0], s.fill[1]);
        return pre;
    }

    // 프리컴프를 본 컴프에 올린다 (벡터 그대로 커지도록 변형 축소 켬)
    function addInstance(comp, pre, name) {
        var L = comp.layers.add(pre);
        L.name = name;
        try { L.collapseTransformation = true; } catch (e) { log.push("  FAIL collapse " + name + ": " + e.toString()); }
        // 변형 축소 레이어는 투명도가 안쪽 층(채움·흰테두리)마다 따로 적용돼 흰 층이 비쳐 회색으로 보인다.
        // 아무 변화 없는 효과를 하나 걸면 한 장으로 합친 뒤 투명도가 적용된다.
        try { L.property("ADBE Effect Parade").addProperty("ADBE Brightness & Contrast 2").name = "투명도 한덩어리"; }
        catch (e) { log.push("  FAIL flatten " + name + ": " + e.toString()); }
        return L;
    }
    function T(L) { return L.property("ADBE Transform Group"); }

    // 글자 꿀렁임: 뒤틀기 변위 + 진화를 초당 15번 끊어서 바꾼다 (참고 영상이 15fps로 모양이 바뀜)
    function addWobble(L) {
        var td = L.property("ADBE Effect Parade").addProperty("ADBE Turbulent Displace");
        setVal(td, "ADBE Turbulent Displace-0002", 18);  // 양
        setVal(td, "ADBE Turbulent Displace-0003", 28);  // 크기 (작을수록 잘게 흔들림)
        setVal(td, "ADBE Turbulent Displace-0005", 1);   // 복잡도
        setFxExpr(td, "ADBE Turbulent Displace-0006", "posterizeTime(15);time*720");
        log.push("  물결 흔들림: " + L.name);
    }

    function scaleExpr(K, m) { return LIB + "var K=" + ser(K) + ";var s=C(K," + m + ");[s,s]"; }
    function opacityExpr(A, ma, B, mb) {
        return LIB + "var A=" + ser(A) + ";var B=" + ser(B) + ";C(A," + ma + ")*C(B," + mb + ")/100";
    }
    function driftExpr(t0, tau, off, dy) {
        return "var t=time-inPoint-" + t0 + ";var p=t<0?0:1-Math.exp(-t/" + tau + ");value+" + ser(off) + "*(1-p)+[0," + (dy || 0) + "*Math.max(t,0)]";
    }

    // ---------- 효과별 데이터 (시간은 클립 시작 기준 초, 30fps 프레임 측정값) ----------
    var SH_DARK = { color: "#101010", op: 60, dir: 135, dist: 5, soft: 6 };
    var DEFS = [
        { id: "E00", name: "기운없어", dur: 2.833,
          s: { text: "기운이가 없어", fontLabel: "둥근 굵은 고딕", font: ["cafe24ssurround!air"], fallback: ["bmjua", "gmarketsansbold"],
               width: 891, fill: ["#FFFFFF"], outer: 10, outerColor: "#1A1A1A", shadow: { color: "#1A1A1A", op: 100, dir: 145, dist: 9, soft: 0 } },
          build: function (c, pre) {
              var L = addInstance(c, pre, "본문");
              // 참고 영상에서 글자 중심이 화면 중앙보다 29px(시퀀스 기준) 위 → 컴프 기준 -33px
              setExpr(T(L).property("ADBE Position"), "value+[0,-33]", "기운없어 위치");
              // 흐물흐물: 가로 물결 왜곡 + 초당 12장으로 끊어 보이기 (참고 영상이 2~3프레임씩 멈춤)
              var fx = L.property("ADBE Effect Parade");
              var ww = fx.addProperty("ADBE Wave Warp");
              setVal(ww, "ADBE Wave Warp-0002", 18);   // 물결 높이 (참고 세로획: 마루에서 ±60px 줄 사이 25px 휨)
              setVal(ww, "ADBE Wave Warp-0003", 190);  // 물결 폭 (참고: 글자 높이 안에서 활처럼 휨 → 반파장 ≈ 글자 높이)
              setVal(ww, "ADBE Wave Warp-0004", 180);  // 방향 180° → 가로로 휘며 마루가 아래로 흘러감 (참고: 마루 위치가 f21 50줄 → f46 70줄)
              setVal(ww, "ADBE Wave Warp-0005", 0.5);  // 속도 (참고: f1과 f61 모양이 같음 → 약 2초 주기)
              var pt = fx.addProperty("ADBE Posterize Time");
              setVal(pt, "ADBE Posterize Time-0001", 12);
              // f1~4 92% → f5 100% … f78 85% → f79 65% → f82 57% → f84 사라짐 (hold)
              setExpr(T(L).property("ADBE Opacity"),
                  opacityExpr([[0, 0], [0.033, 92], [0.167, 100]], 2, [[0, 100], [2.6, 85], [2.633, 65], [2.733, 57], [2.8, 0]], 2), "기운없어 투명도");
              return L; // 효과를 추가하면 앞서 받은 효과 참조가 무효가 되므로 레이어를 넘겨 다시 읽게 한다
          } },

        { id: "E01", name: "소리질러", dur: 3.0,
          s: { text: "소리질뤄어~!!!", fontLabel: "웨이브 파도체", font: ["wavvepado", "웨이브파도"], fallback: ["gmarketsansbold"], italic: true,
               // 확대 확인: 거의 단색 파랑, 얇은 흰 테두리 + 옅은 그림자, 똑바로 선 글자
               width: 772, fill: ["#5FA0EE", "#3F86E2"], white: 5, shadow: { color: "#0A1428", op: 50, dir: 135, dist: 4, soft: 4 } },
          build: function (c, pre) {
              // 잔상: f4 106% → f6 119 → f8 132 → f10 145 → f13 157% (진함) → 이후 옅게 192%까지, 0.73초에 사라짐
              var E = addInstance(c, pre, "잔상");
              setExpr(T(E).property("ADBE Scale"), scaleExpr([[0.1, 100], [0.133, 106], [0.2, 119], [0.267, 132], [0.333, 145], [0.433, 157], [0.55, 175], [0.72, 192]], 1), "잔상 크기");
              setExpr(T(E).property("ADBE Opacity"), opacityExpr([[0, 0], [0.099, 0], [0.1, 85], [0.45, 70], [0.5, 45], [0.6, 30], [0.7, 8], [0.733, 0]], 1, [[0, 100]], 2), "잔상 투명도");
              // 본문: f0 없음 → f1 34% → f2 89% → f4 100%
              var M = addInstance(c, pre, "본문");
              M.motionBlur = true;
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 0], [0.032, 0], [0.033, 90], [0.067, 90], [0.133, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 0], [0.033, 100]], 2, [[2.75, 100], [2.833, 80], [2.9, 60], [2.933, 0]], 1), "본문 투명도");
          } },

        { id: "E02", name: "두둥", dur: 2.967,
          s: { text: "두둥!!", fontLabel: "학교안심 칠판지우개", font: ["blackhansans"], fallback: ["gmarketsansbold"],
               italic: true,
               // 확대 확인: 진한 빨강, 두꺼운 흰 테두리, 기울어진 굵은 글자
               width: 323, fill: ["#F51C24", "#D80A12"], white: 7, shadow: { color: "#000000", op: 45, dir: 135, dist: 4, soft: 5 } },
          build: function (c, pre) {
              // 잔상: f5 136% → f6 208 → f7 262 → f8 296 → f9 319 → 이후 옅게 400%까지, 0.63초에 사라짐
              var E = addInstance(c, pre, "잔상");
              setExpr(T(E).property("ADBE Scale"), scaleExpr([[0.1, 100], [0.133, 108], [0.167, 207], [0.2, 260], [0.233, 293], [0.267, 316], [0.3, 322], [0.367, 349], [0.433, 368], [0.5, 380], [0.6, 400]], 1), "잔상 크기");
              setExpr(T(E).property("ADBE Opacity"), opacityExpr([[0, 0], [0.099, 0], [0.1, 90], [0.3, 75], [0.433, 45], [0.6, 20], [0.633, 0]], 1, [[0, 100]], 2), "잔상 투명도");
              // 본문: f0~1 없음 → f2~3 164% → f4 100% 쾅
              var M = addInstance(c, pre, "본문");
              M.motionBlur = true;
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 164], [0.067, 164], [0.1, 164], [0.133, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 0], [0.066, 0], [0.067, 100]], 1, [[2.75, 100], [2.867, 65], [2.933, 40], [2.967, 0]], 1), "본문 투명도");
          } },

        { id: "E03", name: "우효", dur: 1.5,
          s: { text: "우효~", fontLabel: "전남교육또박체", font: ["gmarketsansbold"], fallback: ["bmjua"],
               width: 346, fill: ["#FFFFFF", "#C9C9C9"], outer: 5, outerColor: "#3A3A3A", shadow: { color: "#000000", op: 70, dir: 135, dist: 6, soft: 8 } },
          build: function (c, pre) {
              // 왼쪽 아래(-176,+120)에서 88% 크기로 출발 → 프레임별 측정 위치를 그대로 따라 0.9초에 안착
              var M = addInstance(c, pre, "본문");
              setExpr(T(M).property("ADBE Position"), LIB + "var K=" + ser([[0, [-176, 120]], [0.167, [-176, 120]], [0.2, [-123, 83]], [0.233, [-91, 61]], [0.267, [-78, 53]],
                  [0.333, [-68, 46]], [0.367, [-51, 34]], [0.433, [-37, 25]], [0.467, [-32, 21]], [0.533, [-23, 15]], [0.567, [-19, 13]], [0.633, [-15, 11]],
                  [0.667, [-11, 8]], [0.733, [-9, 5]], [0.8, [-4, 3]], [0.867, [-3, 2]], [0.933, [-2, 1]], [1.067, [0, 0]]]) + ";value+C(K,1)", "본문 위치");
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 88], [0.167, 88], [0.2, 92], [0.233, 94], [0.267, 95], [0.333, 95.6], [0.367, 96.8], [0.433, 97.8],
                  [0.533, 98.7], [0.567, 99], [0.667, 99.7], [0.733, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 0], [0.033, 50], [0.1, 100]], 1, [[1.0, 100], [1.067, 88], [1.267, 60], [1.433, 35], [1.49, 20], [1.5, 0]], 1), "본문 투명도");
          } },

        { id: "E04", name: "아차차", dur: 1.433,
          s: { text: "아차차", fontLabel: "광양햇살체", font: ["햇살", "haetsal"], fallback: ["gmarketsansbold"], italicOnFallback: true,
               width: 347, fill: ["#4DF7C6", "#1FDDA0"], outer: 5, outerColor: "#173A30", shadow: SH_DARK },
          build: function (c, pre) {
              // 오른쪽 아래(+248,+136)에서 86% 크기로 출발 → 프레임별 측정 위치로 0.97초에 안착
              var M = addInstance(c, pre, "본문");
              setExpr(T(M).property("ADBE Position"), LIB + "var K=" + ser([[0, [248, 136]], [0.1, [248, 136]], [0.133, [170, 93]], [0.2, [170, 93]], [0.233, [122, 67]],
                  [0.267, [90, 49]], [0.333, [67, 36]], [0.4, [67, 36]], [0.433, [49, 26]], [0.467, [35, 20]], [0.533, [25, 13]], [0.633, [14, 7]], [0.667, [11, 5]],
                  [0.733, [9, 4]], [0.767, [4, 2]], [0.8, [3, 2]], [0.867, [1, 1]], [0.967, [0, 0]]]) + ";value+C(K,1)+[0,6]", "본문 위치");
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 86], [0.1, 86], [0.133, 90], [0.2, 90], [0.233, 93], [0.267, 95], [0.333, 96.5], [0.433, 97.8],
                  [0.467, 98], [0.533, 99], [0.633, 99.4], [0.733, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 0], [0.033, 50], [0.067, 100]], 1, [[1.1, 100], [1.2, 80], [1.35, 35], [1.43, 0]], 1), "본문 투명도");
          } },

        { id: "E05", name: "너무신나잖아", dur: 3.033,
          s: { text: "너무 신나잖아", fontLabel: "망고보드 별별체", font: ["별별", "byeolbyeol"], fallback: ["bmjua"],
               // 2차 측정: 어두운 외곽 없음, 얇은 흰 테두리만 / 위 연분홍 → 아래 자홍
               width: 758, fill: ["#F57FA6", "#CF44B5"], white: 5 },
          build: function (c, pre) {
              // 잔상: 0.35초에 본문 크기(100%)로 나타나 1.35초까지 215%로 퍼지며 사라짐 (프레임 폭 측정: f11 103%, f15 120%, f19 138%, f22 149%, f27 167%)
              var E = addInstance(c, pre, "잔상");
              setExpr(T(E).property("ADBE Scale"), scaleExpr([[0.35, 100], [0.5, 120], [0.633, 138], [0.733, 149], [0.9, 167], [1.0, 182], [1.2, 205], [1.35, 215]], 1), "잔상 크기");
              setExpr(T(E).property("ADBE Opacity"), opacityExpr([[0, 0], [0.349, 0], [0.35, 85], [0.8, 60], [1.0, 45], [1.2, 28], [1.333, 0]], 1, [[0, 100]], 2), "잔상 투명도");
              // 본문: 80%·10%에서 커지며 나타남 (f3 80%, f5 85%/35%, f7 92%/64%, f9 97%/88%, f11 100%)
              var M = addInstance(c, pre, "본문");
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 78], [0.1, 80], [0.167, 85], [0.233, 92], [0.3, 97], [0.367, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 0], [0.1, 10], [0.167, 35], [0.233, 64], [0.3, 88], [0.367, 100]], 1,
                  [[2.7, 100], [2.733, 85], [2.833, 62], [2.933, 38], [3.033, 0]], 1), "본문 투명도");
              // 물결 흔들림: 글자 획이 2프레임마다 모양이 바뀌며 꿀렁임 (참고 영상 정지 구간에서 'ㅇ'·세로획 모양이 계속 변함, 3~4px)
              addWobble(E); addWobble(M);
          } },

        { id: "E06", name: "으아악", dur: 3.0,
          s: { text: "으아악!!", fontLabel: "테니다체", font: ["테니다", "tenada"], fallback: ["blackhansans"], italicOnFallback: true,
               // 2차 측정: 어두운 외곽 없음, 얇은 흰 테두리만 / 위 검붉은색 → 아래 빨강
               width: 410, fill: ["#4D0A18", "#D3121F"], white: 4 },
          build: function (c, pre) {
              // 잔상: 0.23초에 나타나 0.9초까지 197%로 퍼지며 사라짐 (렌더 비교 3차: f8 113%, f10 121%, f13 132%, f16 145%, f19 160%, f22 171%, f25 179%, f27 197%)
              var E = addInstance(c, pre, "잔상");
              setExpr(T(E).property("ADBE Scale"), scaleExpr([[0.233, 103], [0.267, 113], [0.333, 121], [0.433, 132], [0.533, 145], [0.633, 160], [0.733, 171], [0.833, 179], [0.9, 197]], 1), "잔상 크기");
              setExpr(T(E).property("ADBE Opacity"), opacityExpr([[0, 0], [0.232, 0], [0.233, 85], [0.6, 55], [0.9, 35], [0.933, 0]], 1, [[0, 100]], 2), "잔상 투명도");
              // 본문: 157%(반투명) → 119% → 100%로 박힘, 그 뒤 끝까지 덜덜 떨림 (초당 10번, 좌우 ±6 / 상하 ±9px)
              var M = addInstance(c, pre, "본문");
              M.motionBlur = true;
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 157], [0.067, 157], [0.133, 119], [0.233, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 0], [0.066, 0], [0.067, 80], [0.133, 100]], 1,
                  [[2.7, 100], [2.733, 85], [2.8, 60], [2.9, 25], [3.0, 0]], 1), "본문 투명도");
              setExpr(T(M).property("ADBE Position"),
                  "var t=time-inPoint;var o=[0,0];if(t>=0.233){seedRandom(Math.floor(t*10),true);o=[random(-7,7),random(-10,10)];}value+o", "본문 떨림");
          } },

        { id: "E07", name: "여기야", dur: 1.3,
          s: { text: "여기야!", fontLabel: "DW임팩타민체", font: ["임팩타민", "impactamin"], fallback: ["bmhannapro", "bmhanna"],
               // 확대 확인: 초록 그라데이션 + 연노랑 테두리 + 그 바깥 얇은 어두운 선
               width: 357, fill: ["#34B88A", "#1E8F68"], white: 8, whiteColor: "#F2EC9A", outer: 9, outerColor: "#2E2A14", shadow: SH_DARK },
          build: function (c, pre) {
              // 아래(+195)에서 82% 크기로 출발 → 프레임별 측정 위치로 1.0초에 안착
              var M = addInstance(c, pre, "본문");
              setExpr(T(M).property("ADBE Position"), LIB + "var K=" + ser([[0, [0, 195]], [0.1, [0, 195]], [0.133, [0, 134]], [0.2, [0, 94]], [0.267, [0, 69]], [0.333, [0, 52]],
                  [0.4, [0, 38]], [0.467, [0, 27]], [0.533, [0, 20]], [0.6, [0, 16]], [0.633, [0, 11]], [0.7, [0, 8]], [0.733, [0, 4]], [0.833, [0, 2]], [0.9, [0, 1]], [1.0, [0, 0]]]) + ";value+C(K,1)+[0,10]", "본문 위치");
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 82], [0.1, 82], [0.133, 88], [0.2, 91], [0.267, 94], [0.333, 95], [0.4, 96], [0.467, 97.5], [0.533, 98.8], [0.7, 99.4], [0.733, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 0], [0.066, 0], [0.067, 60], [0.133, 100]], 1, [[1.0, 100], [1.033, 80], [1.133, 55], [1.233, 35], [1.3, 20]], 1), "본문 투명도");
          } },

        { id: "E08", name: "에효", dur: 1.433,
          s: { text: "에효", fontLabel: "순바탕체", font: ["sunbatangbold", "순바탕bold", "sunbatangmedium", "순바탕", "sunbatang"], fallback: ["nanummyeongjoextrabold", "nanummyeongjootfextrabold", "nanummyeongjo"],
               width: 238, fill: ["#FFFFFF"], outer: 3, outerColor: "#222222", shadow: { color: "#000000", op: 70, dir: 135, dist: 4, soft: 6 } },
          build: function (c, pre) {
              // 위(-158)에서 88% 크기로 내려옴 → 프레임별 측정 위치로 1.0초에 안착
              var M = addInstance(c, pre, "본문");
              setExpr(T(M).property("ADBE Position"), LIB + "var K=" + ser([[0, [0, -158]], [0.133, [0, -158]], [0.2, [0, -111]], [0.267, [0, -80]], [0.333, [0, -59]], [0.4, [0, -43]],
                  [0.467, [0, -31]], [0.533, [0, -22]], [0.6, [0, -14]], [0.667, [0, -9]], [0.733, [0, -4]], [0.8, [0, -2]], [0.867, [0, -1]], [1.0, [0, 0]]]) + ";value+C(K,1)+[0,15]", "본문 위치");
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 88], [0.133, 88], [0.2, 92], [0.267, 94], [0.333, 96], [0.4, 97], [0.467, 97.7], [0.533, 98.6], [0.6, 99], [0.667, 99.5], [0.733, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 0], [0.066, 0], [0.067, 40], [0.133, 100]], 1, [[0.9, 100], [1.0, 85], [1.1, 65], [1.2, 35], [1.27, 0]], 1), "본문 투명도");
          } },

        { id: "E09", name: "만원", dur: 2.967,
          s: { text: "+10,000", fontLabel: "영덕대게체", font: ["영덕대게", "yeongdeok"], fallback: ["gmarketsansbold"],
               // 확대 확인: 노랑 + 얇은 어두운 외곽선
               width: 596, fill: ["#FFE27F", "#F6CF55"], outer: 4, outerColor: "#3A2E10", shadow: { color: "#000000", op: 45, dir: 135, dist: 4, soft: 6 } },
          build: function (c, pre) {
              // 잔상: 본문이 튀어 오른 높이(-87)에 남아 위로 떠오르며 옅어짐 (f8 -112, f10 -145, f12 -178, f14 -209 … -241), 0.7초에 사라짐
              var E = addInstance(c, pre, "잔상");
              setExpr(T(E).property("ADBE Position"), LIB + "var K=" + ser([[0.133, [0, -87]], [0.233, [0, -88]], [0.267, [0, -112]], [0.333, [0, -145]], [0.4, [0, -178]],
                  [0.467, [0, -209]], [0.533, [0, -225]], [0.6, [0, -235]], [0.667, [0, -241]]]) + ";value+C(K,1)", "잔상 위치");
              setExpr(T(E).property("ADBE Opacity"), opacityExpr([[0, 0], [0.132, 0], [0.133, 70], [0.4, 55], [0.533, 45], [0.667, 35], [0.7, 0]], 1, [[0, 100]], 2), "잔상 투명도");
              // 본문: 아래(+119, 40%) → f2 제자리(75%, 91.5%) → f4 위로 튀어 오름(-87) → f6 -51 → f8 -13 → f9 안착
              var M = addInstance(c, pre, "본문");
              setExpr(T(M).property("ADBE Position"), LIB + "var K=" + ser([[0, [0, 119]], [0.033, [0, 119]], [0.067, [0, -1]], [0.1, [0, -1]], [0.133, [0, -87]], [0.167, [0, -87]],
                  [0.2, [0, -51]], [0.233, [0, -51]], [0.267, [0, -13]], [0.3, [0, 0]]]) + ";value+C(K,1)", "본문 위치");
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 90], [0.067, 91.5], [0.133, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 40], [0.033, 40], [0.067, 75], [0.133, 100]], 1, [[2.75, 100], [2.8, 90], [2.85, 50], [2.93, 20], [2.967, 0]], 1), "본문 투명도");
          } },

        { id: "E10", name: "확인완료", dur: 3.067,
          s: { text: "확인완료", fontLabel: "페이퍼로지", font: ["paperlogy9black", "paperlogyblack"], fallback: ["paperlogy8extrabold", "paperlogy"],
               // 확대 확인: 빨강 + 두꺼운 흰 테두리 + 어두운 그림자
               width: 442, fill: ["#F0193A", "#D50F2A"], white: 6, shadow: { color: "#000000", op: 70, dir: 135, dist: 6, soft: 6 } },
          build: function (c, pre) {
              // 기울기 -14° (글자 픽셀 주축 측정 165.9° → -14.1°)
              // 잔상: f4 105% → f5 129 → f7 152 → f9 165 → f11 174 (진함) → 이후 옅게 205%까지, 0.93초에 사라짐
              var E = addInstance(c, pre, "잔상");
              T(E).property("ADBE Rotate Z").setValue(-14);
              setExpr(T(E).property("ADBE Scale"), scaleExpr([[0.133, 105], [0.167, 129], [0.233, 152], [0.3, 165], [0.367, 174], [0.5, 185], [0.7, 197], [0.9, 205]], 1), "잔상 크기");
              setExpr(T(E).property("ADBE Opacity"), opacityExpr([[0, 0], [0.132, 0], [0.133, 85], [0.367, 70], [0.45, 40], [0.7, 25], [0.9, 12], [0.933, 0]], 1, [[0, 100]], 2), "잔상 투명도");
              // 본문: f0~1 174%(모션 블러) → f2 105% → 100% 안착
              var M = addInstance(c, pre, "본문");
              M.motionBlur = true;
              T(M).property("ADBE Rotate Z").setValue(-14);
              setExpr(T(M).property("ADBE Scale"), scaleExpr([[0, 174], [0.033, 105], [0.2, 100]], 1), "본문 크기");
              setExpr(T(M).property("ADBE Opacity"), opacityExpr([[0, 100]], 2, [[2.767, 100], [2.9, 60], [2.967, 45], [3.0, 0]], 1), "본문 투명도");
          } }
    ];

    // 프리미어 '기운없어_자막' 시퀀스와 같은 순서·시작 시간 (미리보기 컴프용)
    var SEQ_START = { E00: 0, E01: 2.833, E02: 5.833, E03: 8.8, E04: 10.3, E05: 11.733, E06: 14.767, E07: 17.767, E08: 19.067, E09: 20.5, E10: 23.467 };

    var step = "시작";
    app.beginUndoGroup("자막효과 만들기");
    try {
        // 0) 폴더 준비: 전체 새로 만들 때만 지우고, 일부만 다시 만들 때는 그대로 둔다
        step = "폴더 준비";
        var folder = null;
        for (var r = app.project.numItems; r >= 1; r--) {
            var it = app.project.item(r);
            if (it instanceof FolderItem && it.name === FOLDER_NAME) {
                if (ONLY.length === 0) { it.remove(); log.push("removed old folder"); } else folder = it;
            }
        }
        if (!folder) folder = app.project.items.addFolder(FOLDER_NAME);
        log.push(ONLY.length ? "다시 만들기: " + ONLY.join(", ") : "전체 새로 만들기");

        var built = [];
        for (var d = 0; d < DEFS.length; d++) {
            var D = DEFS[d];
            if (EXPORT_ONLY) continue;
            if (ONLY.length && !inList(ONLY, D.id)) continue;
            step = D.id + " " + D.name;
            log.push("");
            log.push("== " + D.id + "_" + D.name + " (" + D.dur + "초)");
            var pre = makeTextPrecomp(folder, D.id, D.s, D.dur);
            var comp = reuseComp(D.id + "_" + D.name, D.dur, folder);
            comp.motionBlur = true;
            var fxOut = D.build(comp, pre);
            if (fxOut) {
                var fxP = fxOut.property("ADBE Effect Parade");
                for (var q = 1; q <= fxP.numProperties; q++) dumpEffect(fxP.property(q));
            }
            built.push(comp);
        }

        // 확인용: 효과 한 번씩 (첫 효과만)
        step = "효과 이름 확인";
        var pre0 = null;
        for (var z = 1; z <= app.project.numItems; z++) if (app.project.item(z).name === "E01_글자") pre0 = app.project.item(z);
        if (pre0) {
            log.push("");
            log.push("[효과 속성 확인: E01_글자]");
            for (var y = 1; y <= pre0.numLayers; y++) {
                var fxp = pre0.layer(y).property("ADBE Effect Parade");
                for (var x = 1; x <= fxp.numProperties; x++) dumpEffect(fxp.property(x));
            }
        }

        // 전체 미리보기 컴프 (프리미어 시퀀스와 같은 배치) - 전체 새로 만들 때만
        if (ONLY.length === 0) {
            step = "전체 미리보기";
            var prev = app.project.items.addComp("E_전체_미리보기", W, H, 1, 26.533, FPS);
            prev.parentFolder = folder;
            for (var b = built.length - 1; b >= 0; b--) {
                var id = built[b].name.substr(0, 3);
                var PL = prev.layers.add(built[b]);
                PL.startTime = SEQ_START[id];
            }
        }

        // 확인용 렌더 대기열: 다시 만든 컴프를 PNG로 렌더하도록 넣어 둔다 (Claude가 aerender로 번호 렌더)
        if (!EXPORT_ONLY) {
        step = "렌더 대기열";
        var rdir = new Folder(RENDER_DIR);
        if (!rdir.exists) rdir.create();
        for (var q2 = app.project.renderQueue.numItems; q2 >= 1; q2--) {
            var old = app.project.renderQueue.item(q2);
            try { if (old.comp && /^E\d\d_/.test(old.comp.name)) old.remove(); } catch (e) {}
        }
        for (var bq = 0; bq < built.length; bq++) {
            var rq = app.project.renderQueue.items.add(built[bq]);
            var om = rq.outputModule(1);
            var pngOk = false, tpls = om.templates;
            for (var ti = 0; ti < tpls.length; ti++) {
                if (/png/i.test(tpls[ti])) { try { om.applyTemplate(tpls[ti]); pngOk = true; log.push("  출력 템플릿: " + tpls[ti]); break; } catch (e) {} }
            }
            var idq = built[bq].name.substr(0, 3);
            om.file = new File(RENDER_DIR + "/" + idq + (pngOk ? "_[###].png" : ".avi"));
            log.push("  렌더 대기열 #" + app.project.renderQueue.numItems + ": " + built[bq].name + " → " + om.file.fsName);
        }
        }

        var mainComps = [];
        if (DO_EXPORT) {
        // 프리미어 그래픽 템플릿(.mogrt) 내보내기 - 11개 전부
        //   본 컴프에 숨긴 '글자 입력' 텍스트 레이어를 두고 기본 그래픽 패널에 '텍스트'로 노출,
        //   프리컴프의 '텍스트' 레이어가 그 글자를 따라가게 한다 (외곽·흰테두리·잔상은 이미 '텍스트'를 따라감)
        step = "그래픽 템플릿 준비";
        var MOGRT_DIR = Folder.userData.fsName + "/Adobe/Common/Motion Graphics Templates/" + FOLDER_NAME;
        var mdir = new Folder(MOGRT_DIR);
        if (!mdir.exists) mdir.create();
        for (var m = 0; m < DEFS.length; m++) {
            var DM = DEFS[m];
            var mc = findComp(DM.id + "_" + DM.name), pc = findComp(DM.id + "_글자");
            if (!mc || !pc) { log.push("  템플릿 건너뜀(컴프 없음): " + DM.id); continue; }
            var ctrl = null;
            for (var li2 = 1; li2 <= mc.numLayers; li2++) if (mc.layer(li2).name === "글자 입력") ctrl = mc.layer(li2);
            if (!ctrl) {
                ctrl = mc.layers.addText(DM.s.text);
                ctrl.name = "글자 입력";
                ctrl.guideLayer = true;   // 렌더에 안 나옴
                ctrl.enabled = false;     // 화면에도 안 보임 (글자만 제공)
                ctrl.moveToEnd();
                mc.motionGraphicsTemplateName = DM.id + "_" + DM.name;
                var okEgp = false;
                try { okEgp = ctrl.property("ADBE Text Properties").property("ADBE Text Document").addToMotionGraphicsTemplateAs(mc, "텍스트"); }
                catch (e) { log.push("  FAIL 기본 그래픽 등록 " + DM.id + ": " + e.toString()); }
                log.push("  기본 그래픽 '텍스트' 등록 " + DM.id + ": " + okEgp);
            }
            for (var pl = 1; pl <= pc.numLayers; pl++) {
                if (pc.layer(pl).name === "텍스트")
                    setExpr(pc.layer(pl).property("ADBE Text Properties").property("ADBE Text Document"),
                        'comp("' + mc.name + '").layer("글자 입력").text.sourceText', DM.id + " 글자 입력 연결");
            }
            mainComps.push(mc);
        }

        // 내보내기는 저장된 프로젝트에서만 된다
        step = "프로젝트 저장";
        if (!app.project.file) throw new Error("프로젝트가 저장된 적이 없어요. 먼저 Ctrl+S로 저장해 주세요");
        app.project.save();

        // 하나 내보낼 때마다 AE가 프로젝트를 다시 읽어 컴프 참조가 끊기므로 이름으로 매번 다시 찾는다
        step = "그래픽 템플릿 내보내기";
        var mainNames = [];
        for (var x1 = 0; x1 < mainComps.length; x1++) mainNames.push(mainComps[x1].name);
        for (var x2 = 0; x2 < mainNames.length; x2++) {
            // 두 번째 인자는 '폴더' 경로다 (파일명을 주면 같은 이름의 폴더가 생기고 그 안에 저장됨). 파일명은 템플릿 이름을 따른다
            var outF = new File(MOGRT_DIR + "/" + mainNames[x2] + ".mogrt");
            var okExp = false;
            try { okExp = findComp(mainNames[x2]).exportAsMotionGraphicsTemplate(true, mdir.fsName); }
            catch (e) { log.push("  FAIL 내보내기 " + mainNames[x2] + ": " + e.toString()); }
            log.push("  mogrt " + (okExp ? "ok" : "실패") + ": " + outF.fsName);
        }

        } else {
            step = "프로젝트 저장";
            if (app.project.file) app.project.save();
        }

        step = "완료";
        log.push("");
        log.push("만든 컴포지션 " + built.length + "개, 그래픽 템플릿 " + mainComps.length + "개");
    } catch (err) {
        log.push("ERROR at [" + step + "] line " + err.line + ": " + err.toString());
    }
    app.endUndoGroup();

    var f = new File(here + "/자막효과_report.txt");
    f.encoding = "UTF-8";
    f.open("w");
    f.write(log.join("\n"));
    f.close();

    if (QUIET) {} else if (step === "완료") alert((ONLY.length ? ONLY.join(", ") + " 효과를 다시 만들고" : "자막 효과 11개를 만들고") + " 프리미어 그래픽 템플릿으로 내보냈어요. 프로젝트도 저장했어요. Claude에게 '실행했어'라고 알려주세요.");
    else if (!QUIET) alert("[" + step + "] 단계에서 멈췄어요. Claude에게 '실행했어'라고 알려주세요.");
})();
