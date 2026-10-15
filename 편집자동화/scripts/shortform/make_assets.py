"""숏폼 에이전트 — 최박사 숏폼 템플릿 v2 이미지 만들기 (잘된 숏폼 레퍼런스 실측, 2026-10-14)
  python make_assets.py template <out_dir>                → 프레임·안내 박스 4종·자막 예시 (1080×1920 투명 png, 제자리 배치)
  python make_assets.py title <out.png> "1줄" "2줄"        → 상단 제목 (숏폼마다)
  python make_assets.py sub <out.png> "자막 문구" ["핵심어"] → 대사 자막 한 줄 (핵심어 노랑)
레이아웃(레퍼런스 r3 실측): 위 검정 0~419 / 청록 선 420~440 #00A784 / 영상 441~1476 / 보라 선 1477~1498 #3A338F / 아래 검정
폰트: Pretendard (사용자 지정). 글자 크기는 레퍼런스 줄 폭에 맞춰 자동 계산
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

FD = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts")
FONT = {w: os.path.join(FD, f"Pretendard-{w}.otf") for w in ("Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black")}
EMOJI = r"C:\Windows\Fonts\seguiemj.ttf"
W, H = 1080, 1920
TEAL, PURPLE = (0, 167, 132), (58, 51, 143)
WHITE, YELLOW, MINT, GREEN, LIME, BLACK = (255, 255, 255), (252, 224, 1), (81, 225, 187), (69, 220, 176), (112, 255, 42), (0, 0, 0)
VIDEO = (441, 1476)

def is_emoji(ch): return ord(ch) >= 0x1F000 or 0x2600 <= ord(ch) <= 0x27BF

TRACK = -0.04   # 글자 사이 (크기 비율) — 레퍼런스가 기본보다 좁음
EMO = 0.78      # 이모지 크기 (글자 크기 비율)

def adv(ch, wt, size, track):
    if is_emoji(ch): return ImageFont.truetype(EMOJI, round(size * EMO)).getlength(ch)
    return ImageFont.truetype(FONT[wt], size).getlength(ch) + size * track

def seg_width(segs, size, track=TRACK):
    return sum(adv(ch, wt, size, track) for t, col, wt in segs for ch in t) - size * track

def fit(segs, target, track=TRACK):  # 레퍼런스 줄 폭에 맞는 글자 크기
    return max(10, round(60 * target / seg_width(segs, 60, track)))

def draw_line(img, segs, cx, cy, size, track=TRACK):
    d = ImageDraw.Draw(img); x = cx - seg_width(segs, size, track) / 2
    for t, col, wt in segs:
        for ch in t:
            if is_emoji(ch):
                f = ImageFont.truetype(EMOJI, round(size * EMO))
                d.text((x, cy - size * 0.04), ch, font=f, anchor="lm", embedded_color=True)
            else:
                d.text((x, cy), ch, font=ImageFont.truetype(FONT[wt], size), fill=col, anchor="lm")
            x += adv(ch, wt, size, track)

def canvas(): return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def box(img, x0, y0, x1, y1, col): ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=col)

def frame():
    im = Image.new("RGBA", (W, H), BLACK + (255,))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 420, W, 440], fill=TEAL); d.rectangle([0, 1477, W, 1498], fill=PURPLE)
    d.rectangle([0, VIDEO[0], W, VIDEO[1]], fill=(0, 0, 0, 0))   # 영상 자리 투명
    return im

def title(l1, l2):
    im = canvas()
    for (txt, col, cy, target) in ((l1, WHITE, 227, 797), (l2, YELLOW, 337, 797)):
        segs = [(txt, col, "Black")]
        size = min(fit(segs, target, -0.045), 100)   # 레퍼런스: Black·좁은 자간, 짧은 문구는 크기 상한
        draw_line(im, segs, W / 2, cy, size, -0.045)
    return im

LINES = {   # (세그먼트, 가운데 y, 레퍼런스 줄 폭)
    "단톡방": ((53, 1273, 1026, 1440), [
        ([("굳고 틀어진 몸, 4주면 바뀝니다🔥", WHITE, "Medium")], 1324, 702),
        ([("단톡방 신청은 고정댓글 링크", GREEN, "ExtraBold"), ("를 확인하세요!", WHITE, "Medium")], 1389, 921)]),
    "플레오라": ((19, 1275, 1059, 1461), [
        ([("영상 속 플레오라 운동 기구", MINT, "ExtraBold"), ("가 궁금하시다면?!", WHITE, "Medium")], 1335, 930),
        ([("네이버", LIME, "ExtraBold"), ("에 ", WHITE, "Medium"), ("플레오라", YELLOW, "ExtraBold"), ("를 검색해보세요", WHITE, "Medium")], 1402, 718)]),
    "라이브": ((99, 1286, 963, 1463), [
        ([("유튜브 화요일 오후 8시 🔴", WHITE, "ExtraBold")], 1337, 572),
        ([("최박사의 운동 혁명 라이브 본·방·사·수", YELLOW, "ExtraBold")], 1404, 816)]),
}

def info(name, below=False):
    im = canvas(); (x0, y0, x1, y1), L = LINES[name]
    dy = (1530 - y0) if below else 0          # 라이브 안내는 영상 아래 검정 영역에도 씀
    box(im, x0, y0 + dy, x1, y1 + dy, BLACK + (235,))
    for segs, cy, target in L: draw_line(im, segs, W / 2, cy + dy, fit(segs, target))
    return im

def bottom(name):   # 하단 검정 영역(보라 선 아래) 고정 안내 — 예시 숏폼처럼 상자 없이 2줄. 위치는 예시 실측(글자 y 1555~1672, 가운데 1613) (2026-10-14 사용자: "레퍼런스보다 낮은 것 같은데 … 레퍼런스 기준으로 맞춰줘")
    im = canvas(); (x0, y0, x1, y1), L = LINES[name]
    dy = 1615 - (y0 + y1) / 2
    for segs, cy, target in L: draw_line(im, segs, W / 2, cy + dy, fit(segs, target))
    return im

def profile():
    im = canvas(); box(im, 167, 1266, 911, 1441, WHITE + (255,))
    for segs, cy, target in (([("최문기 박사", BLACK, "ExtraBold")], 1308, 262),
                             ([("《최박사의 운동 혁명》 저자 / 운동생리학 박사", BLACK, "Regular")], 1364, 694),
                             ([("운동 지도 15년 이상 / 보디빌딩 우승 경력", BLACK, "Regular")], 1408, 636)):
        draw_line(im, segs, W / 2, cy, fit(segs, target))
    return im

def sub(text, key=""):
    size = fit([("오금 쪽에", WHITE, "ExtraBold")], 253)       # 레퍼런스 "오금 쪽에" 폭 253
    segs = []
    if key and key in text:
        a, b = text.split(key, 1); segs = [(a, WHITE, "ExtraBold"), (key, YELLOW, "ExtraBold"), (b, WHITE, "ExtraBold")]
    else:
        segs = [(text, WHITE, "ExtraBold")]
    segs = [s for s in segs if s[0]]
    w = seg_width(segs, size); im = canvas(); cy = 1409
    box(im, W / 2 - w / 2 - 18, cy - 49, W / 2 + w / 2 + 18, cy + 50, BLACK + (255,))
    draw_line(im, segs, W / 2, cy, size)
    return im

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "template":
        out = sys.argv[2]; os.makedirs(out, exist_ok=True)
        frame().save(os.path.join(out, "00_프레임.png"))
        profile().save(os.path.join(out, "10_프로필.png"))
        info("단톡방").save(os.path.join(out, "11_단톡방.png"))
        info("플레오라").save(os.path.join(out, "12_플레오라.png"))
        info("라이브").save(os.path.join(out, "13_라이브_영상안.png"))
        info("라이브", below=True).save(os.path.join(out, "14_라이브_영상아래.png"))
        title("중년 이후 꼭 해야하는", "허리 통증 삭제 운동").save(os.path.join(out, "20_상단제목_예시.png"))
        sub("내 무릎 바로 밑에", "무릎").save(os.path.join(out, "30_자막_예시.png"))
        print("ok", out)
    elif cmd == "title": title(sys.argv[3], sys.argv[4]).save(sys.argv[2])
    elif cmd == "sub": sub(sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "").save(sys.argv[2])
