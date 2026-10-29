import json, sys
A = sys.argv[1]
I = lambda f, fo, z, s: dict(image=f, focus=fo, zoom=z, sky=s, **({"push": 0.0} if fo == [0.5, 0.78] else {}))
F = lambda c: dict(fill=c, sky="ink")
LOW = [0.5, 0.78]
def spec(app, title, words, palette, glow, pool):
    assert len(pool) == 34, len(pool)
    return {"out": f"{app}-ad.mp4", "size": [1920, 1080], "fps": 30, "font": "fonts/SF-Medium.ttf", "font_bold": "fonts/SF-Bold.ttf",
            "font_size": 100, "palette": palette, "sky": "ink", "glow": glow, "open": {"secs": 1.6}, "pool": pool, "grain": 0.15,
            "schedule": {"count": 34, "first": 1.05, "last": 0.12}, "words": words, "title": {"text": title, "secs": 1.4},
            "end": {"mark": f"{app}/mark.png", "name": title, "secs": 3.0}}
s = "sighting/"
sighting = spec("sighting", "Sighting", [[12, "Bring"], [16, "them"], [18, "home."]],
  {"paper": "#fdfdfd", "ink": "#121212", "orange": "#e06a0a", "lost": "#c9302c", "found": "#2f8a4e", "sand": "#f2e4d8"}, ["paper", "orange"], [
  I(s+"d-hero.png", LOW, 1.0, "paper"), I(s+"board-map.png", [0.38, 0.42], 2.4, "ink"), I(s+"d-lostcat.png", LOW, 1.0, "paper"),
  I(s+"listing-light.png", [0.5, 0.3], 2.6, "ink"), I(s+"board.png", [0.15, 0.42], 2.6, "paper"), I(s+"d-seen.png", LOW, 1.3, "ink"),
  I(s+"d-post.png", LOW, 1.15, "paper"), I(s+"listing-dark.png", [0.5, 0.3], 2.6, "ink"), I(s+"alerts.png", [0.3, 0.27], 2.4, "paper"),
  I(s+"phone-dark.png", [0.5, 0.62], 1.3, "ink"), I(s+"d-dog.png", [0.5, 0.45], 1.0, "paper"), I(s+"phone-dark.png", [0.5, 0.55], 1.6, "ink"),
  # "Bring" lands on 12
  I(s+"d-dog.png", [0.5, 0.45], 1.25, "paper"), F("orange"), I(s+"board-map.png", [0.30, 0.40], 3.4, "ink"), F("sand"),
  # "them" on 16, "home." on 18 and holds
  I(s+"d-dog.png", [0.5, 0.45], 1.5, "paper"), F("lost"), I(s+"listing-light.png", [0.5, 0.29], 3.4, "ink"), F("found"),
  I(s+"d-seen.png", LOW, 1.6, "paper"), F("orange"), I(s+"board-map.png", [0.45, 0.44], 3.0, "ink"), F("paper"),
  I(s+"d-lostcat.png", LOW, 1.0, "ink"), F("sand"), I(s+"listing-dark.png", [0.5, 0.29], 3.4, "paper"), F("orange"),
  I(s+"board.png", [0.15, 0.42], 2.6, "ink"), F("found"), I(s+"alerts.png", [0.3, 0.27], 3.0, "paper"), F("lost"),
  I(s+"board-map.png", [0.38, 0.42], 2.4, "ink"), F("orange")])
c = "scrounger/"
scrounger = spec("scrounger", "Scrounger", [[12, "Find"], [16, "it"], [18, "first."]],
  {"paper": "#fdfdfd", "ink": "#0a0e19", "blue": "#0044cc", "sky2": "#6f9dff", "mist": "#f2f3f7", "night": "#141a2a"}, ["paper", "sky2"], [
  I(c+"app-light.png", [0.5, 0.42], 1.9, "paper"), I(c+"map.png", [0.47, 0.42], 2.4, "ink"), I(c+"cars.png", [0.4, 0.42], 2.2, "paper"),
  I(c+"d-drop.png", LOW, 1.9, "ink"), I(c+"d-chips.png", LOW, 1.4, "paper"), I(c+"phone-dark.png", [0.5, 0.75], 1.3, "ink"),
  I(c+"d-detail.png", LOW, 1.9, "paper"), I(c+"app-dark.png", [0.5, 0.42], 1.9, "ink"), I(c+"d-header.png", LOW, 1.05, "paper"),
  I(c+"cars.png", [0.6, 0.42], 2.6, "ink"), I(c+"landing.png", [0.5, 0.48], 2.2, "paper"), I(c+"map.png", [0.38, 0.40], 3.2, "ink"),
  I(c+"cars.png", [0.4, 0.42], 3.0, "paper"), F("blue"), I(c+"map.png", [0.55, 0.45], 2.8, "paper"), F("mist"),
  I(c+"d-drop.png", LOW, 2.4, "paper"), F("sky2"), I(c+"map.png", [0.47, 0.42], 3.2, "ink"), F("night"),
  I(c+"cars.png", [0.4, 0.42], 3.4, "paper"), F("blue"), I(c+"app-dark.png", [0.5, 0.42], 2.6, "paper"), F("mist"),
  I(c+"cars.png", [0.6, 0.42], 3.2, "ink"), F("sky2"), I(c+"d-detail.png", LOW, 2.4, "paper"), F("blue"),
  I(c+"cars.png", [0.25, 0.42], 3.0, "ink"), F("night"), I(c+"map.png", [0.38, 0.40], 2.4, "paper"), F("mist"),
  I(c+"cars.png", [0.4, 0.42], 2.2, "ink"), F("blue")])
for n, sp in [("sighting", sighting), ("scrounger", scrounger)]: json.dump(sp, open(f"{A}/{n}.json", "w"), indent=1); print(n, "ok")
