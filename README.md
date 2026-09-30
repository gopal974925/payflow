# PayFlow

A wallet and payments backend (PhonePe/Paytm style) built as microservices in a monorepo.

> **Simulation only.** PayFlow uses a mock bank gateway. It never handles real money or real card
> data. Real payments require licensed gateways and PCI-DSS compliance.

## Stack

Node.js, TypeScript, PostgreSQL (one database per service), Redis, RabbitMQ, Docker, GitHub Actions.

## Services

| Service                      | Responsibility                                        |
| ---------------------------- | ----------------------------------------------------- |
| api-gateway                  | Entry point, JWT verification, rate limiting, routing |
| auth-service                 | Users, credentials, PIN, tokens                       |
| wallet-ledger-service        | Wallets, double-entry ledger, atomic transfers        |
| payment-orchestrator         | Top-ups, merchant payments, refunds, sagas, mock bank |
| merchant-service             | Merchants, API keys, payment requests, settlements    |
| notification-webhook-service | Notifications and merchant webhook delivery           |

## Getting started

```bash
npm install
npm run lint && npm run typecheck && npm test
```

## Status

Work in progress. See `docs/` for architecture and decisions.
