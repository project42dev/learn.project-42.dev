# Transcript and credential authority

The profile labels the source and authority of every learner-facing record.

## Browser-local mode

Signed-out learners and accounts that are not approved can download a
**browser-local CSV transcript**. It is generated from the record stored in the
current browser. It is portable learning evidence, but it is not an
authoritative account transcript or an issued credential.

The browser-local JSON backup and restore controls remain local in every account
state. Their labels never imply cross-device durability.

## Approved account mode

An approved, authenticated account downloads its authoritative CSV from
`GET /v1/me/transcript.csv`. Learn sends the existing secure session cookie and
does not read, store, or send a bearer token.

The account API requires recent authentication, returns the CSV directly with no
public object URL, and records the export in the account audit trail. Learn
validates the successful response media type and supported schema header before
creating a private browser download. A failed request does not replace or erase
the browser-local record, and the same control can retry safely.

## Achievements and credentials

Learning achievements shown from the progress record are explicitly labeled as
not issued credentials. The profile exposes a separate **Durable issued
credentials** region. It remains empty until a server-side issuer creates a
credential from versioned evidence through the append-only credential lifecycle.

Synchronizing an achievement across devices does not turn it into a credential.
Project 42 does not claim Open Badges conformance for either surface.
