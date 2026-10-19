from PIL import Image,ImageDraw,ImageFont
import os,glob,sys
FD=os.environ["LOCALAPPDATA"]+"/Microsoft/Windows/Fonts/"
def f(n):
    g=[x for x in os.listdir(FD) if os.path.splitext(x)[0]==n]; return FD+g[0] if g else None
groups={
 "pink":("샴푸 네고를 할 건데",(250,830,1650,980),25,["Cafe24Ssurround-v2","Cafe24SsurroundAir-v1","BMJUA_otf","Hakgyoansim Dunggeunmiso OTF B","Griun_Mongtori-Rg","Griun_Fromsol-Rg","BMKIRANGHAERANG-OTF","HakgyoansimMoheomgaOTFB","Cafe24Ohsquare-v2","KCC-Ganpan","BMHANNAAir_otf","Hakgyoansim Allimjang OTF B","BMYEONSUNG_otf","EF_jejudoldam(OTF)","강원교육튼튼","강원교육모두 Bold","MapoFlowerIsland"]),
 "red":("잘 안됐어요 거기서는",(250,830,1650,980),175,["Cafe24Supermagic-Bold-v1","BMKkubulim","HSSantokki-Regular","Hakgyoansim_PosterOTFB","BMDOHYEON_otf","BagelFatOne-Regular","BMEULJIRO","BMHANNAProOTF","Cafe24PROUP","KCC-Ganpan","esamanru Bold","Hakgyoansim Byeolbichhaneul OTF B","HakgyoansimKkwabaegiOTFR","WavvePADO-Regular"]),
 "blue":("딸 부잣집 둘째",(250,830,1650,980),115,["GmarketSansBold","Pretendard-Black","Pretendard-ExtraBold","NanumSquareEB","esamanru Bold","Paperlogy-8ExtraBold","Happiness-Sans-Title","BMHANNAProOTF","에이투지체-8ExtraBold","Cafe24Ohsquare-v2"]),
 "white":("오래 기다리셨습니다",(0,830,1400,990),5,["GmarketSansBold","GmarketSansMedium","Pretendard-Bold","Pretendard-ExtraBold","NanumSquareB","NanumSquareEB","esamanru Medium","Paperlogy-7Bold","에이투지체-7Bold","Happiness-Sans-Bold","Hakgyoansim Allimjang OTF B"]),
}
for k,(txt,box,t,fonts) in groups.items():
    ref=Image.open(f"s_{t}.png").crop(box); W=ref.width
    rows=[ref]
    for n in fonts:
        p=f(n)
        if not p: print("없음",n); continue
        im=Image.new("RGB",(W,120),(40,40,40)); d=ImageDraw.Draw(im)
        F=ImageFont.truetype(p,96)
        d.text((20,10),txt,font=F,fill="white"); d.text((W-360,90),n,font=ImageFont.truetype(f("Pretendard-Regular"),22),fill=(255,220,0))
        rows.append(im)
    S=Image.new("RGB",(W,sum(r.height for r in rows))); y=0
    for r in rows: S.paste(r,(0,y)); y+=r.height
    S.save(f"font_{k}.jpg",quality=85)
print("done")
