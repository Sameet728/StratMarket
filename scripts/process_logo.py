import cv2
import numpy as np
from PIL import Image, ImageOps
import os

img_path = r"C:\Users\vedan\.gemini\antigravity\brain\15cbf054-2a8c-4805-8803-0c9d33fd6ec5\.user_uploaded\media_1794147024059_a1f96bc3.jpg"
if not os.path.exists(img_path):
    img_path = r"C:\Users\vedan\.gemini\antigravity\brain\tempmediaStorage\media_1794147050884_6257444a.jpg"

print(f"Loading image from: {img_path}")
img = cv2.imread(img_path)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Threshold to find logo
_, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)

# Find bounding rect of logo
coords = cv2.findNonZero(thresh)
gx, gy, gw, gh = cv2.boundingRect(coords)
print(f"Bounding rect: x={gx}, y={gy}, w={gw}, h={gh}")

# Crop region with a tiny margin
margin = 4
cy1 = max(0, gy - margin)
cy2 = min(gray.shape[0], gy + gh + margin)
cx1 = max(0, gx - margin)
cx2 = min(gray.shape[1], gx + gw + margin)

cropped_gray = gray[cy1:cy2, cx1:cx2]

# Compute high quality alpha channel:
# Background is white (~255), logo is black (~0).
# Alpha = 255 - pixel_value
alpha = 255 - cropped_gray
# Clip noise near white background
alpha = np.where(alpha < 15, 0, alpha).astype(np.uint8)

# 1. Create White Logo on Transparent Background (for Dark Theme)
white_img = np.full((alpha.shape[0], alpha.shape[1], 4), 255, dtype=np.uint8)
white_img[:, :, 3] = alpha

pil_white = Image.fromarray(white_img)
# Resize to 512x512 with aspect ratio preserved
max_dim = max(pil_white.width, pil_white.height)
square_canvas_white = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
offset_x = (max_dim - pil_white.width) // 2
offset_y = (max_dim - pil_white.height) // 2
square_canvas_white.paste(pil_white, (offset_x, offset_y), pil_white)

# Save high-res 512x512 PNG
res_512_white = square_canvas_white.resize((512, 512), Image.Resampling.LANCZOS)
os.makedirs("public", exist_ok=True)
res_512_white.save("public/logo.png")
res_512_white.save("public/logo-white.png")
print("Saved public/logo.png and public/logo-white.png (512x512)")

# 2. Create Black Logo on Transparent Background
black_img = np.zeros((alpha.shape[0], alpha.shape[1], 4), dtype=np.uint8)
black_img[:, :, 3] = alpha
pil_black = Image.fromarray(black_img)
square_canvas_black = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
square_canvas_black.paste(pil_black, (offset_x, offset_y), pil_black)
res_512_black = square_canvas_black.resize((512, 512), Image.Resampling.LANCZOS)
res_512_black.save("public/logo-dark.png")
print("Saved public/logo-dark.png")

# 3. Create Favicon / Icons
res_32 = square_canvas_white.resize((32, 32), Image.Resampling.LANCZOS)
res_192 = square_canvas_white.resize((192, 192), Image.Resampling.LANCZOS)
res_32.save("public/favicon.ico", format="ICO")
res_192.save("public/icon-192.png")
os.makedirs("src/app", exist_ok=True)
res_32.save("src/app/favicon.ico", format="ICO")
print("Saved public/favicon.ico and src/app/favicon.ico")

# 4. Generate SVG with exact contours
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)
contours = [c for c in contours if cv2.contourArea(c) > 1000]
print(f"Found {len(contours)} main contours for SVG vectorization")

# Sort contours from top to bottom
contours.sort(key=lambda c: cv2.boundingRect(c)[1])

# Normalize to viewBox 0 0 100 118
svg_paths = []
for c in contours:
    d_parts = []
    # Smooth polygon approximation with 0.003
    peri = cv2.arcLength(c, True)
    approx = cv2.approxPolyDP(c, 0.0025 * peri, True)
    for i, pt in enumerate(approx):
        raw_x = pt[0][0] - gx
        raw_y = pt[0][1] - gy
        norm_x = (raw_x / gw) * 100.0
        norm_y = (raw_y / gh) * 118.0
        cmd = "M" if i == 0 else "L"
        d_parts.append(f"{cmd} {norm_x:.2f} {norm_y:.2f}")
    d_parts.append("Z")
    svg_paths.append(" ".join(d_parts))

svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 118" fill="currentColor">
  <path d="{svg_paths[0]}" />
  <path d="{svg_paths[1]}" />
</svg>
"""

with open("public/logo.svg", "w", encoding="utf-8") as f:
    f.write(svg_content)
with open("public/favicon.svg", "w", encoding="utf-8") as f:
    f.write(svg_content)
print("Saved public/logo.svg and public/favicon.svg")

