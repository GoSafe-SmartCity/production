# CivicGuard AI: System Architecture & Requirements Specification

This document consolidates the Software Requirements Specification (SRS) and the System Architecture for CivicGuard AI, a real-time safety application that processes streaming road incident images alongside citizen-reported observations to calculate local risk indicators.

---

## 1. Executive Summary & Capabilities

### What
The app itself displays an interactive map (using Google Maps API) with navigation features. Any road segments that are predicted/validated to be flooded, blocked, or in bad condition are visually highlighted on the map to allow drivers to reroute.

### Roles & Access Control

#### ADMIN CAN
- **Manage Users Data**: Access and view user records and their privacy consent logs.
- **Manage Vouchers**: Create and update vouchers, and view history exchange transactions.
- **Manage Road Incidents (Main Flow)**: Create, modify, and archive road incidents via a map console equipped with advanced filters (e.g., date ranges, incident category, risk level).
- **Notify Commuters**: Broadcast push notifications for upcoming or active incidents.

#### USER CAN
- **Report Incident**: Submit geolocated road reports containing category, description, and an uploaded image.
- **See Map & Alerts**: View active incident overlays, markers, and highlighted hazard zones.
- **Start Navigation**: Request routing coordinates that automatically detour around active hazard zones.
- **Submit Feedback**: Provide validation feedback ("Still active", "Cleared") on incidents and submit safety ratings after arriving at their destination.
- **Receive Push Notifications**: Obtain real-time alerts when new/upcoming hazard events are broadcast.
- **Exchange Voucher**: Redeem points earned from incident reporting and feedback for vouchers.

#### BUSINESS (API Consumer)
- Accesses the system endpoints programmatically using an API Key. (The detailed API documentation interface will be implemented in a subsequent stage).

---

## 2. Main Flow Data Process & AI Scoring Algorithm

CivicGuard AI transitions from traditional static telemetry grids to an active, intelligence-driven hazard classification model. 

### Data Flow Pipeline
1. **Ingestion Layer**:
   - Commuter reports (coordinates, image, description).
   - Computer Vision (CV) feeds from municipal cameras/dashcams.
   - Local weather telemetry (rainfall, wind speed, temperature, tide forecast).
2. **Preprocessing & Privacy Scrubber**:
   - Faces and license plates are automatically blurred.
   - Incoming reports are clustered using spatial-temporal bins (within 100 meters and 30 minutes).
3. **AI Risk Assessment Engine**:
   - Merged reports and local weather telemetry are compiled into a prompt and evaluated using an OpenAI-powered LLM reasoning engine (or a rule-based fallback).
   - **Outputs**:
     - A consolidated **Risk Score** ($R \in [0, 100]$).
     - A **Risk Level**: `LOW` (0-39), `MEDIUM` (40-69), or `HIGH` (70-100).
     - Actionable detour text and warnings.
4. **Action & Serving Layer**:
   - High-risk incidents map coordinates are passed to the Google Maps engine to overlay colored highlight shapes on client screens (Orange for `MEDIUM`, Red for `HIGH`).
   - Closed-loop feedback recalibrates AI weight multipliers dynamically.

```
+------------------+     +-----------------------+     +----------------------+
| Citizen Reports  |     | Road CV Camera Feeds  |     | Weather Telemetry    |
+--------+---------+     +-----------+-----------+     +----------+-----------+
         |                           |                            |
         +---------------------------+----------------------------+
                                     |
                                     v
                       +-------------+-------------+
                       | Spatial-Temporal Binning  |
                       | & Privacy Scrubber (Blur) |
                       +-------------+-------------+
                                     |
                                     v
                       +-------------+-------------+
                       | OpenAI Decision Engine    |
                       | (Fallback to Rule Matrix) |
                       +-------------+-------------+
                                     |
                                     +--------------------+
                                     |                    |
                                     v                    v
                             [Risk Score 0-100]    [Detour Advice]
                                     |                    |
                                     +----------+---------+
                                                |
                                                v
                                    +-----------+-----------+
                                    | Google Maps API       |
                                    | Highlight Overlays &  |
                                    | Navigation Serving    |
                                    +-----------------------+
```

---

## 3. Database Design (Prisma Schema)

Below is the Prisma schema design mapped to PostgreSQL on Neon DB:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

