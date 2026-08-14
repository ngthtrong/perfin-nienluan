# UI design screenshots

These files illustrate the current Expo web interface with synthetic demo data.
They were regenerated on 13 August 2026 with Chromium at a `390x844` CSS-pixel
viewport, device scale factor 2 and the light theme. They are not native-device
captures or manual-test results.

Chapter 3 uses five images:

- `01-dashboard.png`
- `02-chat-preview.png`
- `03-budget.png`
- `04-report.png`
- `05-goal-plan.png`

The capture runner also produces auxiliary UI-smoke artifacts for Chat home,
More, Transactions, Categories, Cashflow, Recurring, Goals, Export and Settings.
These remain supporting artifacts and are not all embedded in the report.

With the backend and Expo web server already running, regenerate the set from
`demo/frontend` with:

```bash
npm run ui:smoke -- --url http://127.0.0.1:8081 \
  --api-url http://127.0.0.1:3000 \
  --viewport 390x844 --theme light --clean-chat-history
```

The clean-history option isolates only the browser's Chat history response so
the preview is readable; transaction parsing still comes from the running
backend. Do not place raw media, credentials or PII in this directory.
