# Owner administration

The protected `/admin` route is the hosted and self-hosted account-administration
surface. Learn renders the interface, while the account API remains authoritative
for authorization, state transitions, trusted-domain policy, deletion, merge, and
audit records.

## Review registrations

1. Sign in with an approved account that has the `owner` role.
2. Open `/admin`. The account queue starts on `Pending`.
3. Search by name, verified email, role, state, or account identifier.
4. Choose **Approve**, **Reject**, or **Revoke**.
5. Review the transition in the in-page form and enter an audit reason.
6. For terminal revocation, enter the displayed confirmation value before
   submitting.

The account API validates every requested transition. Learn never infers owner
access from browser state and never includes tenant or immutable owner identifiers
in the public application.

## Manage existing access

Choose **All accounts** or another state in the account-state filter. Approved
accounts can be suspended or permanently revoked. Rejected or suspended accounts
can be restored to approved access. Revoked identities are terminal and cannot be
restored through the console.

## Trusted domains

Domain matching is exact and requires a verified primary-email claim. When the
deployment has not enabled automatic domain approval, owners may stage disabled
rules but cannot enable them. This launch lock remains in force until the
deployment validates its signed verified-email token contract.

Every domain creation, state change, and removal requires an audit reason. Disabled
rules can be removed without exposing deployment configuration to Learn.

## Evidence and recovery

The same route shows eligible deletion requests, owner-assisted account-merge
controls, and request-correlated privileged audit events. Sensitive completion
actions may require a recent sign-in. Deployment identifiers, owner bindings,
secrets, rollback records, and production evidence belong only in the private
operations repository.
