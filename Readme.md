# Rydex

A microservices-based ride-sharing backend, built solo as a learning project to understand
distributed systems patterns — service decomposition, geospatial search, event-driven
communication, saga-based transaction handling, and real-time updates — using a Node.js/Express
stack.

## Goal of this project

This is **not** a production-scale Uber clone. It's a scoped-down implementation of the same
architectural patterns real ride-sharing platforms use (matching engines, geo-indexing, surge
pricing, payment sagas, event buses), built to be understood end-to-end by one person rather than
a team. Every simplification made from the "real" production version (single Redis instance
instead of a cluster, Redis Pub/Sub instead of Kafka, Docker Compose instead of Kubernetes) is a
deliberate trade-off for project scope, documented as such rather than hidden.

The aim is to come out of this with:
- A working, demoable backend with 8 independent services communicating over REST + events
- Hands-on experience with Redis (geospatial queries), WebSockets (real-time push), and payment
  gateway integration (Stripe)
- A concrete artifact to walk through in interviews, including the design trade-offs behind it

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js + Express | Consistent stack across all services |
| Relational data | PostgreSQL + Sequelize | Users, trips, payments, ratings |
| Geospatial + cache | Redis (single instance) | Driver locations (GEO commands), surge counters, pub/sub |
| Real-time push | Socket.io | Driver location broadcast, ride status updates |
| Event bus | Redis Pub/Sub (upgradeable to BullMQ) | Decouples services (e.g. `RideCompleted` → Payment, Rating) |
| Payments | Stripe (test mode) | Tokenized charges, no real card data touches our services |
| Notifications | Twilio (trial) / console fallback | SMS + push stubs |
| Orchestration | Docker Compose | Local multi-service orchestration (no Kubernetes at this scale) |
| Auth | JWT + bcrypt | Stateless auth across services via API Gateway |
| Frontend (later phase) | React (minimal) | Just enough UI to demo a live ride request |

---

## Project Structure

```
rydex/
├── package.json                 # root — npm workspaces config
├── docker-compose.yml           # postgres, redis, all services
├── .env.example
├── .gitignore
├── README.md
│
├── shared/                      # common code used by multiple services
│   ├── package.json
│   └── src/
│       ├── index.js             # single export point
│       ├── logger.js            # winston logger wrapper
│       ├── authMiddleware.js    # JWT verify middleware
│       ├── eventBus.js          # Redis pub/sub wrapper
│       └── errors.js            # standard error classes
│
├── services/
│   ├── api-gateway/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       └── routes/          # proxies to each service
│   │
│   ├── auth-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── models/
│   │       │   └── user.js
│   │       ├── routes/
│   │       │   └── auth.js
│   │       └── controllers/
│   │           └── authController.js
│   │
│   ├── location-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── redisGeo.js
│   │       ├── routes/
│   │       │   └── location.js
│   │       └── socket.js        # socket.io broadcast logic
│   │
│   ├── matching-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── scoring.js       # driver candidate scoring logic
│   │       ├── routes/
│   │       │   └── rides.js
│   │       └── events/
│   │           └── publish.js
│   │
│   ├── surge-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── surgeJob.js      # node-cron recompute job
│   │       └── routes/
│   │           └── pricing.js
│   │
│   ├── trip-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── models/
│   │       │   └── trip.js
│   │       ├── stateMachine.js
│   │       └── events/
│   │           ├── publish.js
│   │           └── consume.js
│   │
│   ├── payment-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── stripeClient.js
│   │       ├── models/
│   │       │   └── payment.js
│   │       └── events/
│   │           ├── publish.js
│   │           └── consume.js
│   │
│   ├── notification-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       └── events/
│   │           └── consume.js
│   │
│   └── rating-service/
│       ├── package.json
│       └── src/
│           ├── index.js
│           ├── models/
│           │   └── rating.js
│           └── routes/
│               └── ratings.js
│
└── frontend/                     # minimal demo UI (built last)
    └── (React/Vite app)
```

---

## Microservices Overview

| Service | Responsibility |
|---|---|
| **api-gateway** | Single entry point; routes requests to services, verifies JWTs |
| **auth-service** | Signup/login for riders & drivers, issues JWTs |
| **location-service** | Ingests driver GPS updates, geo-indexes them in Redis, broadcasts via WebSocket |
| **matching-service** | Finds nearby drivers, scores candidates, dispatches ride requests |
| **surge-service** | Computes a supply/demand-based price multiplier per geographic cell |
| **trip-service** | Manages ride/booking state machine (requested → assigned → in_progress → completed) |
| **payment-service** | Charges rider via Stripe on trip completion, handles failure compensation |
| **notification-service** | Sends SMS/push notifications on key trip events |
| **rating-service** | Post-trip rating submission and average score updates |

---

## Architecture Per Microservice

### api-gateway
```
Rider/Driver App --> API Gateway --> [routes to appropriate service]
```
- Verifies JWT before forwarding requests
- Reverse-proxies to auth, location, matching, trip, payment, rating services
- No business logic or database of its own

### auth-service
```
Client -> POST /signup -> hash password -> save user (Postgres)
Client -> POST /login  -> verify hash -> issue JWT
```
- Owns the `users` table (id, email, password_hash, role, created_at)
- Only service that issues JWTs; all others just verify them

### location-service
```
Driver App --(GPS every 3-5s)--> location-service --> Redis GEOADD
                                        |
                                        --> Socket.io broadcast --> subscribed Rider App
```
- Writes driver lat/long into a Redis geospatial index (sorted set under the hood)
- Persists last-known location to Postgres for durability
- Pushes live location to riders via WebSocket rather than polling

