# Captain's Ledger — Pricing API

A tiny serverless proxy that keeps your Duffel API token off the
frontend, so the Captain's Ledger app can pull real flight pricing safely.

> Note: this originally used Amadeus, but Amadeus fully shut down its
> free self-service developer portal on July 17, 2026. Duffel is the
> replacement — same idea (free sandbox, no sales calls), simpler auth
> (a plain bearer token instead of an OAuth exchange).

## Setup

1. **Get a Duffel test token**
   - Sign up free at https://app.duffel.com/join (name, email, password — about a minute)
   - In your dashboard, make sure you're in "Developer test mode"
   - Create an access token — it will start with `duffel_test_`

2. **Deploy to Vercel**
   - Push this folder to a GitHub repo (or drag-and-drop via the Vercel
     dashboard if you don't want to use git yet)
   - Go to https://vercel.com, sign in, click "Add New Project", import
     this repo
   - Before deploying, add one Environment Variable in the Vercel
     project settings:
     - `DUFFEL_TOKEN` = your test token
   - Deploy. Vercel auto-detects the `/api` folder and turns
     `flight-price.js` into a live endpoint.

3. **Test it**
   Once deployed, visit (in a browser or via curl):
   ```
   https://your-project.vercel.app/api/flight-price?origin=AUS&destination=VLC&date=2026-10-12
   ```
   You should get back JSON like:
   ```json
   { "flights": [{ "price": "412.50", "currency": "USD", "airline": "Duffel Airways", "stops": 0 }] }
   ```

## Connecting it to the Captain's Ledger frontend

In `captain-ledger.jsx`, after the itinerary text comes back from Claude,
add one more fetch to your deployed endpoint and splice the real price
into the budget breakdown:

```js
const priceRes = await fetch(
  `https://your-project.vercel.app/api/flight-price?origin=AUS&destination=VLC&date=2026-10-12`
);
const { flights } = await priceRes.json();
// flights[0].price is a real, current price from Duffel's test data
```

Note: Duffel's test mode mostly returns offers from its own sandbox
airline ("Duffel Airways") rather than real-world carriers, so prices
are realistic-shaped but not live market prices. That's expected and
fine for a portfolio piece — a note in your project README saying
"pricing sourced from Duffel's sandbox" is honest and still shows the
real integration skill.

## Notes

- Duffel auth is a simple Bearer token — no token refresh/caching logic
  needed, unlike the old Amadeus OAuth flow.
- Origin/destination must be IATA airport codes (e.g. AUS, VLC, JFK).
- Test mode routes through airline sandbox environments Duffel doesn't
  fully control, so occasional flakiness or "sold out" test inventory
  is normal — not a bug in this code.
- CORS is open (`*`) since this is a portfolio project with no sensitive
  user data flowing through it. Lock this down to your actual frontend
  domain if you ever put real user data through it.

