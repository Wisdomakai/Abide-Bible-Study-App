# PWA release compliance checklist

This repository implements the technical controls below, but the service operator must complete the organization-specific items before public release. This is an engineering checklist, not legal advice.

## Implemented

- Passwordless authenticated accounts; anonymous accounts are not created by the PWA.
- User-owned cloud journal rows protected by row-level security.
- Group membership policies for shared posts and temporary signed voice playback URLs.
- Explicit notification opt-in; no automatic browser permission prompt.
- Self-service account deletion, including all voice objects before the identity is removed.
- Web Push endpoints, local reminder time, and timezone disclosed in the privacy policy.
- Public-domain KJV text only. No unverified NIV/NLT “used by permission” claim.
- No advertising SDK or cross-site analytics SDK.

## Operator sign-off required

- Put the legal operator name, jurisdiction, and a working privacy contact in `public/privacy.html`
  (published at https://ardent-study.vercel.app/privacy.html).
- Define documented retention periods for activity records and server backups; configure deletion accordingly.
- Execute and retain the Supabase data-processing agreement and verify the selected hosting region.
- Decide the lawful basis and age policy for the intended countries; obtain qualified legal review where required.
- Confirm the exact production origins in `ALLOWED_ORIGINS`, Supabase Auth redirect URLs, and hosting security headers.
- Verify email delivery, account export/request handling, abuse reporting, and incident-response contacts.
- Run the disposable-account deletion and notification tests in `BUILD.md` against production.

Do not describe the service as fully compliant until these operator-specific decisions and tests are complete.
