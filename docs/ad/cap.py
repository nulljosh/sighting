import sys, json
from playwright.sync_api import sync_playwright
A = sys.argv[1]
SG = "https://sighting.jaybulb.com"; SC = "https://scrounger.jaybulb.com"
BLUE = "a1299f1c-486f-4189-a017-e46cc076a789"
def page(b, scheme="light", w=1600, h=1000, dpr=2, mobile=False):
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, color_scheme=scheme, is_mobile=mobile)
    return ctx, ctx.new_page()
def shot(pg, path, wait=2500):
    pg.wait_for_timeout(wait); pg.screenshot(path=path); print(path.split("/")[-1])
with sync_playwright() as p:
    b = p.chromium.launch(args=["--host-resolver-rules=MAP scrounger.jaybulb.com 104.21.68.227"])
    # --- Sighting
    for scheme in ["light", "dark"]:
        ctx, pg = page(b, scheme); pg.goto(SG + "/", wait_until="networkidle"); shot(pg, f"{A}/sighting/landing-{scheme}.png"); ctx.close()
    ctx, pg = page(b); pg.goto(SG + "/board", wait_until="networkidle"); shot(pg, f"{A}/sighting/board.png")
    pg.get_by_role("button", name="Map", exact=True).click(); pg.wait_for_selector(".minimap .pin", timeout=60000)
    pg.locator(".minimap").scroll_into_view_if_needed(); shot(pg, f"{A}/sighting/board-map.png", 5000)
    pg.locator("summary").click(); pg.locator("details.alerts").scroll_into_view_if_needed(); shot(pg, f"{A}/sighting/alerts.png", 800)
    pg.get_by_role("button", name="Reunited", exact=True).click(); pg.evaluate("scrollTo(0,0)"); shot(pg, f"{A}/sighting/reunited.png", 1500); ctx.close()
    for scheme in ["light", "dark"]:
        ctx, pg = page(b, scheme); pg.goto(f"{SG}/listing?id={BLUE}", wait_until="networkidle"); shot(pg, f"{A}/sighting/listing-{scheme}.png", 5000); ctx.close()
    ctx, pg = page(b, "light", 816, 1056); pg.goto(f"{SG}/listing?id={BLUE}", wait_until="networkidle"); pg.emulate_media(media="print"); shot(pg, f"{A}/sighting/poster.png", 2500); ctx.close()
    ctx, pg = page(b); pg.goto(SG + "/post", wait_until="networkidle"); shot(pg, f"{A}/sighting/post.png", 1500); ctx.close()
    ctx, pg = page(b, "dark", 390, 844, 3, True); pg.goto(SG + "/board", wait_until="networkidle"); shot(pg, f"{A}/sighting/phone-dark.png"); ctx.close()
    # --- Scrounger
    ctx, pg = page(b); pg.goto(SC + "/", wait_until="networkidle"); shot(pg, f"{A}/scrounger/landing.png", 3000); ctx.close()
    for scheme in ["light", "dark"]:
        ctx, pg = page(b, scheme); pg.goto(SC + "/app/", wait_until="networkidle"); pg.wait_for_selector("#grid li"); shot(pg, f"{A}/scrounger/app-{scheme}.png", 3000); ctx.close()
    ctx, pg = page(b); pg.goto(SC + "/app/", wait_until="networkidle"); pg.wait_for_selector("#grid li .star")
    pg.locator("button", has_text="Cars & trucks").click(); pg.wait_for_function("document.querySelector('#status').textContent.includes('results')", timeout=30000); shot(pg, f"{A}/scrounger/cars.png", 3000)
    pg.get_by_role("button", name="Map", exact=True).click(); pg.wait_for_selector("#map .pin"); pg.locator("#map").scroll_into_view_if_needed(); shot(pg, f"{A}/scrounger/map.png", 5000)
    pg.get_by_role("button", name="Map", exact=True).click(); pg.evaluate("scrollTo(0,0)")
    stars = pg.locator("#grid li .star"); [stars.nth(i).click() for i in range(4)]
    pg.locator("#savesearch").click()
    pg.evaluate("""() => { const f = JSON.parse(localStorage.getItem('curbside:favs')); const v = Object.values(f);
      v[0].price = (v[0].price || 100) + 300; v[0].priceString = '$' + v[0].price; localStorage.setItem('curbside:favs', JSON.stringify(f));
      const s = JSON.parse(localStorage.getItem('scrounger:searches')); s.forEach(x => x.newest -= 86400); localStorage.setItem('scrounger:searches', JSON.stringify(s)); }""")
    pg.locator("#grid li .open").nth(5).click(); pg.wait_for_timeout(3000); shot(pg, f"{A}/scrounger/detail.png", 500); pg.locator("#dclose").click()
    pg.reload(wait_until="networkidle"); pg.wait_for_function("[...document.querySelectorAll('#searches button')].some(b => b.textContent.includes('new'))", timeout=30000)
    shot(pg, f"{A}/scrounger/saved-searches.png", 1500)
    pg.locator("#favbtn").click(); pg.wait_for_function("document.querySelectorAll('#grid .deal').length >= 1", timeout=30000); shot(pg, f"{A}/scrounger/price-drop.png", 1000); ctx.close()
    ctx, pg = page(b, "dark", 390, 844, 3, True); pg.goto(SC + "/app/", wait_until="networkidle"); pg.wait_for_selector("#grid li"); shot(pg, f"{A}/scrounger/phone-dark.png", 3000); ctx.close()
    b.close()
