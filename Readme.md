# Rydex

A microservices-based ride-sharing backend — 9 independently deployable Node.js/Express
services communicating via REST and a Redis-backed event bus, built solo to demonstrate
distributed systems design: geospatial matching, event-driven architecture, and real-time updates.

**Status: all 9 backend services complete and integration-tested end-to-end.**

## Goal of this project

This is a scoped-down implementation of production ride-sharing architecture patterns —
not a claim to production scale. Every simplification (single Redis instance instead of
a cluster, Redis Pub/Sub instead of Kafka, Docker Compose instead of Kubernetes) is a
deliberate, documented trade-off for solo scope, not an oversight.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js + Express | Consistent stack across all services |
| Relational data | PostgreSQL + Sequelize | Users, trips, payments, ratings |
| Geospatial + cache | Redis | Driver locations (GEO commands), surge counters, pub/sub |
| Real-time push | Socket.io | Live driver location broadcast to riders |
| Event bus | Redis Pub/Sub | Decouples services (e.g. `RideCompleted` → Payment + Rating + Notification) |
| Payments | Stripe (test mode, PaymentIntents API) | Tokenized charges — no card data touches our services |
| Orchestration | Docker Compose | Postgres + Redis locally; each service run independently |
| Auth | JWT + bcrypt | Verified once at the gateway, and again where sensitive |

---

## Microservices Overview

| Service | Port | Responsibility |
|---|---|---|
| **api-gateway** | 4000 | Single entry point; routes to services, enforces JWT auth on protected routes |
| **auth-service** | 4001 | Signup/login, issues JWTs |
| **location-service** | 4002 | Redis GEO-indexes driver locations, broadcasts via WebSocket |
| **matching-service** | 4003 | Finds nearby drivers, scores/ranks candidates, dispatches |
| **trip-service** | 4004 | Ride state machine (requested→assigned→in_progress→completed/cancelled) |
| **surge-service** | 4005 | Computes demand/supply-based price multiplier every 60s |
| **payment-service** | 4006 | Stripe charge on trip completion, handles failure compensation |
| **notification-service** | 4007 | Reacts to ride/payment events (logs — stub for real SMS/push) |
| **rating-service** | 4008 | Post-trip ratings, rolling average per user |

---

## Project Structure

```
rydex/
├── package.json                 # root — npm workspaces config
├── docker-compose.yml           # postgres, redis
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
│   │       └── routes/
│   │           └── proxyConfig.js
│   │
│   ├── auth-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── db.js
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
│   │       ├── socket.js
│   │       └── routes/
│   │           └── location.js
│   │
│   ├── matching-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── scoring.js
│   │       ├── routes/
│   │       │   └── rides.js
│   │       └── events/
│   │           └── publish.js
│   │
│   ├── trip-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── db.js
│   │       ├── models/
│   │       │   └── trip.js
│   │       ├── stateMachine.js
│   │       ├── routes/
│   │       │   └── trips.js
│   │       └── events/
│   │           ├── publish.js
│   │           └── consume.js
│   │
│   ├── surge-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── redisSurge.js
│   │       ├── surgeJob.js
│   │       └── routes/
│   │           └── pricing.js
│   │
│   ├── payment-service/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── db.js
│   │       ├── stripeClient.js
│   │       ├── models/
│   │       │   └── payment.js
│   │       ├── routes/
│   │       │   └── payments.js
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
│           ├── db.js
│           ├── models/
│           │   └── rating.js
│           ├── controllers/
│           │   └── ratingController.js
│           └── routes/
│               └── ratings.js
```

---

## End-to-End Flow (what actually happens on a ride request)

```
1. Rider signs up/logs in              -> auth-service issues JWT
2. Driver sends GPS updates            -> location-service (Redis GEOADD + WebSocket broadcast)
3. Rider requests a ride                -> matching-service queries location-service,
                                            scores candidates (distance + rating), picks best match
                                         -> publishes RideRequested
                                         -> records demand in surge-service
4. trip-service consumes RideRequested  -> creates trip (status: requested)
5. Trip proceeds through state machine  -> assigned -> in_progress -> completed
6. On completion: trip-service fetches live surge multiplier, calculates fare
                                         -> publishes RideCompleted
7. payment-service consumes RideCompleted -> charges via Stripe PaymentIntents
                                         -> publishes PaymentProcessed or PaymentFailed
8. notification-service & rating-service react to events independently
```