### matching-service
```
Rider App -> POST /rides/request -> matching-service
                                        |
                                        --> Redis GEOSEARCH (nearby drivers)
                                        --> score candidates (distance, ETA, rating)
                                        --> publish "RideRequested" event
                                        --> notify top driver, await accept/reject
```
- No database of its own — reads from Redis, publishes events for other services to react to
- This is the core algorithmic piece of the project (candidate scoring logic)

### surge-service
```
[every ~60s, node-cron] --> read pending_requests & available_drivers per cell (Redis)
                          --> compute ratio --> set current surge multiplier (Redis)

trip-service --> GET current multiplier --> apply to new booking fare
```
- Stateless compute job; stores only the current multiplier per cell in Redis

### trip-service
```
consumes: DriverAssigned --> creates trip record (status: assigned)
                          --> status: in_progress --> status: completed
publishes: RideCompleted --> triggers payment-service + rating-service
```
- Owns the `trips` table and the trip state machine
- Central point where surge multiplier + fare gets attached to a booking

### payment-service
```
consumes: RideCompleted --> create Stripe charge (test mode, tokenized)
                          --> success --> publish PaymentProcessed
                          --> failure --> publish PaymentFailed (compensating event)
```
- Owns the `payments` table
- Implements the saga's compensation step — no distributed transactions across services

### notification-service
```
consumes: DriverAssigned, RideCompleted, PaymentProcessed, PaymentFailed
        --> sends SMS (Twilio) or console log --> and/or push via Socket.io
```
- Purely reactive — no REST endpoints, only event consumers

### rating-service
```
Client -> POST /ratings (trip_id, target_id, stars, comment) --> save + update rolling average
Client -> GET /ratings/user/:id --> return average + history
```
- Owns the `ratings` table
- Simplest service, no external dependencies beyond its own DB

---

## Build Order & Packages Per Stage

Services are built **one at a time, in this order**, with each merged/pushed to GitHub once it
works end-to-end before starting the next. Packages are installed only when that stage begins —
not all upfront.

### Stage 0 — Repo setup
```bash
# at repo root
npm init -y   # configure as npm workspaces root
```
No service-level packages yet — just the root `package.json`, `docker-compose.yml`, `.gitignore`,
and this README.

### Stage 1 — `shared/`
Common code (JWT middleware, logger) reused across services.
```bash
cd shared
npm init -y
npm install jsonwebtoken winston
```

### Stage 2 — `auth-service/`
First real service — signup/login, JWT issuance.
```bash
cd services/auth-service
npm init -y
npm install express bcrypt jsonwebtoken pg sequelize dotenv
npm install --save-dev nodemon
```

### Stage 3 — `api-gateway/`
Basic reverse proxy in front of auth-service (and later, everything else).
```bash
cd services/api-gateway
npm init -y
npm install express http-proxy-middleware cors dotenv helmet express-rate-limit
```

### Stage 4 — `location-service/`
First introduction of Redis (geo commands) and WebSockets.
```bash
cd services/location-service
npm init -y
npm install express ioredis socket.io dotenv
```

### Stage 5 — `matching-service/`
Core algorithmic service — nearby-driver search + scoring.
```bash
cd services/matching-service
npm init -y
npm install express ioredis dotenv
```

### Stage 6 — `trip-service/`
Ride/booking state machine.
```bash
cd services/trip-service
npm init -y
npm install express pg sequelize ioredis dotenv
```

### Stage 7 — `surge-service/`
Scheduled surge multiplier computation.
```bash
cd services/surge-service
npm init -y
npm install express ioredis node-cron dotenv
```

### Stage 8 — `payment-service/`
First introduction of Stripe (test mode).
```bash
cd services/payment-service
npm init -y
npm install express stripe ioredis pg sequelize dotenv
```

### Stage 9 — `notification-service/`
Event consumer only — Twilio or console fallback.
```bash
cd services/notification-service
npm init -y
npm install express ioredis twilio dotenv
```

### Stage 10 — `rating-service/`
Simplest CRUD service — good place to also add first tests.
```bash
cd services/rating-service
npm init -y
npm install express pg sequelize dotenv
npm install --save-dev jest supertest
```

### Stage 11 — `frontend/`
Minimal React app to demo a live ride request, once all backend services are working.
```bash
cd frontend
npx create-vite@latest . -- --template react
npm install socket.io-client axios
```

### Stage 12 — Polish
- Finalize README with architecture diagrams
- Add a "Design Decisions & Trade-offs" section
- Add a "What I'd Change at Scale" section (Kafka, K8s, Redis Cluster, circuit breakers)
- Tag a release (`v1.0`) once the full flow works end-to-end

---

## Notes on Scaling Trade-offs (for interview context)

This project intentionally simplifies several production concerns for solo, resume-scope
feasibility:

- **Redis Pub/Sub instead of Kafka** — same event-decoupling benefit, without the operational
  overhead of running a Kafka cluster solo. At real scale, Kafka's durability and replay would
  matter; documented as a known upgrade path.
- **Docker Compose instead of Kubernetes** — sufficient to demonstrate multi-service orchestration
  locally without needing a managed cluster.
- **Single Redis/Postgres instances instead of clusters** — this project isn't being load-tested at
  production traffic, so replication/sharding isn't the priority; the geospatial and relational
  *patterns* are what's being demonstrated.
- **No distributed transactions across services** — the saga pattern (compensating events on
  payment failure) is used deliberately instead, matching how real microservice systems avoid 2PC.