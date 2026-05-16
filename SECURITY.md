# Security

## Reporting issues

If you find a security vulnerability in this project, please open a **private** report to the repository owner (or follow the contact method they specify) rather than filing a public issue.

## Secrets and credentials

- Do **not** commit `.env`, `.env.local`, API keys, database URLs with passwords, or JWT secrets.
- Rotate any credentials that were ever committed or shared.
- The demo defaults in `.env.example` files are for **local development only**.

## Production hardening

Before any production deployment you should at least:

- Use strong, unique `JWT_SECRET` and database credentials.
- Run the API behind TLS, rate limiting, and appropriate CORS policy.
- Review Fastify and Prisma versions for known CVEs and upgrade on a schedule.

This sample app is optimized for **local demo and portfolio review**, not as a drop-in production deployment without further hardening.
