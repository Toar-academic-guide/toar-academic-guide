---
title: "feat: google oauth sign-in"
type: feat
date: 2026-06-24
---

# Google OAuth Sign-In Implementation Plan

## Summary

Add Google sign-in to the existing Supabase-backed auth flow by extending the current auth screen, completing the Next.js App Router callback/code-exchange path, and ensuring Google-authenticated users land in the same usable persisted profile flow as email/password users.

---

## Problem Frame

The current app on `origin/main` already supports Supabase email/password authentication, confirmation-link redirects, authenticated profile persistence, and session refresh via `src/proxy.ts`. The missing slice is Google OAuth: there is no social-auth entry point in the UI, no `/auth/callback` route to exchange the PKCE code for a session, and no explicit plan for how Google identity data should feed the app-owned `User Profile`.

This work is narrower than the earlier umbrella auth hardening effort. It should add Google sign-in without reopening the broader auth architecture, replacing Supabase email delivery, or redesigning the auth experience.

---

## Requirements

- R1. Users can start Google sign-in from the existing auth screen without losing the current email/password flow.
- R2. The Google OAuth flow uses Supabase's server-side auth pattern for web PKCE, including a callback route that exchanges the returned code for a session.
- R3. After the callback completes, a Google-authenticated user is recognized by the current auth/profile flow and can use the app as an authenticated user.
- R4. First and last name data from Google may seed the app-owned `User Profile`, but the persisted profile remains the durable product source of truth.
- R5. The callback path must not introduce open-redirect behavior; any post-login redirect target must stay relative to the app origin.
- R6. Existing anonymous exploration, email/password login, signup, saved programs, and profile synchronization must keep working.
- R7. The implementation must keep using the current Supabase browser/server client utilities and the existing `src/proxy.ts` session refresh pattern rather than introducing a parallel auth stack.
- R8. The plan must document the local and deployed redirect configuration needed for verification, since OAuth failures often come from configuration drift outside the repo.

---

## Key Technical Decisions

- KTD1. Extend the current `AuthContext` and `AuthScreen` rather than adding Google's client SDK or One Tap. The repo already standardizes auth actions through Supabase, and keeping Google under the same boundary avoids a second auth stack.
- KTD2. Use a dedicated App Router callback route that calls `exchangeCodeForSession(code)` on the server. Supabase's SSR guidance for Next.js expects a callback route for PKCE flows, and the current repo already has the server-side client utilities needed for it.
- KTD3. Preserve the app-owned profile model as the source of truth for identity fields. Google metadata should only hydrate `firstName` and `lastName` when the persisted profile is still empty, so social auth does not silently overwrite user-edited profile data.
- KTD4. Keep post-auth redirect handling relative and validated. The callback route may support a `next` parameter for returning users to the intended screen, but only for relative paths to avoid open-redirect risks.
- KTD5. Treat deployed redirect verification as part of the feature, not an afterthought. A localhost-only test is insufficient for OAuth correctness because callback allow-lists and host mismatches usually surface only in preview or production environments.

---

## System-Wide Impact

This change touches the auth lifecycle across browser and server boundaries: client-side auth initiation, server-side code exchange, cookie-backed session establishment, and the existing profile sync that runs after authentication. It also affects operational setup because the Supabase redirect allow-list and the Google provider configuration must stay aligned with the app's callback route.

The data model does not need a schema change because first and last name persistence already exists in `user_profiles`. The system impact is behavioral rather than structural: the repo must treat a new social-auth user as equivalent to an email/password user once the session is established.

---

## High-Level Technical Design

```mermaid
flowchart TD
  Screen[Auth screen] --> OAuthStart[AuthContext signInWithOAuth]
  OAuthStart --> Google[Google consent]
  Google --> Supabase[Supabase OAuth callback]
  Supabase --> Callback[app/auth/callback route]
  Callback --> Exchange[exchangeCodeForSession]
  Exchange --> Session[Cookie-backed session]
  Session --> ProfileHook[useUserProfile hydration]
  ProfileHook --> ProfileAPI[/api/profile]
  ProfileAPI --> ProfileDB[(user_profiles)]
```

The browser initiates Google auth through Supabase, Google returns control through Supabase's hosted callback, and the app-side callback route performs the code exchange that creates the authenticated session. Once the session exists, the existing profile hook and profile API continue the user bootstrap, optionally filling missing profile names from social metadata when safe.

---

## Implementation Units

### U1. Add Google OAuth Entry Point to the Existing Auth Surface

