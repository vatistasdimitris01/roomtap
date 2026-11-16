# Room Tap

A white, editorial-styled React app on Vercel that logs when you enter and leave a
room. An NFC tag + iOS Shortcut hits one endpoint; the server reads the clock and
decides whether that tap is an **entry** or a **leave**.

Live: https://room-tap-zeta.vercel.app

## How a tap is read

**Smart** is the default rule, and it allows as many entries and leaves per day
as you like:

1. **Flip the last tap.** If the last event was an **entry**, this tap is a
   **leave**; if the last was a **leave** (or there is nothing yet), this tap is
   an **entry**.
2. **Double-tap guard.** A tap arriving within *N* minutes of the previous one
   (default 1) is treated as accidental — nothing is recorded, and the response
   says `type: "ignored"`.
3. **The clock is the safety net.** When *Timing* is on and the log already says
   what the flip would produce (a hand-edited state), the entry/leave windows
   decide instead.

Turn the *Timing* switch on in **Setup** to give the windows a larger role with
the other rules (`hybrid`, `time-window`).

Other rules are selectable in **Setup**:

- `smart` — flip the last tap, many visits a day (default)
- `hybrid` — time window first, then flips
- `time-window` — the window alone decides
- `toggle` — every tap flips inside/outside

With timing off, every rule behaves as a pure flip: first tap opens, next closes,
and so on.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/state` | Current settings |
| `POST` | `/api/settings` | Update settings (JSON body) |
| `GET` | `/api/events` | Full event history |
| `POST` | `/api/events` | Add a manual event (`type`, `at`, `note`) |
| `PATCH` | `/api/events` | Edit an event (`id` + any of `type`, `at`, `note`) |
| `DELETE` | `/api/events?id=…` | Delete an event |
| `GET` | `/api/tap?token=YOUR_TOKEN` | Record a tap (entry/leave auto-detected) |

A tap responds with JSON such as:

```json
{ "ok": true, "type": "enter", "at": "2026-11-16T09:02:11.000Z", "message": "Welcome back", "song": "" }
```

## iOS Shortcut

1. Create a Shortcut and attach it to your NFC tag (Automation → NFC).
2. Add **Get Contents of URL** with the URL:
   `https://room-tap-zeta.vercel.app/api/tap?token=roomtap`
   Method: `GET`. No headers or body needed.
3. (Optional) Read `type` and `song` from the JSON response — play `song` with
   **Play Music**, or show a notification with `message`.

Change the token in **Setup** if you want to invalidate the old URL.

## Pages

- `/` — **Today**: live status, time inside today, the day rail (entry/leave
  windows vs. now), and a monthly chart of your average time in the room.
- `/analysis` — **Log**: totals, a weekday pie of time inside, a 14-day bar
  chart, and the full tap history where you can edit, delete, or add events.
- `/settings` — **Setup**: timing on/off, entry/leave windows, songs, detection
  rule, minimum stay, the endpoint token, and the copyable Shortcut URL.

## Storage

State lives in a private Vercel Blob store (`room-tap/data.json`). Writes go
through `api/_lib/store.js`; reads use `useCache: false` so the UI is never stale.

## Local dev

```bash
npm install
vercel env pull .env.local   # pulls BLOB_READ_WRITE_TOKEN
vercel dev                   # serves /api/* and the Vite app together
```

`npm run preview` serves the built front-end only — `/api/*` will not respond
there, so use `vercel dev` (or the production deployment) for full testing.

## Deploy

```bash
vercel --prod --yes
```
