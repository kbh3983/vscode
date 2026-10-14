import re
def load(p="work/포인트/목교정기_종편_모노_색보정.srt"):
    def sec(s):
        h, m, r = s.split(":"); s2, ms = r.split(",")
        return int(h) * 3600 + int(m) * 60 + int(s2) + int(ms) / 1000
    out = []
    for b in re.split(r"\n\s*\n", open(p, encoding="utf-8-sig").read().strip()):
        l = b.strip().split("\n"); a, z = l[1].split(" --> ")
        out.append((int(l[0]), sec(a.strip()), sec(z.strip()), " ".join(l[2:])))
    return out
