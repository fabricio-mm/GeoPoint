# 📍 GeoPoint - Smart Hybrid Time Tracking System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-in%20development-orange)
![.NET](https://img.shields.io/badge/.NET-8.0-purple)
![React](https://img.shields.io/badge/React-18-blue)

**GeoPoint** is a modern solution for time and attendance tracking focused on the hybrid work model (On-site and
Remote/Home Office). Unlike traditional systems, it uses **Geofencing** to validate the employee's physical presence at
the agreed location (Headquarters or Registered Home) via the browser, ensuring legal security and flexibility.

## 🚀 Key Features

### 👤 For Employees

- **Geolocation Clock-in:** Punching in is only allowed if the device is within a **140m radius** of a permitted
  location.
- **Real-Time Dashboard:** View hour balance, daily goals, and a visual progress bar.
- **Transparent History:** 3-month timesheet history with a map pin showing the exact location of each record.
- **Request Center:** Submit medical certificates (via camera/upload) and justify missed punches.

### 🏢 For HR / Management

- **Perimeter Management:** Visual map interface to register and adjust employee home locations for accurate remote
  validation.
- **Automated Calculations:** Built-in rules for tolerance (e.g., 5/10 min rules), overtime, and hour bank management.
- **Complete Audit:** Immutable logs for any manual adjustment made to time records.
- **Approval Workflow:** Accept or reject certificates and time adjustments with a single click.

---

## 🛠️ Tech Stack

The project was built following Clean Architecture principles.

| Layer        | Technology      | Details                                                   |
|:-------------|:----------------|:----------------------------------------------------------|
| **Frontend** | React.js        | SPA, Hooks, Context API, TailwindCSS                      |
| **Backend**  | C# .NET 8       | Web API, Entity Framework Core                            |
| **Cache**    | **Redis**       | Distributed cache for performance and idempotency control |
| **Database** | PostgreSQL      | Relational, usage of JSONB and Geographic Types           |
| **Testing**  | xUnit / Cypress | Unit tests (Business Logic) and E2E                       |
| **Infra**    | Docker          | Containerization for development                          |

---

## 📐 System Architecture & Design

### 1. High-Level Architecture

The diagram below illustrates how the Client, API, and Data layers interact, highlighting the role of **Redis** in
performance.

```mermaid
graph TD
    %% Actors
    User((Employee/HR))
    
    %% Frontend
    subgraph Client [Frontend SPA]
        React[React App]
        GPS[Browser Geo API]
    end

    %% Backend
    subgraph Server [Backend API]
        API[.NET 8 Web API]
        Auth[JWT Service]
        Calc[CLT Engine]
    end

    %% Data
    subgraph Data [Persistence & Cache]
        Redis[(Redis Cache)]
        Postgres[(PostgreSQL)]
        Storage[Blob Storage]
    end

    %% Flows
    User --> React
    React -- 1. Coordinates --> GPS
    GPS -.-> React
    React -- 2. HTTPS Request --> API
    
    %% Internal Backend Connections
    API -.- Auth
    API -.- Calc

    %% Data Flows
    API -- 3. Check Cache/Lock --> Redis
    API -- 4. Persist Data --> Postgres
    API -- 5. Save Files --> Storage
    
    Redis -.-> API
    Postgres -.-> API
    
    %% Styling
    style Redis fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    style Postgres fill:#ccddff,stroke:#0066cc,stroke-width:2px
    style API fill:#d9d2e9,stroke:#674ea7,stroke-width:2px
````

### 2\. Database Schema (PostgreSQL)

The database was designed for high integrity and auditing.

> **Note:** High-read tables (such as `DAILY_BALANCES`) utilize a **Cache-Aside strategy**. The relational database
> serves as the source of truth, while Redis serves "hot data".

```mermaid
erDiagram
    %% ---------------------------------------------------------
    %% CONFIGURATION & USERS
    %% ---------------------------------------------------------

    WORK_SCHEDULES {
        uuid id PK
        varchar name
        time daily_hours_target
        int tolerance_minutes
        jsonb work_days "Ex: [1,2,3,4,5]"
    }

    USERS {
        uuid id PK
        varchar full_name
        varchar email
        varchar role "Enum: EMPLOYEE, HR, ADMIN"
        varchar status "Enum: ACTIVE, INACTIVE"
        uuid work_schedule_id FK
    }

    LOCATIONS {
        uuid id PK
        uuid user_id FK "Nullable: If NULL = HQ"
        varchar name
        varchar type "Enum: OFFICE, HOME"
        decimal latitude
        decimal longitude
        int radius_meters
    }

    %% ---------------------------------------------------------
    %% OPERATIONAL (TIME TRACKING)
    %% ---------------------------------------------------------

    TIME_ENTRIES {
        uuid id PK
        uuid user_id FK
        timestamptz timestamp_utc
        varchar type "Enum: ENTRY, EXIT"
        varchar origin "Enum: WEB, MOBILE"
        decimal latitude_recorded
        decimal longitude_recorded
        boolean is_manual_adjustment
    }

    DAILY_BALANCES {
        uuid id PK
        uuid user_id FK
        date reference_date
        int total_worked_minutes
        int balance_minutes
        int overtime_minutes
        varchar status
    }

    %% ---------------------------------------------------------
    %% MANAGEMENT & AUDIT
    %% ---------------------------------------------------------

    REQUESTS {
        uuid id PK
        uuid requester_id FK
        uuid reviewer_id FK
        varchar type "Enum: CERTIFICATE, FORGOT_PUNCH"
        date target_date
        varchar status "Enum: PENDING, APPROVED"
        text justification_user
    }

    ATTACHMENTS {
        uuid id PK
        uuid request_id FK
        text file_url
        varchar file_type
    }

    AUDIT_LOGS {
        uuid id PK
        uuid actor_id FK
        varchar action
        varchar entity_affected
        jsonb old_value
        jsonb new_value
    }

    %% ---------------------------------------------------------
    %% RELATIONSHIPS
    %% ---------------------------------------------------------

    WORK_SCHEDULES ||--|{ USERS : "defines rules for"
    USERS ||--o{ LOCATIONS : "has locations"
    USERS ||--o{ TIME_ENTRIES : "logs"
    USERS ||--o{ DAILY_BALANCES : "accumulates"
    USERS ||--o{ REQUESTS : "submits (requester)"
    USERS ||--o{ REQUESTS : "reviews (reviewer)"
    REQUESTS ||--|{ ATTACHMENTS : "contains proof"
    USERS ||--o{ AUDIT_LOGS : "triggers logs"
```

-----

## ⚡ How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Docker](https://www.docker.com/) (For Postgres & Redis)

### 1\. Setup Backend

```bash
# Clone the repository
git clone [https://github.com/your-username/geopoint.git](https://github.com/your-username/geopoint.git)
cd geopoint/backend

# Run Infrastructure (Postgres + Redis)
docker-compose up -d

# Run migrations
dotnet ef database update

# Start the API
dotnet watch run
```

### 2\. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Start the project
npm run dev
```

-----

## 🧪 Testing Strategy

To ensure reliability in labor law compliance (hour calculations and tolerance rules), we use robust unit tests.

```bash
# Run Backend tests
cd backend
dotnet test
```

To validate geolocation features, we use **GPS Mocks** in E2E tests with Cypress, simulating "Inside Perimeter" and "
Outside Perimeter" scenarios.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](https://www.google.com/search?q=LICENSE) file for
details.

```
```
