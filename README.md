# hookshot

```markdown
# 🪝 Hookshot

> The webhook delivery system that actually delivers. (Eventually. With retries.)

Hookshot is a production-ready webhook delivery system that accepts events, queues them, and delivers them to registered endpoints with automatic retries, exponential backoff, and a dead letter queue for the ones that just won't behave.

Think of it as the postal service for your webhooks — sometimes it takes a few tries, but we always get there (or die trying).

---

## Why Hookshot?

Because every webhook needs a destination. And every delivery needs a backup plan.

- **Background delivery** — Your users don't wait for webhook responses.
- **Retries & backoff** — 5 attempts with exponential backoff (1min, 2min, 4min, 8min, 16min).
- **Dead Letter Queue** — Failed events go to DLQ for manual replay.
- **HMAC signatures** — Every webhook is signed for security.
- **Dashboard** — Real-time stats and delivery logs.

---

## Features

| Feature | What it does |
|---------|--------------|
| 🔐 JWT Auth | Register, login, refresh, logout |
| 📍 Endpoint Management | Create, list, get, delete webhook URLs |
| 📨 Event Ingestion | Accept and queue events |
| 🚚 Delivery Worker | Background delivery with HMAC signatures |
| 🔄 Retry Engine | 5 attempts, exponential backoff |
| 📦 Dead Letter Queue | Permanent failure storage + replay |
| 📊 Dashboard | Success rate, failure rate, avg latency |
| 🚦 Rate Limiting | 100 requests per 15 minutes |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js + Express | API server |
| PostgreSQL | Permanent storage (Neon.tech) |
| Redis + BullMQ | Job queue |
| Prisma | Database ORM |
| JWT | Authentication |
| bcrypt | Password hashing |
| Railway | Deployment |

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/hookshot.git
cd hookshot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

```bash
cp .env.example .env
```

Add your `DATABASE_URL` and `REDIS_URL`.

### 4. Run migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start the server

```bash
npm run dev
```

---

## API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register a new user |
| `/auth/login` | POST | Login → get tokens |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/logout` | POST | Logout → revoke refresh token |

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/endpoints` | POST | Register a webhook URL |
| `/endpoints` | GET | List all endpoints |
| `/endpoints/:id` | GET | Get single endpoint |
| `/endpoints/:id` | DELETE | Delete an endpoint |

### Events

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events` | POST | Create an event |
| `/events` | GET | List all events |
| `/events/:id` | GET | Get single event |
| `/events/failed` | GET | List failed events (DLQ) |
| `/events/:id/replay` | POST | Replay a failed event |

### Dashboard

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard` | GET | Success rate, failure rate, stats |
| `/deliveries` | GET | Delivery logs with filters |

---

## Rate Limiting

All endpoints are rate-limited to **100 requests per 15 minutes** per user (or IP if unauthenticated).

```json
{
  "error": "Too many requests, please try again later."
}
```

Status: `429 Too Many Requests`

---

## Webhook Delivery Flow

```
User creates endpoint → Gets unique secret
        ↓
User sends event → Queued in BullMQ
        ↓
Worker delivers webhook → HMAC signature added
        ↓
Success → Event status = "delivered"
        ↓
Failure → Retry (1min, 2min, 4min, 8min, 16min)
        ↓
5 failures → Dead Letter Queue
        ↓
Manual replay → Re-queued for delivery
```

---

## 📸 Screenshots

### Login Response

```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Dashboard Response

```json
{
  "totalDeliveries": 42,
  "successRate": 85.7,
  "failureRate": 14.3,
  "byEndpoint": [
    {
      "endpointId": 1,
      "total": 30,
      "success": 28,
      "failed": 2,
      "avgLatency": 245
    }
  ]
}
```

---

## 🎯 Why "Hookshot"?

Because it's like a grappling hook for your webhooks. It shoots events to their destination. And if it misses, it tries again. And again. Until it gets there or gives up and asks for help.

Also, Legend of Zelda references are cool.

---

## License

MIT — Go wild.

---

## Built With ❤️

Built with Node.js, Express, Prisma, PostgreSQL, Redis, BullMQ, and Railway.

---

**Hookshot. Because even webhooks deserve a second chance.**
```