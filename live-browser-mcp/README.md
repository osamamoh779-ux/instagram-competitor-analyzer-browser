# Live Browser MCP (independent runtime)

This subproject leaves the existing Instagram source and plugin untouched. It uses a separate persistent Chromium profile under `runtime/` and MCP port **3100**. Private OAuth approval uses **3101**; the existing private Codespaces desktop/noVNC uses **6080**. All runtime state, OAuth tokens, cookies and profiles are ignored by Git.

## Codespaces

Use the repository's existing desktop-lite devcontainer. From this directory:

```sh
npm ci
npx playwright install --with-deps chromium
DISPLAY=:1 npm start
```

Forward 3100, 3101, 6080. Only 3100 may be public. Keep 3101 and 6080 private behind GitHub authentication. Never expose VNC 5901, CDP, profile files, or the private approval service. `/health` reports readiness. `/mcp` requires OAuth Authorization Code + S256 PKCE. Registration supports ChatGPT redirect hosts only. Authorizing the browser is an explicit consent action on GitHub's private forwarded port. No account credentials are placed in Git or plugin configuration.

Browser stays alive across MCP requests and persists across restarts while the Codespace disk exists. Requests are serialized, timeouts are finite, errors return MCP `isError`. Fifteen tabs maximum. Reads and actions stop on observed login/OTP/CAPTCHA/security pages; use noVNC manually. Session save returns a boolean and never returns cookies. No private Instagram Insights support. Downloads and service workers are disabled. Public HTTP(S) URL validation runs for navigation, redirects, subresources and WebSockets; local/reserved/metadata and runtime management hosts are rejected. `ALLOWED_HOSTS` optionally restricts hosts further. DNS validation is application-layer defense; it is not a network firewall or a complete DNS-rebinding guarantee.

Codespaces is the runtime, not permanent hosting: idle stop, quota, account billing, and deletion affect availability. Stopping the Codespace suspends the MCP URL. No Replit, Vercel runtime, Meta API, stealth, CAPTCHA solving, or anti-bot evasion.

## Verification

`npm test` tests private-network rejection. `test/smoke.js` runs real HTTP MCP requests and real browser actions; local-only OAuth redirect support must be temporarily enabled with `ALLOW_LOCAL_OAUTH_TEST=true` in the runtime environment. Disable it after smoke testing. Tokens are never logged.
