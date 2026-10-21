# Security Policy

## Supported Versions

We actively maintain and provide security patches for the following versions of BATCH:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The BATCH maintainers take the security of this project and its users seriously.

If you discover a security vulnerability within BATCH:
1. **Do not create a public issue.**
2. Send an email to the core maintainer at [g.jonesbisono@gmail.com](mailto:g.jonesbisono@gmail.com) with the subject `[SECURITY] Vulnerability in BATCH`.
3. Include detailed steps to reproduce the vulnerability, including payload examples, screenshots, or proof-of-concept scripts.

### What to Expect
- **Response Time:** We aim to acknowledge receipt of security reports within 48 hours.
- **Triage & Fix:** Vulnerabilities will be triaged and addressed promptly in a private branch before a public release is tagged.
- **Credit:** We gladly credit reporters in our release notes and changelog once a patch is deployed.

## Security Practices in BATCH

BATCH implements several built-in security layers:
- **HTTP Security Headers:** Configured with [Helmet](https://helmetjs.github.io/) enforcing a strict Content Security Policy (CSP).
- **Rate Limiting:** Protects endpoints against brute-force and resource exhaustion (DoS) using `express-rate-limit`.
- **Payload Sanitization:** Input string sanitization and character length limits to prevent buffer abuse and prompt injection.
- **Least-Privilege Containers:** Multi-stage Docker containers run as an unprivileged `node` user.
