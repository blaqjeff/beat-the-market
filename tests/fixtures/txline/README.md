# TxLINE contract fixtures

This directory holds sanitized payloads captured from the activated TxLINE API.
They are used for contract tests and deterministic historical replay.

Capture commands:

```bash
npm run txline:capture -- fixtures 72
npm run txline:capture -- odds <fixtureId>
npm run txline:capture -- scores <fixtureId>
npm run txline:capture -- historical <fixtureId>
npm run txline:probe-streams -- odds 12
npm run txline:probe-streams -- scores 12
npm run txline:probe-validation -- <fixtureId> <seq>
```

Before committing a payload:

1. Confirm it contains no JWT, API token, wallet signature, secret, or personal
   information.
2. Preserve source field names and values needed by parsing tests.
3. Do not edit a payload to make an unsupported market appear available.
4. Record the network and capture date in `docs/TXLINE.md`.
