# Handoff

## Active branch

`feat/profile-consent-controls-ab5419`

## Implemented

- Preserved the existing hosted display-name, biography, organization, location,
  website, and private profile-photo controls.
- Added browser-fallback locale, time-zone, reduced-motion, and increased-contrast
  preferences with validation and application across Learn.
- Kept operating-system reduced-motion, contrast, and forced-color preferences
  authoritative.
- Corrected new consent writes to the canonical `learning-record` purpose while
  retaining legacy evidence under its original purpose.
- Added reviewable consent history with purpose, policy version, decision, and
  timestamp.
- Added deletion request receipts and status history, including cancellation and
  completed states returned by the current API.
- Replaced raw profile, consent, export, photo, and deletion API error details with
  privacy-safe learner messages.
- Added deterministic browser and accessibility coverage for profile/photo edits,
  preference persistence, consent history, recent-authentication export handling,
  deletion request/cancellation, and failure redaction.

## Verification

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- Production build with hosted API configuration — passed.
- Focused profile-control Playwright and axe suite — 3 passed.
- Combined account/profile Playwright regression — 14 passed.

## Remaining integration

- The currently consumed account API does not yet persist locale, time zone,
  reduced motion, or high contrast in the hosted learner profile. The new provider
  isolates validation, fallback storage, preference application, and formatting so
  those controls can be connected to the expanded profile contract after its
  reviewed platform release.
- A completed deletion can be displayed when returned by the current history API.
  The learner cannot independently prove post-deletion status after account access
  is removed; that requires a durable receipt/status retrieval contract.
- Cross-learner authorization proof remains a platform/API test responsibility.

No production tenant, client, learner, or resource identifiers belong in this
repository.