- **Goal:** Extend the current auth boundary and auth screen so users can start Google sign-in alongside email/password auth.
- **Requirements:** R1, R6, R7
- **Dependencies:** None
- **Files:** `src/context/AuthContext.tsx`, `src/context/AuthContext.test.ts`, `src/components/AuthScreen.tsx`, `src/components/AuthScreen.test.tsx`
- **Approach:** Add a dedicated Google auth action to `AuthContext` that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`, using the same environment/origin conventions already used for signup redirect handling. Expose that action in `AuthScreen` as a secondary CTA that matches the current compact auth layout without blocking email/password login.
- **Patterns to follow:** Mirror the existing `AuthResult` / `configured` behavior in `src/context/AuthContext.tsx` and the existing submit/feedback handling pattern in `src/components/AuthScreen.tsx`.
- **Test scenarios:**
  - Happy path: clicking the Google CTA calls the auth boundary's Google action.
  - Edge case: when Supabase auth is unconfigured, the Google CTA stays unavailable alongside the existing email/password affordances.
  - Edge case: switching between login and signup modes does not hide or break the Google entry point.
  - Error path: if the Google auth initiation returns an error, the existing inline error surface shows a user-facing message instead of silently failing.
- **Verification:** Auth screen and auth context tests prove the Google action is wired and the email/password flow still behaves as before.

### U2. Add the App Router OAuth Callback and Safe Redirect Handling

- **Goal:** Create the callback route that exchanges the returned OAuth code for a session and safely redirects the user back into the app.
- **Requirements:** R2, R3, R5, R7
- **Dependencies:** U1
- **Files:** `src/app/auth/callback/route.ts`, `src/app/auth/callback/route.test.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/env.ts`
- **Approach:** Add a `GET` route handler at `src/app/auth/callback/route.ts` that reads `code` and an optional `next` parameter, exchanges the code through the existing server Supabase client, and redirects to a safe relative destination. Keep redirect validation in the route so non-relative `next` values fall back to a default app entry point instead of turning into an open redirect.
- **Patterns to follow:** Reuse the current App Router route-handler style and Supabase server client pattern already used by `src/app/api/profile/route.ts` and `src/lib/supabase/server.ts`.
- **Test scenarios:**
  - Happy path: a valid callback request with a code exchanges the session and redirects to the default in-app destination.
  - Happy path: a valid relative `next` parameter redirects to that relative path after a successful exchange.
  - Edge case: a missing code redirects to a safe fallback rather than crashing the route.
  - Error path: a failed code exchange redirects to an auth-safe fallback and does not leave the route in an unhandled error state.
  - Error path: an absolute or malformed `next` value is ignored and replaced with the safe default destination.
- **Verification:** Route tests cover exchange success, invalid redirect targets, and fallback behavior; the route fits the existing server-client utility shape without introducing a second auth helper stack.

### U3. Hydrate Social Identity Into the Existing User Profile Flow

- **Goal:** Ensure a first-time Google-authenticated user lands in a usable persisted profile state without overwriting existing profile identity data.
- **Requirements:** R3, R4, R6
- **Dependencies:** U1, U2
- **Files:** `src/context/AuthContext.tsx`, `src/hooks/useUserProfile.ts`, `src/hooks/useUserProfile.test.tsx`, `src/server/user/migration.ts`, `src/server/user/migration.test.ts`
- **Approach:** Reuse the current authenticated profile bootstrap path instead of adding a separate persistence endpoint. When a user signs in with Google and the server-backed profile is missing `firstName` or `lastName`, derive candidate values from Supabase user metadata and merge them through the existing profile draft/server merge flow, while preserving server-first semantics for already-populated profile fields.
- **Execution note:** Start with characterization coverage for the current signed-in profile bootstrap path before adding the social-identity merge branch.
- **Patterns to follow:** Extend the existing `sag_user_profile_v1` draft and merge semantics in `src/hooks/useUserProfile.ts` and `src/server/user/migration.ts`; do not invent a separate "social profile setup" path.
- **Test scenarios:**
  - Happy path: a newly authenticated Google user with an empty server profile gets first and last name hydrated into the persisted profile snapshot.
  - Edge case: if the server profile already has one or both names, social metadata does not overwrite them.
  - Edge case: if Google metadata is partial or missing, the profile sync still succeeds and leaves missing fields untouched.
  - Integration scenario: after session establishment, the existing profile hook loads the authenticated snapshot and completes the merge without requiring a manual profile-edit step.
- **Verification:** Hook and migration tests prove the social identity merge only fills empty fields and preserves the current authenticated profile behavior for existing users.

### U4. Capture Operational Configuration and End-to-End Verification Expectations

- **Goal:** Make the external redirect setup and verification steps explicit so implementation and QA can validate the feature in both local and deployed environments.
- **Requirements:** R2, R3, R8
- **Dependencies:** U1, U2, U3
- **Files:** `.env.local.example`, `README.md`, `src/components/AuthScreen.test.tsx`, `src/context/AuthContext.test.ts`, `src/app/auth/callback/route.test.ts`
- **Approach:** Document the callback route assumptions, the required Supabase redirect allow-list entries, and the role of `NEXT_PUBLIC_APP_URL` in constructing callback destinations. Keep the verification expectations in the plan and docs tightly focused on this OAuth slice rather than turning them into a broad auth runbook.
- **Patterns to follow:** Match the short operational style already used in `.env.local.example` and the focused auth helper tests already present in the repo.
- **Test scenarios:**
  - Happy path: the callback redirect target builder prefers the configured public app URL when present.
  - Configuration scenario: docs clearly distinguish the Supabase hosted callback URI from the app's own `/auth/callback` allow-list entries.
  - Integration scenario: the verification checklist includes both localhost and deployed-host OAuth runs.
  - Error path: documentation covers what to inspect when the callback route exists in code but the OAuth flow still fails due to misconfigured allow-lists or origins.
- **Verification:** The env/docs updates name every required public value and redirect target; tests cover redirect helper expectations; the manual verification checklist is sufficient to exercise both local and deployed OAuth flows.

---

## Scope Boundaries

### Included

- Google sign-in initiation from the current auth screen
- App Router callback handling for Supabase web PKCE OAuth
- Safe post-login redirect handling within the app
- First-time Google identity hydration into the existing `User Profile` flow
- Local and deployed redirect-configuration documentation for this slice

### Deferred to Follow-Up Work

- Google One Tap or Google's prebuilt button SDK
- Broader auth UX redesign or visual overhaul of the auth screen
- Rewriting the repo-wide Supabase proxy/session refresh posture
- Account linking between existing email/password users and separate Google identities
- Social-provider expansion beyond Google

### Out of Scope

- Replacing Supabase's email delivery path
- Password reset, MFA, or account recovery changes
- New database schema changes for profile identity fields
- Mobile deep-linking or native-app auth flows

---

## Risks and Dependencies

- Supabase Dashboard and Google Cloud configuration remain external dependencies. The code can be correct while the flow still fails if redirect allow-lists drift.
- Social metadata shape may vary across providers or over time. The implementation should treat Google-derived names as optional candidate values, not guaranteed fields.
- Callback redirects are a security-sensitive boundary. Relaxed handling of `next` would create an open-redirect risk.
- The current repo uses `supabase.auth.getUser()` in `src/proxy.ts`, while newer Supabase SSR docs emphasize claim validation patterns. This plan intentionally avoids widening into a proxy rewrite, but implementation should verify that the current session refresh behavior is still sufficient for this slice.

---

## Documentation / Operational Notes

- Supabase must allow-list the app callback URLs, such as `http://localhost:3000/auth/callback` and the deployed `https://<host>/auth/callback`, in addition to the hosted Supabase callback configured in Google Cloud.
- `NEXT_PUBLIC_APP_URL` should remain the canonical deployed-origin input for browser-side redirect construction when the app is not running on localhost.
- Manual verification should include one full localhost Google sign-in and one full deployed-host Google sign-in before considering the feature complete.

---

## Sources and Research

- Existing implementation patterns: `src/context/AuthContext.tsx`, `src/components/AuthScreen.tsx`, `src/hooks/useUserProfile.ts`, `src/app/api/profile/route.ts`, `src/app/api/_lib/auth.ts`, `src/lib/supabase/server.ts`, `src/proxy.ts`
- Existing test surface: `src/context/AuthContext.test.ts`, `src/components/AuthScreen.test.tsx`, `src/hooks/useUserProfile.test.tsx`, `src/app/api/profile/route.test.ts`
- Prior plan for adjacent auth decisions: `docs/plans/2026-06-13-001-fix-auth-signup-hardening-plan.md`
- Supabase docs: `https://supabase.com/docs/guides/auth/social-login/auth-google`, `https://supabase.com/docs/guides/auth/server-side/nextjs`
- Next.js route handler reference: `https://nextjs.org/docs/app/api-reference/file-conventions/route`
