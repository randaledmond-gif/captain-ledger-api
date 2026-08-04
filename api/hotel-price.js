// Vercel Serverless Function
// Deployed URL will look like: https://your-project.vercel.app/api/hotel-price
// Call it like: /api/hotel-price?destination=Valencia,%20Spain&guests=2
//
// Uses Xotelo (data.xotelo.com) — a free hotel-pricing API with NO key,
// NO signup, and no sales gate (unlike Duffel Stays, which requires a
// sales contact even on an otherwise-free account). Two-step process:
// 1. /search by city name to find a location_key
// 2. /list with that location_key to get real hotels + price ranges

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { destination } = req.query;

  if (!destination) {
    return res.status(400).json({
      error: "Missing required param: destination (a city name, e.g. 'Valencia, Spain')",
    });
  }

  try {
    // Step 1: search by city name to find a location_key
    const searchRes = await fetch(
      `https://data.xotelo.com/api/search?query=${encodeURIComponent(destination)}`
    );

    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      return res.status(searchRes.status).json({ error: "Xotelo search failed", detail: errBody });
    }

    const searchData = await searchRes.json();
    if (searchData.error) {
      return res.status(502).json({ error: "Xotelo search returned an error", detail: searchData.error });
    }

    const firstMatch = searchData.result?.list?.[0];
    const locationKey = firstMatch?.location_key;

    if (!locationKey) {
      return res.status(404).json({ error: "No matching location found for that destination", hotels: [] });
    }

    // Step 2: pull real hotel listings + price ranges for that location
    const listRes = await fetch(
      `https://data.xotelo.com/api/list?location_key=${encodeURIComponent(locationKey)}&limit=5`
    );

    if (!listRes.ok) {
      const errBody = await listRes.text();
      return res.status(listRes.status).json({ error: "Xotelo list failed", detail: errBody });
    }

    const listData = await listRes.json();
    if (listData.error) {
      return res.status(502).json({ error: "Xotelo list returned an error", detail: listData.error });
    }

    const hotels = (listData.result?.list || []).slice(0, 5).map((h) => ({
      name: h.name || "Unnamed stay",
      priceMin: h.price_ranges?.minimum ?? null,
      priceMax: h.price_ranges?.maximum ?? null,
      rating: h.review_summary?.rating ?? null,
      reviewCount: h.review_summary?.count ?? null,
      accommodationType: h.accommodation_type || null,
    }));

    return res.status(200).json({ hotels });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch hotel pricing.", detail: String(err) });
  }
}
