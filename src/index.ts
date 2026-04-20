const CAPARICA = { lat: 38.6446, lon: -9.2354, name: "Caparica" } as const;
const ALCANTARA = { lat: 38.7046, lon: -9.1782, name: "Alcântara" } as const;
// Midpoint of 25 de Abril bridge — forces TomTom to keep the bridge route
// even when live traffic would reroute around it, so live and no-traffic
// times compare on the same physical path.
const BRIDGE_WAYPOINT = "38.6896,-9.1773";

type Direction = "to-alcantara" | "to-caparica";

interface TomTomSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  noTrafficTravelTimeInSeconds?: number;
  historicTrafficTravelTimeInSeconds?: number;
  trafficDelayInSeconds?: number;
  departureTime: string;
  arrivalTime: string;
}

interface TomTomResponse {
  routes: Array<{ summary: TomTomSummary }>;
  error?: { description?: string };
}

// Lisbon wall clock without Intl timezone data — WET/WEST DST heuristic.
// Apr–Sep always DST; the Mar/Oct edges drift by at most a few hours and
// don't matter for the direction flip.
function lisbonHour(now = new Date()): number {
  const month = now.getUTCMonth() + 1;
  const isDst = month >= 4 && month <= 9;
  return (now.getUTCHours() + (isDst ? 1 : 0)) % 24;
}

function defaultDirection(): Direction {
  const h = lisbonHour();
  return h >= 4 && h < 13 ? "to-alcantara" : "to-caparica";
}

function pickEndpoints(direction: Direction) {
  if (direction === "to-caparica") return { from: ALCANTARA, to: CAPARICA };
  return { from: CAPARICA, to: ALCANTARA };
}

async function getBridgeTime(direction: Direction, apiKey: string) {
  const { from, to } = pickEndpoints(direction);
  const origin = `${from.lat},${from.lon}`;
  const dest = `${to.lat},${to.lon}`;
  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/${origin}:${BRIDGE_WAYPOINT}:${dest}/json` +
    `?key=${apiKey}&traffic=true&travelMode=car&routeType=fastest&computeTravelTimeFor=all`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`tomtom HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as TomTomResponse;
  if (data.error?.description) throw new Error(`tomtom: ${data.error.description}`);

  const s = data.routes[0]?.summary;
  if (!s) throw new Error("tomtom: no route returned");

  return {
    route: `${from.name} → ${to.name}`,
    bridge: "25 de Abril",
    direction,
    liveMinutes: Math.round(s.travelTimeInSeconds / 60),
    historicMinutes: Math.round(
      (s.historicTrafficTravelTimeInSeconds ?? s.travelTimeInSeconds) / 60,
    ),
    noTrafficMinutes: Math.round(
      (s.noTrafficTravelTimeInSeconds ?? s.travelTimeInSeconds) / 60,
    ),
    incidentDelayMinutes: Math.round((s.trafficDelayInSeconds ?? 0) / 60),
    distanceKm: Number((s.lengthInMeters / 1000).toFixed(1)),
    departure: s.departureTime,
    arrival: s.arrivalTime,
  };
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (url.pathname === "/" || url.pathname === "/bridge") {
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return json({ error: "rate limited" }, 429);

      const dirParam = url.searchParams.get("dir");
      const direction: Direction =
        dirParam === "to-alcantara" || dirParam === "to-caparica"
          ? dirParam
          : defaultDirection();

      try {
        return json(await getBridgeTime(direction, env.TOMTOM_API_KEY));
      } catch (err) {
        return json({ error: (err as Error).message }, 502);
      }
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
