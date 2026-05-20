# Reporting a vulnerability

If you believe you have found a vulnerability in StemStudio, please report it privately so we can investigate before any public disclosure.

## How to report

Open a [private security advisory](https://github.com/your-org/stemstudio/security/advisories/new) with:

- A description of the issue and the impact you observed.
- Steps to reproduce, including any required configuration.
- The affected version (commit SHA or release tag).
- Any suggested fix or mitigation, if you have one.

Please do **not** open a public GitHub issue for vulnerabilities.

## What to expect

- Acknowledgement within 3 business days.
- A first-pass assessment within 10 business days.
- Coordinated disclosure: we aim to release a fix within 90 days of the initial report, and we will credit you in the release notes unless you ask us not to.

## Scope

In scope:

- The editor and player in `client/packages/editor-oss/`.
- The AI proxy server in `server/cmd/ai-server/`.
- The local multiplayer sidecar in the multiplayer submodule.

Out of scope:

- Issues in third-party dependencies — please report those upstream.
- Vulnerabilities that require a malicious local user with full filesystem access (this project is designed to run on a developer's machine).
- BYOK key handling on the user's own machine — keys are stored client-side by design; treat the machine running StemStudio as trusted.

## Supported versions

Only the most recent minor release is supported with fixes. We may backport fixes to the previous minor release at maintainer discretion.
