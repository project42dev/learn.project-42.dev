# Virtual instructor player

Project 42's virtual instructor teaches a class through narration, an optional
avatar, captions, and a text-only fallback. This page documents the training
package the player consumes, the boundary the player runs inside, and the
rule that governs the whole design: the player never calls a model at
runtime.

## Runtime prohibition

The virtual instructor player must never call an inference endpoint, a model
deployment, or any AI service while a learner is using it. No model
endpoint, deployment name, or API key reaches the browser, at any time, for
any reason. Everything the player shows, narration audio, avatar video,
captions, and transcript, was generated and approved before the package was
published. The player's job is playback of a finished, already-approved
artifact, not generation.

This is a hard boundary, not a preference:

- **Publish-time human gate.** A class script and its media pass required
  review roles (editorial, subject-matter accuracy, accessibility, and, for
  media, pronunciation and release approval) before a package is allowed to
  exist. A runtime model call would put unreviewed content in front of a
  learner.
- **Fixed cost and availability.** A pre-generated package has a known cost
  and plays back the same way whether every model provider behind it is
  available, degraded, or retired. A learner-facing dependency on live
  inference ties the experience's uptime and cost to a call that has to
  succeed at the exact moment a learner opens the page.
- **Provider neutrality.** A package records only versioned adapter and
  role-profile references, never a private deployment name, tenant, or
  credential. Replacing the model, voice, or avatar behind a package never
  touches the player or any package already published.
- **No learner input ever reaches a model.** A player that could call an
  inference endpoint at learn time could be prompted, directly or
  indirectly, by whatever a learner typed into an answer box or activity.
  Removing the runtime call removes that risk entirely: there is no live
  prompt for a learner to influence.

## What a training package is

A training package is an immutable, versioned bundle produced by Project
42's content pipeline, not by this repository and not by the player. It is
identified by a package ID, a semantic version, and a content digest. How
the pipeline produces it is out of scope here; what matters to this
repository is the contract the player reads.

A package couples two machine-checked documents:

- **A class-script package** (`class-script-package.schema.json`,
  `schemaVersion` fixed at `2.0`) is the complete read-aloud script: welcome,
  narration, demonstrations, learner prompts, pauses, checkpoints,
  correct/retry feedback, assessment handoff, and closing, each mapped to a
  source and, where relevant, an accessible visual description. It also
  records who wrote it, who independently verified it, and which humans
  approved it for release.
- **A virtual-instructor media manifest**
  (`virtual-instructor-media-manifest.schema.json`, `schemaVersion` fixed at
  `1.0`) is the optional narrated or avatar layer. It points at the exact
  class-script digest it was produced from, names a versioned adapter and
  model/voice/avatar profile reference (never a deployment name or
  credential), and lists every artifact, audio, video, captions, transcript,
  poster, text-only, and reduced-motion, each with a relative path, a media
  type, and a SHA-256 digest.

Both schemas are published in
[`project42-platform`](https://github.com/project42dev/project42-platform)
under `schemas/training/`, with TypeScript validators in
`src/training-package.ts`. The player must reject any document whose
`schemaVersion` does not match the version it was built against; both
versions are fixed constants in the schema, not open-ended fields.

A package's `releaseStatus` is `draft` or `approved`. The player must treat
only `approved` packages as playable. An approved class script requires
recorded editorial, subject-matter, and accessibility approval; an approved
media manifest additionally requires editorial, factual, accessibility, and
media-release approval. Every one of those approvals happened before
publication, which is what makes the runtime prohibition possible: there is
nothing left for the player to decide.

Text and transcript are the canonical, always-available delivery mode. Audio
is the first optional enhancement, and avatar video is optional on top of
that; a class script can be complete and usable with neither.

## What the player must accept

The player loads a class-script document and, when one has been produced,
its media manifest, plus the artifacts the manifest lists:

```text
<module>/
├── class-script.json
├── <media-manifest>.json
├── captions/
│   └── <locale>.vtt
├── transcripts/
│   └── <locale>.md
├── assets/
│   └── <locale>/
│       └── instructor.<ext>
└── alternatives/
    ├── <locale>-text-only.<ext>
    └── <locale>-reduced-motion.<ext>
```

The schemas validate document content, not file names or the media manifest's
own filename; a released package's exact manifest filename is not yet fixed.

Every artifact path in the manifest is a safe relative path (no leading
slash, no `..`, no backslash) and carries its own SHA-256 digest; the player
should verify a downloaded artifact against its declared digest before
playback rather than trusting the path alone. A media manifest that declares
an `audio` artifact must also declare `captions`, `transcript`, `text-only`,
and `reduced-motion` artifacts; one that declares `video` must also declare
a `poster`. The player should treat a manifest missing any of those as
invalid rather than degrading silently.

[WebVTT](https://www.w3.org/TR/webvtt1/) is the required timed-caption
format because it is designed for external text tracks, captions, chapters,
and time-aligned metadata.

## The iframe and CSP boundary

The player runs inside an isolated-origin iframe with the smallest sandbox
and Permissions Policy the experience needs, not the sandbox a package asks
for. When a package requires scripts, it should be served from a separate
origin from the host application; avoid combining `allow-scripts` and
`allow-same-origin` against same-origin untrusted content, since that
combination lets a compromised or malformed package escape its sandbox.

[Content Security Policy](https://www.w3.org/TR/CSP3/) is defense in depth,
not a substitute for validating the package itself. The host still validates
every message a package sends, per the contract below, regardless of what
the CSP allows.

## postMessage contract

The host and the package exchange validated, versioned `postMessage`
envelopes. Every envelope carries a protocol version, a session nonce, the
package ID and version, a message ID, and a timestamp; the host validates
origin, source window, nonce, schema, and event type before accepting one.

| Event | Required data |
| --- | --- |
| `project42.ready` | Package ID/version and supported protocol version |
| `project42.progress` | Stable activity ID and percentage or position |
| `project42.checkpoint` | Stable checkpoint ID and completion evidence |
| `project42.complete` | Completion ID, evidence IDs, and package digest |
| `project42.error` | Stable error code and recoverability |

A package message becomes a normal, idempotent learning command; the
package cannot write a learner record directly, and the host is free to drop
or retry a message without the package knowing.

## Accessibility gate

Every package the player loads must provide:

- full keyboard operation with visible focus;
- captions and a readable transcript for any spoken or audio content;
- pause, replay, seek, and volume controls wherever media is used;
- a meaningful non-motion or reduced-motion mode;
- no required time limit without an extension or disable mechanism;
- no flashing that violates seizure thresholds;
- text alternatives for instructional visuals;
- programmatic names, roles, states, and error messages; and
- an equivalent route when an interaction cannot be made accessible.

Completion may never depend on autoplay, a pointer-only gesture, an
audio-only cue, or animation timing. Avatar video is always optional; a
learner who never enables it must still be able to complete the class.

## Current status

The player described on this page is not built. `project42-platform`
publishes the two schemas above, their TypeScript validators, and a fixture
and coverage generator (`examples/training/`, `npm run training:generate`,
`npm run training:check` in that repository). There is no code in this
repository, `project42-platform`, or anywhere else in the Project 42 estate
that renders a package, plays narration or avatar video back to a learner,
or produces virtual-instructor media. The one representative example package
under `examples/training/` uses placeholder artifact digests and a `draft`
media manifest for exactly this reason: it proves the contract exists, not
that any voice, avatar, or media generation has happened. The iframe/CSP
boundary and the postMessage contract above describe the required design
for a future player; neither is implemented yet.
