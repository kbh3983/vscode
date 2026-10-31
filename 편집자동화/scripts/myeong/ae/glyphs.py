"""줄별 글자(연결 덩어리) 왼쪽 x 위치 비교 — 자간·위치 맞추기용
사용: python glyphs.py <템플릿 폴더> <프레임> y0:y1 [y0:y1 ...]"""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from compare import load  # noqa
