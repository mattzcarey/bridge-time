# Bridge time

Live travel time API for the [25 de Abril bridge](https://en.wikipedia.org/wiki/25_de_Abril_Bridge) in Lisbon, served as a Cloudflare Worker, with an iOS [Scriptable](https://scriptable.app) widget for your home screen. The api is public and rate limited or you can deploy it yourself :) 

<img width="2048" height="1580" alt="25_De_Abril_Bridge_(226290561)" src="https://github.com/user-attachments/assets/98607ee0-2531-44b4-9d49-60f794a54c20" />

<img width="1168" height="540" alt="IMG_6988" src="https://github.com/user-attachments/assets/a2df7c88-f38c-466f-bbee-be4f88f663f0" />

## API

The direction flips automatically by Lisbon local time — morning shows `Caparica → Alcântara` (into town), afternoon shows the reverse (going home). Override with `?dir=to-alcantara|to-caparica`.

```
GET /bridge                     # JSON, direction auto-picked
GET /bridge?dir=to-alcantara    # override
GET /health
```

Response:

```json
{
  "route": "Alcântara → Caparica",
  "bridge": "25 de Abril",
  "direction": "to-caparica",
  "liveMinutes": 54,
  "historicMinutes": 22,
  "noTrafficMinutes": 16,
  "incidentDelayMinutes": 34,
  "distanceKm": 14.2,
  "departure": "2026-04-20T17:06:07+01:00",
  "arrival": "2026-04-20T18:00:01+01:00"
}
```

## Deploy

You need a [TomTom Developer](https://developer.tomtom.com) key — free tier is 2,500 requests/day.

```bash
npm install
npm run deploy                               # creates the Worker
npx wrangler secret put TOMTOM_API_KEY       # paste your TomTom key when prompted
```

Wrangler prints the deployed URL, e.g. `https://bridge-time.<subdomain>.workers.dev`.

### Local development

```bash
cp .env.example .env
# fill in TOMTOM_API_KEY in .env
npm run dev
```

Wrangler loads `.env` automatically for `wrangler dev`. For production, use `wrangler secret put` as above — `.env` is local-only.

## iOS widget

1. Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) from the App Store.
2. Open Scriptable → `+` → paste `widget/bridge-time.js`.
3. Edit `URL` at the top to your deployed Worker URL + `/bridge` (e.g. `https://bridge-time.<subdomain>.workers.dev/bridge`).
4. Tap the script title, rename to `Bridge Time`, tap Done.
5. Home screen → long-press → `+` → search Scriptable → pick Small → Add Widget.
6. Long-press the new widget → Edit Widget → Script = `Bridge Time`, When Interacting = `Run Script`.

iOS refreshes widgets on its own schedule (~15–30 min). Tap to force a refresh.

## Customise for a different route

The route and bridge are hard-coded in `src/index.ts`. I guess you could use this for another bridge. 

## Licence

MIT.
