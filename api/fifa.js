const resources = {
  standings: "/api/v3/groupstanding/third/285023?language=ko",
  matches: "/api/v3/calendar/matches?idSeason=285023&language=ko&count=100",
};

export default async function handler(request, response) {
  const resource = Array.isArray(request.query.resource) ? request.query.resource[0] : request.query.resource;
  const path = resources[resource];

  if (!path) {
    response.status(400).json({ error: "Unknown FIFA resource" });
    return;
  }

  try {
    const upstream = await fetch(`https://api.fifa.com${path}`, {
      headers: { accept: "application/json" },
    });
    const body = await upstream.text();

    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
    response.status(upstream.status).send(body);
  } catch {
    response.status(502).json({ error: "FIFA data is temporarily unavailable" });
  }
}
