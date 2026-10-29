# Cut a region out of a screenshot and set it low on a 1920x1080 page of its own colour,
# so content from the top of a page can sit under the film's horizon.
import sys
from PIL import Image
A = sys.argv[1]
W, H = 1920, 1080
def low(src, box, out, width=0.78, top=0.60):
    im = Image.open(f"{A}/{src}").convert("RGB"); w, h = im.size
    bg = im.getpixel((4, h - 4))
    c = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
    room_h = int(H * (0.97 - top)); s = min(W * width / c.width, room_h / c.height)
    c = c.resize((int(c.width * s), int(c.height * s)), Image.LANCZOS)
    page = Image.new("RGB", (W, H), bg); page.paste(c, ((W - c.width) // 2, int(H * top) + (room_h - c.height) // 2))
    page.save(f"{A}/{out}"); print(out, c.size)
low("sighting/poster.png", (0.05, 0.02, 0.95, 0.15), "sighting/d-lostcat.png")
low("sighting/poster.png", (0.0, 0.79, 1.0, 0.97), "sighting/d-phone.png")
low("sighting/poster.png", (0.2, 0.17, 0.8, 0.62), "sighting/d-seen.png")
low("sighting/post.png", (0.28, 0.02, 0.74, 0.36), "sighting/d-post.png", 0.72, 0.66)
low("sighting/landing-light.png", (0.15, 0.20, 0.85, 0.62), "sighting/d-hero.png")
low("sighting/landing-dark.png", (0.15, 0.20, 0.85, 0.62), "sighting/d-hero-dark.png")
low("sighting/board.png", (0.06, 0.0, 0.94, 0.30), "sighting/d-tabs.png")
low("scrounger/saved-searches.png", (0.01, 0.175, 0.62, 0.31), "scrounger/d-chips.png")
low("scrounger/price-drop.png", (0.02, 0.30, 0.37, 0.70), "scrounger/d-drop.png")
low("scrounger/detail.png", (0.27, 0.0, 0.73, 0.5), "scrounger/d-detail.png")
low("scrounger/app-light.png", (0.01, 0.0, 0.62, 0.22), "scrounger/d-header.png", 0.78, 0.66)
low("scrounger/phone-dark.png", (0.0, 0.0, 1.0, 0.5), "scrounger/d-phone.png", 0.5)

# the dog's photo on its own, full frame, for the long zoomed shots
im = Image.open(f"{A}/sighting/board.png").convert("RGB"); w, h = im.size
ph = im.crop((int(0.164 * w), int(0.335 * h), int(0.323 * w), int(0.492 * h)))
s2 = max(W / ph.width, H / ph.height); ph = ph.resize((int(ph.width * s2) + 1, int(ph.height * s2) + 1), Image.LANCZOS)
ph.crop(((ph.width - W) // 2, (ph.height - H) // 2, (ph.width - W) // 2 + W, (ph.height - H) // 2 + H)).save(f"{A}/sighting/d-dog.png"); print("d-dog")
