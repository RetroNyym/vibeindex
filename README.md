# ✦ VibeLens

> Her badge bir tanıtımdır. Koyduğu her README, aracın büyüme motoru olarak çalışır.

VibeLens, 2026'nın tanımlayıcı sorusunu — **"Bu repo aslında ne kadar vibe-coded?"** — herhangi bir
public GitHub deposu için yanıtlayan, sıfır bağımlılıklı bir web servisidir.

`owner/repo` yapıştır → **Vibe Index (0–100)**, bir hüküm, arkasındaki **kanıt zinciri** ve
paylaşılabilir bir **SVG kart + README badge'i** al.

```
┌──────────────────────────────────────────────┐
│ facebook/react                               │
│ ★ 240k  ·  20k forks  ·  JavaScript          │
│ [ 🤝 AI-ASSISTED ]            ◝ VIBE INDEX   │
│ 23%                          ◟ 23            │
│ AI FINGERPRINT ◞                             │
└──────────────────────────────────────────────┘
```

## Neden bu bot ses getirir? 🚀

- **Repo-bağımsız** — herhangi bir public repoda çalışır; kurulum, giriş, config gerekmez.
- **Kendini yayan** — çıktı, README'ye eklenebilen bir kart/badge; her görsel ücretsiz bir reklam.
- **Meme-lenebilir** — kullanıcılar kendi yüzdesinin ekran görüntüsünü alıp tartışmaya açar. Tartışma = erişim.
- **Doğru an** — "vibe-coded" tespit araçları hâlâ gelişme aşamasında; buna karşılık AI destekli commit'ler 2026'nın commit akışını domine ediyor.

## Hızlı Başlangıç

```bash
node server.js
# → http://localhost:3000
```

`npm install` gereksiz. Sıfır çalışma zamanı bağımlılığı (Node ≥ 18).

İstek limitini artırmak istersen:

```powershell
$env:GITHUB_TOKEN = "ghp_..."; node server.js
```

## API 🛠

| Uç Nokta | Ne Döndürür |
|---|---|
| `GET /api/analyze/:owner/:repo.json` | Tam analiz JSON'u (hesaplanabilir sinyaller + kanıt listesi) |
| `GET /api/card/:owner/:repo.svg` | 496×240 paylaşılabilir kart (`?theme=light` desteklenir) |
| `GET /api/badge/:owner/:repo.svg` | Küçük shields-tarzı README badge'i |
| `GET /r/:owner/:repo` | Kanıt + gömme kodu içeren insanca sonuç sayfası |

Sonuçlar 15 dakika boyunca önbelleğe alınır.

## Vibe Index nasıl hesaplanır? 🧮

**En son 100 commit** üzerinden şu sinyaller hesaplanır:

| Sinyal | Ağırlık | Ne ölçer |
|---|---|---|
| Açık bildirim | 40% | `Co-Authored-By: Copilot/Claude/Cursor/…` trailer'ları, "Generated with…" alıntıları |
| Agent hesapları | 25% | `[bot]` hesapları veya bilinen AI agent kimlikleri tarafından commit |
| Patlama deseni | 20% | Aynı agent'ın 90 saniyede ≥3 commit atması — otonom sprint imzası |
| Stil parmak izi | 15% | Agent'lara özgü, uzun, şablonlu, kişisiz commit gövdeleri |

Hükümler: `HUMAN-CERTIFIED` (0–19) → `HUMAN-DRIVEN` (20–44) → `AI-ASSISTED` (45–74) → `VIBE-CODED` (75–100).

> ⚠️ Bu bir **kanıt göstergesidir**, doğruluk kahini değil. Satır bazında yazarlık bilgisi git
> metadatasında yoktur; sadece commit izinde görünen AI parmak izlerini ölçer. README'de
> dürüst olmak gerekir: araç bunun bir tahmin olduğunu açıkça belirtir.

## Yol haritası 🗺

- Dosya bazlı AI taraması (kural tabanlı heuristics → yerel model)
- GitHub App modu (PR'larda otomatik "repo kalite faturası" yorumu)
- repo-vs-repo "vibe savaşları" liderlik tablosu
- Zaman çizgisinde vibe index grafiği

## Notlar

- MIT Lisans.
- GitHub, Inc. ile ilişkili değildir. "GitHub", GitHub, Inc.'in tescilli markasıdır.

İngilizce belge: [README.en.md](README.en.md)
