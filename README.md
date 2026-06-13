# nataCONNECT

nataCONNECT is a local-first financial decision prototype that explains suspicious payments before money moves and shows how each decision affects protected savings goals.

**Live site:** https://chrispitsillides.github.io/nata_CONNECT/

## The 60-second demo

1. Open Decision Shield and load the fake-bank scenario.
2. Analyze the proposed EUR 480 payment.
3. Inspect the transparent score: urgency, irreversible payment language, domain structure, card rules, spending limits, and goal conflicts.
4. Block the payment and see the simulated balance and protected goals remain intact.
5. Ask NataGuide to explain the decision using the same locally saved evidence.

## What works

- Deterministic, tested payment-risk engine with evidence and decision thresholds.
- Message, website, seller, amount, category, balance, local report, and rule analysis.
- User-configurable spending, category, seller-verification, and time rules.
- Goal-delay and additional-monthly-contribution estimates for each payment.
- Persistent simulated balances, transactions, limits, goals, reports, practice trades, preferences, and chat history.
- Context-aware NataGuide using an optional open-source browser model with an instant offline fallback.
- Local JSON export and reset.
- GitHub Pages deployment with no account, API key, or paid service.

## Honest prototype boundaries

This project does not connect to a bank, card network, broker, payment processor, identity provider, or official fraud-reporting authority. Seller reports are local prototype records. Balances, transactions, market prices, and trades are simulations. Risk results are educational signals, not guarantees or professional financial advice.

## Decision engine

The engine is intentionally explainable. It assigns points for evidence such as:

- seller reports and suspicious domain structure
- urgency and account-lock pressure
- irreversible payment, authentication-code, or remote-access requests
- card balance concentration and insufficient funds
- category limits and user-defined card rules
- conflict with Shield-protected goals

The score maps to `approve`, `review`, or `block`. Tests cover ordinary purchases, phishing pressure, reported sellers, category/rule limits, goal impact, and validation.

## Development

```bash
npm install
npm test
npm run dev
```

Create a production build with `npm run build`.

## License and attribution

nataCONNECT is jointly developed by lordofpastitsio and CHRISPITSILLIDES and is licensed under the MIT License. See `LICENSE` for the full terms.
