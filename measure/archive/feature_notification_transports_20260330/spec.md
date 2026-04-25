# Spec: Notification Transport Layer

## Context

The notification system has a complete data layer — `NotificationRepository` stores
configs with encrypted sensitive fields, and `NotificationDispatchService` publishes
events to the internal SSE hub. But no code exists to actually deliver notifications
to external services. When a download completes, the event is emitted via SSE to
connected browser clients and then vanishes. Users want push notifications on their
phone, Discord messages, Telegram alerts, and webhook integrations.

### What exists
- Prisma `Notification` model with 7 types: `discord`, `email`, `telegram`, `slack`, `gotify`, `pushover`, `webhook`
- `NotificationRepository` with CRUD and `SENSITIVE_FIELDS` encryption map
- `NotificationDispatchService` dispatching events: `notification:grab`, `notification:download`, `notification:seriesAdd`, `notification:episodeDelete`
- SSE event hub (`ApiEventHub`) for real-time browser push
- Settings UI in SPA for notification list view

### What is missing
- Zero external transport implementations
- No SMTP/nodemailer for email
- No HTTP POST for webhooks
- No Discord embed builder
- No Telegram Bot API integration
- No Gotify push client

## Requirements

### Transport Interface
1. Define `NotificationTransport` interface: `send(notification: Notification, event: NotificationEvent): Promise<void>`
2. Each transport type implements the interface.
3. `NotificationDispatchService` iterates enabled notifications and calls the matching transport after SSE dispatch.

### Transports (ordered priority)
1. **Webhook** — `POST` to configured URL with JSON body `{ event, title, message, data }`
2. **Discord** — POST to webhook URL with embed (title, description, color by event type, fields)
3. **Telegram** — Bot API `sendMessage` to configured chat ID
4. **Gotify** — POST to Gotify server with title/message/priority
5. **Email** — SMTP via nodemailer (host, port, user, pass, to)

### Event Payload
Each transport receives a standardized event:
```ts
interface NotificationEvent {
  type: 'grab' | 'download' | 'import' | 'seriesAdd' | 'episodeDelete' | 'health';
  title: string;       // e.g., "Movie Grabbed"
  message: string;     // e.g., "Dune Part Two (2024) grabbed from indexer"
  data?: Record<string, unknown>; // media metadata, torrent info, etc.
}
```

## Acceptance Criteria

- All 5 transports implemented behind `NotificationTransport` interface.
- `NotificationDispatchService` calls enabled transports after SSE dispatch.
- Webhook transport sends correct JSON payload.
- Discord transport sends formatted embed.
- Telegram transport sends message via Bot API.
- Gotify transport sends push notification.
- Email transport sends via SMTP.
- Failed transport delivery is logged but does not block other transports.
- Each transport has unit tests with mocked HTTP/SMTP.
- `CI=true bun test` — all tests pass.
- `cd app && npm run build` — builds clean.
