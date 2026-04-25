# Implementation Plan: Notification Transports

## Phase 1 — Transport Interface & Webhook

- [x] Task: Define `NotificationTransport` interface in `server/src/services/notifications/transport.ts` with `send(config: Notification, event: NotificationEvent): Promise<void>`
- [x] Task: Define `NotificationEvent` type: `type`, `title`, `message`, `data?`
- [x] Task: Implement `WebhookTransport` — POST to `config.fields.webhookUrl` with JSON body; set `Content-Type: application/json`; handle non-2xx as failure
- [x] Task: Write tests for `WebhookTransport` — happy path (200 response), error path (500 response), timeout path
- [x] Task: Measure - Checkpoint Phase 1

## Phase 2 — Discord & Telegram Transports

- [x] Task: Implement `DiscordTransport` — POST embed to `config.fields.webhookUrl` via Discord webhook API; format embed with title, description, color (green=download, blue=grab, red=error), fields for media metadata
- [x] Task: Write tests for `DiscordTransport` — embed structure, color mapping, error handling
- [x] Task: Implement `TelegramTransport` — Bot API `sendMessage` to `https://api.telegram.org/bot<token>/sendMessage` with `chat_id` and formatted markdown text
- [x] Task: Write tests for `TelegramTransport` — message formatting, error handling, missing token
- [x] Task: Measure - Checkpoint Phase 2

## Phase 3 — Gotify & Email Transports

- [x] Task: Implement `GotifyTransport` — POST to `config.fields.serverUrl/message` with Basic auth (`config.fields.appToken`), title, message, priority
- [x] Task: Write tests for `GotifyTransport` — payload structure, auth header, error handling
- [x] Task: Implement `EmailTransport` — use nodemailer (install as dependency); create transporter from `config.fields.smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`; send to `config.fields.to` with subject=title, text=message
- [x] Task: Write tests for `EmailTransport` — transporter creation, send success, SMTP error handling
- [x] Task: Measure - Checkpoint Phase 3

## Phase 4 — Wire Dispatch & Integration

- [x] Task: Create `NotificationTransportRegistry` — maps type string to transport class; provides `getTransport(type): NotificationTransport`
- [x] Task: Modify `NotificationDispatchService.dispatch()` — after SSE emit, query all enabled Notifications from repository, group by type, call `transport.send(config, event)` for each; catch+log per-transport errors so one failure doesn't block others
- [x] Task: Write integration test — create mock notification configs, dispatch an event, verify each transport's `send()` is called with correct args
- [x] Task: Run `CI=true bun test` — executed on this repo and on scoped notification suites; Bun runner remains non-authoritative due Vitest-incompatible/hanging suites
- [x] Task: Measure - Checkpoint Phase 4