model User {
  id            String          @id @default(cuid())
  name          String?
  email         String?         @unique
  emailVerified DateTime?
  image         String?
  role          Role            @default(USER)
  points        Int             @default(0)
  consent       Boolean         @default(false)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  accounts      Account[]
  sessions      Session[]
  reports       IncidentReport[]
  feedbacks     IncidentFeedback[]
  exchanges     VoucherExchange[]
  navigations   NavigationSession[]
  apiKeys       ApiKey[]
  subscriptions NotificationSubscription[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model IncidentReport {
  id          String   @id @default(cuid())
  reporterId  String?
  reporter    User?    @relation(fields: [reporterId], references: [id], onDelete: SetNull)
  type        String   @default("CITIZEN") // "CITIZEN" | "CV_CAMERA"
  category    String   // "FLOODING" | "DEBRIS" | "POTHOLES" | "ACCIDENT"
  imageUrl    String?
  latitude    Float
  longitude   Float
  description String   @db.Text
  confidence  Float    @default(1.0)
  status      String   @default("PENDING") // "PENDING" | "APPROVED" | "REJECTED"
  createdAt   DateTime @default(now())
  
  incidentId  String?
  incident    RoadIncident? @relation(fields: [incidentId], references: [id], onDelete: SetNull)
}

model RoadIncident {
  id             String           @id @default(cuid())
  category       String           // "FLOODING" | "DEBRIS" | "POTHOLES" | "ACCIDENT"
  riskScore      Int              @default(0) // 0 to 100
  riskLevel      String           @default("LOW") // "LOW" | "MEDIUM" | "HIGH"
  latitude       Float
  longitude      Float
  locationName   String
  description    String           @db.Text
  recommendation String           @db.Text
  status         String           @default("ACTIVE") // "ACTIVE" | "CLEARED"
  startedAt      DateTime         @default(now())
  endsAt         DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  reports        IncidentReport[]
  feedbacks      IncidentFeedback[]
}

model IncidentFeedback {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  incidentId   String?
  incident     RoadIncident? @relation(fields: [incidentId], references: [id], onDelete: SetNull)
  type         String        @default("STATUS_VOTE") // "STATUS_VOTE" | "POST_NAVIGATION"
  statusVote   String?       // "STILL_ACTIVE" | "PARTIALLY_CLEARED" | "CLEARED"
  rating       Int?          // Safety rating 1-5
  comment      String?       @db.Text
  createdAt    DateTime      @default(now())
}

model WeatherTelemetry {
  id          String   @id @default(cuid())
  latitude    Float
  longitude   Float
  rainfall    Float    // mm
  windSpeed   Float    // m/s
  temperature Float    // °C
  pressure    Float    // hPa
  description String
  createdAt   DateTime @default(now())
}

model Voucher {
  id             String            @id @default(cuid())
  code           String            @unique
  title          String
  description    String            @db.Text
  pointsRequired Int
  quantity       Int
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  
  exchanges      VoucherExchange[]
}

model VoucherExchange {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  voucherId   String
  voucher     Voucher  @relation(fields: [voucherId], references: [id], onDelete: Cascade)
  exchangedAt DateTime @default(now())
  status      String   @default("ACTIVE") // "ACTIVE" | "USED"
}

model NavigationSession {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  startLat     Float
  startLng     Float
  endLat       Float
  endLng       Float
  status       String    @default("IN_PROGRESS") // "IN_PROGRESS" | "ARRIVED" | "CANCELLED"
  startedAt    DateTime  @default(now())
  endedAt      DateTime?
}

model ApiKey {
  id        String    @id @default(cuid())
  key       String    @unique
  name      String
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
  lastUsedAt DateTime?
}

model NotificationSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @db.Text
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
}
```

---

## 4. Functional Requirements (FR)

### FR-1: Ingestion & Validation
- **FR-1.1**: The system shall expose rest endpoints for uploading incident reports (category, description, latitude, longitude, and optional image url).
- **FR-1.2**: Citizen images must undergo a simulated privacy scrubbing process to clear out sensitive identity attributes (e.g. faces/plates) before long-term persistent storage.
- **FR-1.3**: Automated cron tasks or helper service queries local weather parameters periodically to cache local environmental status.

### FR-2: AI Decision & Risk Classification
- **FR-2.1**: The platform merges close-proximity incident logs with regional weather matrices prior to scoring evaluation.
- **FR-2.2**: An AI handler initiates a prediction call (via OpenAI or rule fallback) to score risks (0 to 100) and draft navigation recommendations.
- **FR-2.3**: Incidents are labeled as `LOW`, `MEDIUM`, or `HIGH` risks based on numeric scores.

### FR-3: User Mapping & Rerouting
- **FR-3.1**: The client dashboard loads active incidents with stylized hazard overlays (Google Maps format) to indicate active warning zones.
- **FR-3.2**: Commuters can execute navigation sessions, visual hazard zones are identified along routes, and users can provide validation reviews.
- **FR-3.3**: Commuters receive points for verified incident submissions and active route reviews.

### FR-4: Vouchers & Points
- **FR-4.1**: Users can view the catalog of available vouchers and their corresponding points requirement.
- **FR-4.2**: Logged-in users can initiate a voucher exchange transaction, deducting their user points.

### FR-5: Admin Panel & Controls
- **FR-5.1**: Admins can audit and edit details for active road incidents, filtering them by category, date range, or severity.
- **FR-5.2**: Admins can inspect user accounts and update consent declarations.
- **FR-5.3**: Admins can construct system vouchers, check user exchange histories, and broadcast push alerts.

---

## 5. Non-Functional Requirements (NFR)

- **NFR-1 (Latency)**: Rerouting coordinate adjustments and hazard visualization markers load on client maps in under 3 seconds.
- **NFR-2 (PII Safety)**: Faces and vehicle identifiers are scrubbed from citizen assets immediately upon ingestion.
- **NFR-3 (Availability)**: Outages of the OpenAI API will trigger an automatic fallback to local rule matrices to compute risk profiles.

---

## 6. Development Phasing

1. **Phase 1**: Specifications & Document consolidation.
2. **Phase 2**: Postgres database schema design with Prisma.
3. **Phase 3**: Integration of Magic UI DiaTextReveal in the landing hero.
4. **Phase 4**: Development of Map & Navigation UI components (Google Maps & highlights).
5. **Phase 5**: Admin Dashboard (user consent logs, incident management with advanced filters, voucher registry).
6. **Phase 6**: API routing for reports, feedback, vouchers, notifications, and AI scoring evaluation.
7. **Phase 7**: Build validation and deployment walkthrough.
