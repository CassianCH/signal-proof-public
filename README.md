# Signal Proof

Published by **[@EdwardForst379 on X](https://x.com/EdwardForst379)**.

A public archive of delayed signal receipts. The server signs each accepted signal and requests an independent RFC 3161 timestamp immediately. Receipts become public **168 hours after server receipt**. Private strategy code, strategy names, reasoning, original event identifiers, signing keys and ingestion tokens are not published.

## Attribution and protection against impersonation

Confirm this site's URL and the public-key fingerprint below through the publisher's X profile or another independently trusted channel. A copied website, README or profile link does not establish ownership. This repository does not prove control of the linked X account.

The publisher should post the canonical site URL and fingerprint from that X account. Anyone verifying a copy should compare both with that independently obtained statement. No post has been made automatically on the publisher's behalf.

## Browse and download

The Pages site provides a signal list, local browser verification, the complete JSON archive, individual JSON / TSQ / TSR downloads, the public key, the TSA root certificate and this README.

- `data/records.json`: consecutive archived receipts starting at sequence 1.
- `data/manifest.json`: the archived sequence, chain hash and last successful sync-check date in UTC.
- Site paths `data/records/1.json`, `1.tsq`, `1.tsr`: the first receipt, RFC 3161 request and response. Binary files are generated from JSON during the Pages build.
- `trust/public-key.txt`: the Ed25519 public key as Base64-encoded SPKI DER.
- `trust/freetsa-root.pem`: the pinned FreeTSA root certificate.

An empty archive does not mean there are no unreleased signals. Verifying an empty archive checks trust anchors only, not any signal or timestamp.

## Trust fingerprints

Public-key **SPKI DER SHA-256**:

```text
1a3690d9ea861a1224125a3106b3c830594f8abd4cdfd92192ed09e772e2e55b
```

FreeTSA root certificate **file SHA-256**, including its original newline:

```text
2151b61137ffa86bf664691ba67e7da0b19f98c758e3d228d5d8ebf27e044438
```

Obtain the publisher's key fingerprint independently before trusting it. Downloading data, configuration and keys from one site cannot establish identity. Certificate source: [FreeTSA official site](https://freetsa.org/index_en.php). This root is an explicit trust anchor, not a claim of automatic operating-system or legal recognition.

## Browser verification

Click **Verify all records**. The browser checks pinned trust fingerprints, field allowlists, consecutive sequence numbers, previous hashes, signal hashes, Ed25519 signatures, RFC 3161 message imprints and nonces, CMS signatures, certificate chains, certificate validity at issuance, critical/exclusive timestamping EKU, TSA metadata, the 168-hour release policy and the archive checkpoint. No files are uploaded.

Use HTTPS and a browser supporting WebCrypto Ed25519. Browser results still depend on this site's verification code. For independent review, download the source and receipts and use a previously trusted key.

## Independent local verification

Install Node.js 22 or newer, download or clone this repository, then run from its root:

```bash
npm ci
npm run verify
```

Exit code 0 means the local archive and manifest passed verification. Any failed check stops with a nonzero exit code. To use independently saved files:

```bash
node scripts/verify.js downloaded-records.json trusted-public-key.txt trusted-root.pem
```

The input must be a consecutive receipt array starting at sequence 1. To verify a single later receipt, include preceding receipts or implement verification against an independently trusted checkpoint. Custom arrays are not automatically compared with the repository manifest; independently check the expected final checkpoint. Dependency installation requires network access; verification of downloaded receipts does not contact the source server or TSA.

## Protocol

Canonical JSON recursively sorts object keys, preserves array order, uses JSON value encoding and includes no extra whitespace.

```text
payload_hash = SHA256(canonical(signal))
chain_hash   = SHA256(canonical(record))
signature    = Ed25519.sign(bytes(chain_hash))
```

The signed `record` contains generic stream and deployment identifiers, sequence, server receipt time, payload hash, previous hash and key identifier. The first previous hash is 64 zeros. The TSA message imprint equals `chain_hash`. `release_at` is derived as the receipt time plus 604800000 milliseconds; it is not a new signed field.

Public identifiers are generic: `signal`, `signal-production`, `signal-production-v1` and `key-v1`. Instrument, direction, target exposure and time are retained to inspect the signals, not private reasoning.

## Synchronization and Pages deployment

Set the repository Actions Secret `SOURCE_WORKER_URL` to the existing HTTPS Worker base URL, without `/ingest`. This is a source address, not a signing key or ingestion token. The sync script reads unauthenticated public `/head` and `/records/<seq>` only; it never calls ingestion or owner endpoints.

In Settings > Pages, select **GitHub Actions**. The workflow runs at minute 17 of each UTC hour and supports manual runs. It verifies existing records before fetching up to 100 new records. Pending TSA verification blocks the prefix until a later run; records are never silently skipped. Rewritten records, a regressing head, early release, unexpected fields, bad signatures or invalid timestamps fail the sync and preserve the previous archive.

If source synchronization fails, Pages may still rebuild the previously verified archive. The overall workflow remains failed and the successful-check date does not advance; this is not a successful sync.

The check date generates one daily commit. Scheduled jobs can be delayed or suspended, so Pages may update after the exact seven-day boundary, but never before it. See [GitHub scheduling documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows). The site build uses an explicit file allowlist and does not copy the private deployment workspace. Key or protocol changes require preservation of historical trust anchors and transition checkpoints.

## Limits of the proof

- It verifies signed content and its existence by an independent TSA time. The signal's own claimed time is not the TSA time.
- It verifies internal continuity of the downloaded records, not the absence of source filtering, missed signals or a hidden suffix.
- It does not prove private-strategy execution, order fills, profitability or strategy quality.
- OCSP / CRL revocation checks are not performed; results explicitly report `revocation_status: not_checked`. This is not complete long-term validation.
- GitHub commits are not TSA timestamps. Administrators can modify or delete repositories; readers should retain copies and independent checkpoints.
- The seven-day embargo is enforced by server access restrictions, not content encryption. Previously downloaded data cannot be recalled.
