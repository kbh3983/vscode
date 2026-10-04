"""S1/S2: 촬영본 클립 메타데이터 수집.

사용법:
    python probe.py <출력.json> <영상1> <영상2> ...
"""
import json
import subprocess
import sys
from fractions import Fraction


def ffprobe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json",
         "-show_format", "-show_streams", path],
        capture_output=True, text=True, encoding="utf-8", check=True,
    ).stdout
    return json.loads(out)


def summarize(path):
    info = ffprobe(path)
    fmt = info.get("format", {})
    tags = {k.lower(): v for k, v in fmt.get("tags", {}).items()}
    video = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    audio = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)

    fps = None
    if video and video.get("r_frame_rate", "0/0") != "0/0":
        fps = float(Fraction(video["r_frame_rate"]))
    vtags = {k.lower(): v for k, v in (video or {}).get("tags", {}).items()}

    return {
        "path": path,
        "duration": float(fmt.get("duration", 0)),
        "creation_time": tags.get("creation_time") or vtags.get("creation_time"),
        "timecode": vtags.get("timecode") or tags.get("timecode"),
        "camera_model": tags.get("model") or tags.get("com.apple.quicktime.model")
                        or tags.get("encoder") or vtags.get("encoder"),
        "video": None if not video else {
            "codec": video.get("codec_name"),
            "profile": video.get("profile"),
            "width": video.get("width"),
            "height": video.get("height"),
            "fps": fps,
            "fps_raw": video.get("r_frame_rate"),
            "pix_fmt": video.get("pix_fmt"),
            "bit_rate": video.get("bit_rate"),
        },
        "audio": None if not audio else {
            "codec": audio.get("codec_name"),
            "sample_rate": int(audio.get("sample_rate", 0)),
            "channels": audio.get("channels"),
        },
        "format_tags": tags,
    }


def main():
    out_path, files = sys.argv[1], sys.argv[2:]
    result = [summarize(f) for f in files]
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
