# YouTube OAuth integration

The integration uses Google OAuth 2.0 on the server. Access and refresh tokens are encrypted with AES-256-GCM and held only in an `HttpOnly`, `Secure` (production), `SameSite=Lax` browser cookie. They are never returned by the API or written to logs.

## Setup

1. In Google Cloud Console, create an **OAuth client ID** of type **Web application** and enable **YouTube Data API v3** for the same project.
2. Add the exact callback URL below to its Authorized redirect URIs. For local development it is `http://localhost:3000/api/youtube/auth/callback`.
3. Copy the four values into `.env.local` (do not commit it). Generate the cookie secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
4. Restart the development server, then open `GET /api/youtube/auth/start` while signed in to JARVIS. Grant the read-only YouTube permission.

The available API endpoints are:

- `GET /api/youtube/status` — configuration and connection state only; never tokens.
- `GET /api/youtube/auth/start` — begins the Google consent redirect.
- `GET /api/youtube/playlists` — returns the connected account's playlists. Use optional `?pageToken=` to paginate.

Only the `youtube.readonly` scope is requested. It allows JARVIS to list and read your playlists; it does not upload, delete, or modify YouTube content. YouTube embedded playback remains governed by YouTube's own playback and account policies.
