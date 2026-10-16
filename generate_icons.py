import os
from PIL import Image, ImageDraw, ImageFont

public_dir = r"c:\Users\HP PC\Desktop\My apps\WAYBILL\public"
os.makedirs(public_dir, exist_ok=True)

def create_goalstreet_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded rect
    corner_radius = int(size * 0.22)
    bg_color = (84, 39, 230, 255) # #5427E6
    draw.rounded_rectangle([0, 0, size, size], radius=corner_radius, fill=bg_color)

    # Tactile bottom shadow inside
    shadow_h = int(size * 0.06)
    shadow_color = (69, 0, 216, 255) # #4500D8
    draw.rounded_rectangle([int(size * 0.08), size - shadow_h - int(size * 0.08), size - int(size * 0.08), size - int(size * 0.08)], radius=int(size * 0.04), fill=shadow_color)

    # Inner bright card
    inner_pad = int(size * 0.1)
    inner_radius = int(size * 0.16)
    inner_color = (109, 74, 255, 255) # #6D4AFF
    draw.rounded_rectangle([inner_pad, inner_pad, size - inner_pad, size - inner_pad - int(size * 0.03)], radius=inner_radius, fill=inner_color)

    # Draw letter or emblem
    # Try finding font or draw crisp stylish "GS" with a cap visor curve
    try:
        font_size = int(size * 0.44)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "GS"
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (size - w) / 2
    y = (size - h) / 2 - int(size * 0.05)

    # Soft text shadow
    draw.text((x + int(size * 0.015), y + int(size * 0.02)), text, font=font, fill=(50, 20, 150, 200))
    # Main text
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    # Add visor line beneath GS (symbolizing the Goalstreet Cap)
    visor_y = int(y + h + size * 0.08)
    draw.rounded_rectangle([int(size * 0.28), visor_y, int(size * 0.72), visor_y + int(size * 0.05)], radius=int(size * 0.025), fill=(245, 191, 52, 255))

    return img

icon_192 = create_goalstreet_icon(192)
icon_192.save(os.path.join(public_dir, "pwa-192x192.png"))

icon_512 = create_goalstreet_icon(512)
icon_512.save(os.path.join(public_dir, "pwa-512x512.png"))

apple_icon = create_goalstreet_icon(180)
apple_icon.save(os.path.join(public_dir, "apple-touch-icon.png"))

# Favicon
icon_32 = create_goalstreet_icon(32)
icon_32.save(os.path.join(public_dir, "favicon.ico"), format="ICO")

print("All PWA icons generated successfully!")
