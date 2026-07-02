# Production Limitations

Known launch limitations:

- The rate limiter is in memory and is not shared across Vercel instances.
- Replicate calls are synchronous and may run close to serverless timeout limits.
- There is no queue, worker, or Replicate webhook flow yet.
- Estimated usage costs are approximate and are not reconciled with actual provider billing.
- There is no automated test suite yet for auth, RLS, usage limits, or provider failure paths.
- Old rows created before private storage may still contain public `image_url` values.
- Client-side PDF/PNG exports are not stored server-side yet.
- Signed image URLs expire and require a session refresh when stale.
- Large base64 uploads can increase request memory pressure before server-side storage.
- The app does not currently include centralized provider observability beyond server logs and usage events.

Recommended future hardening:

- Move rate limiting to Redis or Upstash.
- Move long image jobs to a queue/webhook architecture.
- Add integration tests for `/api/chat`, `/api/generate-designs`, `/api/edit-design`, and `/api/design-brief`.
- Migrate or clean old public image URL rows.
- Store workshop exports server-side under private Storage.
