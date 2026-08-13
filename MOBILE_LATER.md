# Mobile packaging

The product remains a standards-based PWA. Android testing is distributed as a
Capacitor app containing the compiled web interface; there is still no Expo or
iOS build.

Any future dedicated native clients must use the same authenticated Supabase
API. Do not reintroduce device-local journal storage: email identity,
`journal_state`, private voice paths, group IDs, and notification semantics are
the cross-platform source of truth.
