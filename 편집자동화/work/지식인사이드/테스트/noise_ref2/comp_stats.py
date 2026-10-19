import numpy as np, glob, sys
from PIL import Image
D=sys.argv[1]; W,H=int(sys.argv[2]),int(sys.argv[3]); mask=len(sys.argv)>4
fs=sorted(glob.glob(D+"/f_*.png"))
def plate(i):
    a=np.asarray(Image.open(fs[i]).convert("L").resize((960,540))).astype(int)
    if mask: a[215:325,280:690]=0
    return a
def comps(a,th=14):
    m=a>th; seen=np.zeros_like(m); out=[]
    ys,xs=np.where(m)
    for y,x in zip(ys,xs):
        if seen[y,x]: continue
        st=[(y,x)]; seen[y,x]=1; px=[]
        while st:
            cy,cx=st.pop(); px.append((cy,cx))
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    ny,nx=cy+dy,cx+dx
                    if 0<=ny<540 and 0<=nx<960 and m[ny,nx] and not seen[ny,nx]: seen[ny,nx]=1; st.append((ny,nx))
        P=np.array(px); h=np.ptp(P[:,0])+1; w=np.ptp(P[:,1])+1; v=a[P[:,0],P[:,1]]
        out.append((len(P),max(h,w),v.max(),v.mean()))
    return out
prev=plate(0); idx=[0]
for i in range(1,len(fs)):
    a=plate(i); A=prev>14;B=a>14
    if (A&B).sum()/max(1,(A|B).sum())<0.3: idx.append(i)
    prev=a
d=np.diff(idx); print("장 수",len(idx),"유지 프레임 분포",{k:int((d==k).sum()) for k in range(1,7)})
allc=[]; per=[]
for i in idx[::2]:
    c=comps(plate(i)); allc+=c; per.append(len(c))
C=np.array(allc,dtype=float)
print("장당 덩어리 수 분위",np.percentile(per,[10,50,90]).round(0))
for lo,hi in [(1,1),(2,3),(4,8),(9,20),(21,60),(61,9999)]:
    s=C[(C[:,0]>=lo)&(C[:,0]<=hi)]; print(f"크기 {lo}-{hi}: 장당 {len(s)/len(per):.1f}개, 최고밝기 중앙 {np.median(s[:,2]) if len(s) else 0:.0f}, 평균밝기 {np.median(s[:,3]) if len(s) else 0:.0f}, 길이 중앙 {np.median(s[:,1]) if len(s) else 0:.0f}")
