# Estimation App

A real-time Planning Poker / Story Point estimation app for agile teams.

## Features

- Real-time voting with Firebase Realtime Database
- Fibonacci, T-shirt, modified, story points, timebox, and powers-of-2 scales
- Jira integration — link tickets, update story points, and post audit comments
- Facilitator controls: reveal votes, re-estimate, transfer host, kick participants
- Auto-reveal when all participants have voted
- Poll / quick-vote feature
- Estimation history log

## Setup

### Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Realtime Database**
3. Enable **Authentication → Sign-in method → Anonymous**
4. Update the Firebase config in `index.html` (search for `firebaseConfig`)

For a quick production rollout, use authenticated rules instead of test mode. A minimal starter is:

```json
{
   "rules": {
      ".read": "auth != null",
      ".write": "auth != null"
   }
}
```

If you want stricter session-only access later, we can tighten the rules after the app is live.

### GitHub Pages

The repo already includes a GitHub Actions workflow that deploys on pushes to `main`.

1. Open your repository settings in GitHub.
2. Add the Firebase values as repository secrets:
    - `FIREBASE_API_KEY`
    - `FIREBASE_AUTH_DOMAIN`
    - `FIREBASE_DATABASE_URL`
    - `FIREBASE_PROJECT_ID`
    - `FIREBASE_STORAGE_BUCKET`
    - `FIREBASE_MESSAGING_SENDER_ID`
    - `FIREBASE_APP_ID`
    - `FIREBASE_MEASUREMENT_ID`
3. Push your changes to `main`.
4. Open the Actions tab and confirm the Pages deployment succeeds.
5. In Firebase Realtime Database, replace test-mode rules with authenticated rules before calling it production.

Recommended production starter rules:

```json
{
   "rules": {
      ".read": "auth != null",
      ".write": "auth != null"
   }
}
```

### Jira Proxy (Cloudflare Worker)

Jira's API requires server-side auth to avoid CORS issues. The included `jira-proxy.js` is a Cloudflare Worker that proxies requests with stored credentials.

1. Go to [Cloudflare Workers](https://dash.cloudflare.com) → Workers & Pages → Create
2. Paste the contents of `jira-proxy.js`
3. Add two **Secret variables** under Settings → Variables:
   - `JIRA_EMAIL` — your Atlassian account email
   - `JIRA_TOKEN` — an API token from [Atlassian account settings](https://id.atlassian.com/manage-profile/security/api-tokens)
4. Deploy and copy the Worker URL
5. Paste the Worker URL into the Jira panel inside the app

## Deployment

The app is a single `index.html` file — deploy it anywhere static files are served (GitHub Pages, Netlify, Cloudflare Pages, etc.).
