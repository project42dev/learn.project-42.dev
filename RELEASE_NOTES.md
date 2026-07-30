# Project 42 Learn 0.12.1

This release packages the Learn application, compatibility contract, OCI image
metadata, checksums, and provenance under one verifiable manifest.

It aligns the hosted Learn client and self-host compatibility contract with
signed Platform v0.70.0, including the released secure-session, owner-pagination,
and secure Compose fixes.

The patch version reserves a fresh immutable release tag after a retired
historical local tag collision was detected before release publication. It does
not change application behavior or data.

## Breaking changes

None. Existing lessons, learner routes, and deployment interfaces are preserved.

## Migrations

No application-data migration is introduced by this release. Administrators
must still follow the platform compatibility manifest for hosted-service
migrations.

## Known limitations

The static archive cannot provide hosted identity or cross-device progress on
its own; those capabilities require a compatible Project 42 account service.

## Rollback

Redeploy the preceding signed archive or immutable OCI digest and restore the
matching compatibility configuration. Learner data is not mutated by the
release workflow.
