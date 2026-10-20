"""生成 App 图标 PNG（192 / 512 / maskable 512）。仅构建期使用，不参与运行。"""
import numpy as np
from PIL import Image, ImageDraw

SS = 4  # 超采样倍数


def lerp_gradient(size, c1, c2):
    """135° 线性渐变"""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    t = (x + y) / (2 * (size - 1))
    t = np.clip(t, 0, 1)[..., None]
    a = np.array(c1, dtype=np.float32)
    b = np.array(c2, dtype=np.float32)
    rgb = a * (1 - t) + b * t
    return rgb


def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def star(draw, cx, cy, outer, inner, fill):
    pts = []
    for i in range(8):
        ang = -np.pi / 2 + i * np.pi / 4
        r = outer if i % 2 == 0 else inner
        pts.append((cx + r * np.cos(ang), cy + r * np.sin(ang)))
    draw.polygon(pts, fill=fill)


def build(size, maskable=False):
    S = size * SS
    rgb = lerp_gradient(S, (123, 107, 255), (187, 107, 255))

    img = Image.fromarray(np.dstack([rgb, np.full((S, S, 1), 255)]).astype(np.uint8), 'RGBA')

    # 左上角柔光
    glow = Image.new('L', (S, S), 0)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-S * 0.35, -S * 0.45, S * 0.75, S * 0.6], fill=64)
    glow = glow.filter(__import__('PIL.ImageFilter', fromlist=['GaussianBlur']).GaussianBlur(S * 0.09))
    white = Image.new('RGBA', (S, S), (255, 255, 255, 255))
    img = Image.composite(Image.alpha_composite(img, Image.merge('RGBA', (
        white.split()[0], white.split()[1], white.split()[2], glow))), img, glow.point(lambda v: 255 if v > 0 else 0))

    d = ImageDraw.Draw(img)
    if maskable:
        # 安全区：内容缩到 62%，背景满幅
        c = S / 2
        r_out, r_in = S * 0.235, S * 0.062
    else:
        c = S / 2
        r_out, r_in = S * 0.29, S * 0.078
    star(d, c, c, r_out, r_in, (255, 255, 255, 247))

    # 小星点
    d.ellipse([S * 0.705, S * 0.245, S * 0.765, S * 0.305], fill=(255, 255, 255, 190))
    d.ellipse([S * 0.245, S * 0.712, S * 0.285, S * 0.752], fill=(255, 255, 255, 130))

    img = img.resize((size, size), Image.LANCZOS)

    if not maskable:
        img.putalpha(rounded_mask(size, int(118 / 512 * size)))
    return img


if __name__ == '__main__':
    build(192).save('assets/icon-192.png')
    build(512).save('assets/icon-512.png')
    build(512, maskable=True).save('assets/icon-maskable-512.png')
    print('icons ok')
