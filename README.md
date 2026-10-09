# Signal Proof

[Website](https://edwardforst.github.io/signal-proof-public/) · [Publisher on X](https://x.com/EdwardForst379)

Signals are disclosed after 168 hours. Verification checks SHA-256 commitments, Ed25519 signatures, RFC 3161 timestamps and hash-chain continuity.

## Download and verify

Open the website and select **Verify all records**, or download:

- [Records](https://edwardforst.github.io/signal-proof-public/data/records.json)
- [Commitments](https://edwardforst.github.io/signal-proof-public/data/commitments.json)
- [Checkpoint](https://edwardforst.github.io/signal-proof-public/data/manifest.json)
- [Public key](https://edwardforst.github.io/signal-proof-public/trust/public-key.txt)
- [TSA certificate](https://edwardforst.github.io/signal-proof-public/trust/freetsa-root.pem)

Individual JSON, TSQ and TSR files are available on the website.

## Tools

Use an HTTPS browser with WebCrypto Ed25519 support, or Node.js 22+:

```bash
npm ci
npm run verify
```

For separately downloaded files:

```bash
node scripts/verify.js downloaded-records.json trusted-public-key.txt trusted-root.pem
```

Supply consecutive records starting at sequence 1; compare the final sequence and hash with your saved checkpoint. Exit code 0 indicates successful checks.

## Code and maintenance

- [Verification](lib/): hashes, signatures, timestamps and chain checks.
- [Website](site/): record browsing and browser verification.
- [Scripts](scripts/): archive synchronization, local verification and site build.
- [Tests](test/): verification and privacy checks.

```bash
npm test
npm run build
```

GitHub Actions updates the archive hourly and publishes the website. Check failed runs in Actions and rerun after resolving the failure. Keep archive copies and key fingerprints.

## Fingerprints

Public key — SHA-256 of SPKI DER:

```text
1a3690d9ea861a1224125a3106b3c830594f8abd4cdfd92192ed09e772e2e55b
```

TSA root — SHA-256 of the PEM file:

```text
2151b61137ffa86bf664691ba67e7da0b19f98c758e3d228d5d8ebf27e044438
```
