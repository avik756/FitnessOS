# Hosting and identity plan

19 November 2026. Proposed architecture, not an implemented migration or a selected vendor. Extends the frontend plan; AGENTS.md remains authoritative.

## The missing foundation

The local app's account and profile tables enforce `id = 1`. Sessions always join that account. Sets, body entries, meals, routines, favourites and the workspace have no user ownership field. Putting a Google button in front of those APIs would still leave everyone accessing the same records. Hosting must introduce identity, ownership, sessions and persistent storage together.

## Recommended direction

Use Vercel for the browser app and Python request handlers, with managed authentication and persistent PostgreSQL. Supabase is a candidate that combines Google sign-in, PostgreSQL and private object storage; adopting it is a recommendation, not a settled dependency. Python remains responsible for fitness operations and validation. Google proves identity; FitnessOS determines record access. Google sign-in does not save workouts to Google Drive or grant Google Fitness/Health data access.

For the first private deployment, restrict access to Avik's approved identity. Establish ownership in the schema now so inviting another person later does not require rebuilding every table. Never expose the current first-visitor local setup endpoint publicly. Public registration is a separate product decision.

## Login and session flow

1. Add Continue with Google to hosted sign-in. Request only openid/email/profile, with a clear cancellation/retry state. Retain local-password mode only for the local prototype initially.
2. Configure the Google OAuth client and consent screen, managed-provider callback, and exact allowed production app redirect. Use a separate configured development/test URL; do not indiscriminately allow all preview domains.
3. Use the supported authorization-code/PKCE flow and state verification. The provider handles Google identity; the Python boundary validates the resulting session/token's signature, issuer, audience and expiry using maintained libraries. A Google token and a managed-provider access token have different issuers and validators.
4. Map the verified provider identity to an immutable internal user ID. Google's `sub` is the stable Google identity, not display name or email. With managed auth, use its internal auth user ID for record ownership. Never merge an existing local account into a Google account just because names or email strings match.
5. Prefer a same-origin Python session boundary with an opaque Secure/HttpOnly cookie and server-held refresh credentials. Define expiry, Remember me, renewal, revocation and logout. A callback may need a short-lived SameSite=Lax transaction cookie; blindly keeping every cookie SameSite=Strict can break OAuth returns. Protect mutating cookie-authenticated requests against CSRF.
6. Return an explicit expired-session response and preserve unsaved drafts through sign-in, without exposing a previous user's draft after account switching. Display signed-in identity, sign out and session controls in Settings. Do not claim Google sign-out automatically signs out of FitnessOS, or vice versa.

## Data ownership and API work

Add `user_id` to sets, favourites, body/calorie/journal entries, foods, custom exercises, routines/days, workout sessions, photos, workspace settings and reminder schedules. Scope uniqueness per user (for example workout names), indexes and relations. A user's set cannot refer to another user's workout session; enforce ownership of both parent and child, preferably with composite foreign keys where suitable.

Each request obtains its user from the verified session. Every query, update, deletion, export and restore operates within that user. Ignore/reject a client-supplied owner field. Example contract: `list_sets(current_user, exercise, cursor)` returns only that user's bounded result set. Cache keys must include user ID and filters; clear sensitive caches and cancel in-flight requests on sign-out/account change.

Enable row-level security as a second boundary. With Supabase, send the validated user's auth context through the data path so policies can use `auth.uid()`. A privileged service key or PostgreSQL role can bypass RLS; storing such a key only on the server does not automatically make unrestricted queries safe. Use a scoped data client/role and explicitly test its effective permissions.

Local browser keys for reminders, navigation, drafts and preferences currently have no account namespace. Migrate them deliberately to user/device-scoped state; never let one user inherit another user's reminders or body data on the same browser. Durable reminder schedules/settings should be included in account export/restore.

## Photos need a different unlock flow

The current photo gallery and photo-inclusive export ask for the local account password. Google-only users do not have one. Replace this with a defined recent-authentication or app-specific step-up flow before enabling those features online. Merely redirecting through Google may silently reuse a session; do not promise fresh password verification without validating provider behavior. Keep a short server-checked unlock lifetime bound to the FitnessOS session.

Store objects privately with owner-scoped access and short-lived authorized retrieval, not public photo URLs. Keep ownership and metadata in PostgreSQL. Confirm upload/export limits and avoid routing large JSON/photo backups through function limits without a bounded or streamed design.

## Migration and recovery

Create the hosted schema and the approved identity first. Import an explicitly selected local backup into that authenticated user's empty dataset, preview counts and types, and write transactionally where possible. Do not migrate local passwords or sessions. Keep the original local database and backup available until round-trip checks pass. Treat schema versions and record-ID mapping explicitly so session/routine/photo relationships survive.

Add account export, deletion and an identity recovery policy. For Google-only sign-in, recovery initially depends on regaining the Google account. If a second login method is added later, link it only after proven control; prevent accidental duplicate accounts or email-based takeover. Choose retention and deletion behavior for backups separately from active data.

## Release order and acceptance

1. Choose private-only versus public registration and the managed auth/database provider. Set up a development project before production.
2. Refactor Python's persistent localhost server into request handlers, while preserving local development mode. Replace SQLite-specific SQL and schema initialization with PostgreSQL migrations and bounded connections.
3. Implement Google sign-in, session validation and ownership across every existing API before exposing real data.
4. Implement private photo storage and the replacement unlock/export flow; migrate device-only settings/reminders deliberately.
5. Route Vercel to the real frontend and Python APIs. Configure provider secrets, database credentials and USDA_API_KEY server-side. Keep testing and production data separate.
6. Test two accounts: B must not read/edit/export/restore/unlock A's records even when B knows A's record IDs. Also test expired tokens, forged owners, session revocation, OAuth cancellation, refresh/redeploy, cross-user parent IDs, account switching and interrupted restore.
7. Import Avik's test records, verify reload and redeployment persistence, then do a real-phone trial. Closed-app reminders still require a scheduler/push delivery path; Google sign-in alone does not provide them.

## Primary references

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [PostgreSQL row-level security in Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)

These document platform capabilities. The implementation and actual target device still require verification.
