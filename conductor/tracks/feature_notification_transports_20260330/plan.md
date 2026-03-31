# Implementation Plan: Notification Transports

## Phase 1 — Transport Interface & Webhook

- [ ] Task: Define `NotificationTransport` interface in `server/src/services/notifications/transport.ts` with `send(config: Notification, event: NotificationEvent): Promise<void>`
- [ ] Task: Define `NotificationEvent` type: `type`, `title`, `message`, `data?`
- [ ] Task: Implement `WebhookTransport` — POST to `config.fields.webhookUrl` with JSON body; set `Content-Type: application/json`; handle non-2xx as failure
- [ ] Task: Write tests for `WebhookTransport` — happy path (200 response), error path (500 response), timeout path
- [ ] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Discord & Telegram Transports

- [ ] Task: Implement `DiscordTransport` — POST embed to `config.fields.webhookUrl` via Discord webhook API; format embed with title, description, color (green=download, blue=grab, red=error), fields for media metadata
- [ ] Task: Write tests for `DiscordTransport` — embed structure, color mapping, error handling
- [ ] Task: Implement `TelegramTransport` — Bot API `sendMessage` to `https://api.telegram.org/bot<token>/sendMessage` with `chat_id` and formatted markdown text
- [ ] Task: Write tests for `TelegramTransport` — message formatting, error handling, missing token
- [ ] Task: Conductor - Checkpoint Phase 2

## Phase 3 — Gotify & Email Transports

- [ ] Task: Implement `GotifyTransport` — POST to `config.fields.serverUrl/message` with Basic auth (`config.fields.appToken`), title, message, priority
- [ ] Task: Write tests for `GotifyTransport` — payload structure, auth header, error handling
- [ ] Task: Implement `EmailTransport` — use nodemailer (install as dependency); create transporter from `config.fields.smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`; send to `config.fields.to` with subject=title, text=message
- [ ] Task: Write tests for `EmailTransport` — transporter creation, send success, SMTP error handling
- [ ] Task: Conductor - Checkpoint Phase 3

## Phase 4 — Wire Dispatch & Integration

- [ ] Task: Create `NotificationTransportRegistry` — maps type string to transport class; provides `getTransport(type): NotificationTransport`
- [ ] Task: Modify `NotificationDispatchService.dispatch()` — after SSE emit, query all enabled Notifications from repository, group by type, call `transport.send(config, event)` for each; catch+log per-transport errors so one failure doesn't block others
- [ ] Task: Write integration test — create mock notification configs, dispatch an event, verify each transport's `send()` is called with correct args
- [ ] Task: Run `CI=true bun test` — all tests pass
- [ ] Task: Conductor - Checkpoint Phase 4
