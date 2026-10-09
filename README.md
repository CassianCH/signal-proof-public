# Signal Proof

Public, independently verifiable signal records, disclosed after a seven-day delay.

**Website:** [cassianch.github.io/signal-proof-public](https://cassianch.github.io/signal-proof-public/)

**Publisher:** [@EdwardForst379 on X](https://x.com/EdwardForst379)

## What can be verified?

Each record has an Ed25519 signature, a hash linking it to the previous record, and an independent RFC 3161 timestamp. A commitment is published before disclosure; the disclosed signal must match that commitment. Signal content is released no earlier than 168 hours after receipt, and only after timestamp verification.

Verification checks content integrity, signatures, timestamps, chain continuity and the disclosure delay.

## Browse, download and verify

Open the [website](https://cassianch.github.io/signal-proof-public/) and click **Verify all records**. Verification runs in your browser; no files are uploaded. The site also provides individual JSON records and timestamp files.

- [Released records](https://cassianch.github.io/signal-proof-public/data/records.json)
- [Pre-disclosure commitments](https://cassianch.github.io/signal-proof-public/data/commitments.json)
- [Archive checkpoint](https://cassianch.github.io/signal-proof-public/data/manifest.json)
- [Public key](https://cassianch.github.io/signal-proof-public/trust/public-key.txt)
- [Timestamp trust certificate](https://cassianch.github.io/signal-proof-public/trust/freetsa-root.pem)

## Independent verification

With Node.js 22 or newer, clone or download this repository and run:

```bash
npm ci
npm run verify
```

Exit code 0 means the archived records, commitments and checkpoint passed the implemented checks. A failed check returns a nonzero exit code. To verify separately saved records with independently trusted keys:

```bash
node scripts/verify.js downloaded-records.json trusted-public-key.txt trusted-root.pem
```

The record array must start at sequence 1 and remain consecutive. When using custom files, compare the final sequence and hash with your saved checkpoint. Verification of downloaded records runs offline after dependencies are installed.

## Key fingerprints

Public-key fingerprint — SHA-256 of SPKI DER:

```text
1a3690d9ea861a1224125a3106b3c830594f8abd4cdfd92192ed09e772e2e55b
```

Timestamp root certificate fingerprint — SHA-256 of the downloaded PEM file:

```text
2151b61137ffa86bf664691ba67e7da0b19f98c758e3d228d5d8ebf27e044438
```
