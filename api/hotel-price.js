// Vercel Serverless Function
// Deployed URL will look like: https://your-project.vercel.app/api/hotel-price
// Call it like:
// /api/hotel-price?lat=39.4699&lng=-0.3763&checkIn=2026-10-12&checkOut=2026-10-17&guests=2

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { lat, lng, checkIn, checkOut, guests } = req.query;

  if (!lat || !lng || !checkIn || !checkOut) {
    return res.status(400).json({
      error: "Missing required params. Need: lat, lng, checkIn, checkOut (YYYY-MM-DD)",
    });
  }

  const guestCount = Math.max(1, Math.min(9, parseInt(guests, 10) || 1));

  try {
    const searchRes = await fetch("https://api.duffel.com/stays/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DUFFEL_TOKEN}`,
        "Duffel-Version": "v2",
      },
      body: JSON.stringify({
        data: {
          location: {
            radius: 10,
            geographic_coordinates: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
            },
          },
          check_in_date: checkIn,
          check_out_date: checkOut,
          guests: Array.from({ length: guestCount }, () => ({ type: "adult" })),
          rooms: 1,
        },
      }),
    });

    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      return res.status(searchRes.status).json({
        error: "Duffel Stays search failed",
        detail: errBody,
      });
    }

    const searchData = await searchRes.json();
    const results = (searchData.data?.results || []).slice(0, 5);

    const hotels = results.map((r) => ({
      name: r.accommodation?.name || "Unnamed stay",
      totalPrice: r.cheapest_rate_total_amount,
      currency: r.cheapest_rate_currency,
      rating: r.accommodation?.review_score || null,
      checkIn: r.check_in_date,
      checkOut: r.check_out_date,
    }));

    return res.status(200).json({ hotels });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch hotel pricing.", detail: String(err) });
  }
}
