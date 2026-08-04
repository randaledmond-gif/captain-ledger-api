// Vercel Serverless Function
// Deployed URL will look like: https://your-project.vercel.app/api/flight-price
// Call it like: /api/flight-price?origin=AUS&destination=VLC&date=2026-10-12
//
// Uses Duffel's API (test mode). Duffel auth is a simple Bearer token —
// no OAuth exchange needed, so this is simpler than the old Amadeus version.

export default async function handler(req, res) {
  // Basic CORS so your frontend (wherever it's hosted) can call this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { origin, destination, date, passengers } = req.query;

  if (!origin || !destination || !date) {
    return res.status(400).json({
      error: "Missing required params. Need: origin, destination, date (YYYY-MM-DD)",
    });
  }

  const paxCount = Math.max(1, Math.min(9, parseInt(passengers, 10) || 1));

  try {
    // Step 1: create an offer request (Duffel's search step)
    const offerRequestRes = await fetch("https://api.duffel.com/air/offer_requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DUFFEL_TOKEN}`,
        "Duffel-Version": "v2",
      },
      body: JSON.stringify({
        data: {
          slices: [
            {
              origin,
              destination,
              departure_date: date,
            },
          ],
          passengers: Array.from({ length: paxCount }, () => ({ type: "adult" })),
          cabin_class: "economy",
        },
      }),
    });

    if (!offerRequestRes.ok) {
      const errBody = await offerRequestRes.text();
      return res.status(offerRequestRes.status).json({
        error: "Duffel offer request failed",
        detail: errBody,
      });
    }

    const offerRequestData = await offerRequestRes.json();

    // Duffel returns matching offers inline on the offer_request response
    const offers = (offerRequestData.data?.offers || []).slice(0, 3);

    const flights = offers.map((offer) => ({
      price: offer.total_amount,
      currency: offer.total_currency,
      airline: offer.owner?.name || "unknown",
      stops: offer.slices?.[0]?.segments?.length
        ? offer.slices[0].segments.length - 1
        : null,
    }));

    return res.status(200).json({ flights });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch flight pricing.", detail: String(err) });
  }
}