Every arrow above is either a direct REST call or a Redis Pub/Sub event — no service
calls more than one hop deep synchronously except where a response is genuinely needed
(e.g. matching-service must wait on location-service's result to pick a driver).

---

## Architecture Per Microservice

### api-gateway
```
Rider/Driver App --> API Gateway --> [routes to appropriate service]
```
- Verifies JWT (via shared authMiddleware) before forwarding protected requests
- Reverse-proxies to every downstream service via a single config-driven route map
- No business logic or database of its own

### auth-service
```
Client -> POST /auth/signup -> hash password -> save user (Postgres)
Client -> POST /auth/login  -> verify hash -> issue JWT
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
- Pushes live location to riders via WebSocket rather than polling

### matching-service
```
Rider App -> POST /rides/request -> matching-service
                                        |
                                        --> GET /location/nearby (nearby drivers)
                                        --> score + rank candidates (distance, rating)
                                        --> publish RideRequested event
                                        --> record demand in surge-service
```
- No database of its own — reads from location-service, publishes events for other services

### trip-service
```
consumes: RideRequested  --> creates trip record (status: requested)
POST /trips/:id/assign   --> status: assigned
POST /trips/:id/start    --> status: in_progress
POST /trips/:id/complete --> fetches live surge multiplier, computes fare
                          --> status: completed
                          --> publishes RideCompleted
```
- Owns the `trips` table and enforces valid state transitions only

### surge-service
```
[every 60s, node-cron] --> read pending demand & available driver count (Redis)
                        --> compute ratio --> set current surge multiplier (Redis)

trip-service --> GET /pricing/surge --> apply multiplier to fare
```
- Stateless compute job; stores only the current multiplier in Redis

### payment-service
```
consumes: RideCompleted --> create Stripe PaymentIntent (test mode)
                         --> success --> publish PaymentProcessed
                         --> failure --> publish PaymentFailed (compensating event)
```
- Owns the `payments` table
- Implements the saga's compensation step — no distributed transactions across services

### notification-service
```
consumes: RideRequested, RideCompleted, PaymentProcessed, PaymentFailed
        --> logs a notification (stub for real SMS/push via Twilio/FCM)
```
- Purely reactive — no business database, only event consumers

### rating-service
```
POST /ratings                  --> save rating, linked to trip
GET  /ratings/user/:userId     --> return average stars + total count
```
- Owns the `ratings` table
- Simplest service, no external dependencies beyond its own DB

---

## Matching Algorithm (the core algorithmic piece)

Drivers within a search radius are scored with a weighted sum rather than picking the
nearest driver only:

```
score = 0.7 x distanceScore + 0.3 x ratingScore
distanceScore = 1 - (distance / radius)   // closer = higher
ratingScore   = rating / 5
```

Chosen to demonstrate that proximity and quality both matter in a real dispatch
decision, and because it's trivially extensible — adding an ETA term later is a third
weighted factor, not a rewrite.

---

## Running Locally

```bash
docker compose up -d               # Postgres + Redis
npm install                        # from repo root — links all workspaces

# then, in separate terminals:
npm run dev -w services/auth-service
npm run dev -w services/api-gateway
npm run dev -w services/location-service
npm run dev -w services/matching-service
npm run dev -w services/trip-service
npm run dev -w services/surge-service
npm run dev -w services/payment-service
npm run dev -w services/notification-service
npm run dev -w services/rating-service
```

All requests go through the gateway at `http://localhost:4000`.

### Example: full ride flow through the gateway

```bash
# 1. Sign up / log in
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"rider@example.com","password":"pass1234","role":"rider"}'

# 2. Seed a driver location
curl -X POST http://localhost:4000/location/update \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"driverId":"driver-1","longitude":77.4126,"latitude":28.6692}'

# 3. Request a ride
curl -X POST http://localhost:4000/rides/request \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"riderId":"rider-1","longitude":77.41,"latitude":28.67}'

# 4. Progress the trip
curl -X POST http://localhost:4000/trips/<tripId>/assign  -H "Authorization: Bearer <token>"
curl -X POST http://localhost:4000/trips/<tripId>/start   -H "Authorization: Bearer <token>"
curl -X POST http://localhost:4000/trips/<tripId>/complete -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -d '{"baseFare":150}'

# 5. Check payment
curl http://localhost:4000/payments/<tripId> -H "Authorization: Bearer <token>"

# 6. Rate the driver
curl -X POST http://localhost:4000/ratings \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"tripId":"<tripId>","raterId":"rider-1","targetId":"driver-1","stars":5,"comment":"Great ride"}'
```