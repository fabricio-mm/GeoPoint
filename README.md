# GeoPoint
Complete time tracking system for hybrid work (Home Office/On-site). Built with .NET 8 and React, it features GPS perimeter validation, automatic work hour calculations, medical certificate approval workflows, and HR auditing.

# 📍 GeoPoint - Smart Hybrid Time Tracking System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-in%20development-orange)
![.NET](https://img.shields.io/badge/.NET-8.0-purple)
![React](https://img.shields.io/badge/React-18-blue)

**GeoPoint** is a modern solution for time and attendance tracking focused on the hybrid work model (On-site and Remote/Home Office). Unlike traditional systems, it uses **Geofencing** to validate the employee's physical presence at the agreed location (Headquarters or Registered Home) via the browser, ensuring legal security and flexibility.

## 🚀 Key Features

### 👤 For Employees
- **Geolocation Clock-in:** Punching in is only allowed if the device is within a **140m radius** of a permitted location.
- **Real-Time Dashboard:** View hour balance, daily goals, and a visual progress bar.
- **Transparent History:** 3-month timesheet history with a map pin showing the exact location of each record.
- **Request Center:** Submit medical certificates (via camera/upload) and justify missed punches.

### 🏢 For HR / Management
- **Perimeter Management:** Visual map interface to register and adjust employee home locations for accurate remote validation.
- **Automated Calculations:** Built-in rules for tolerance (e.g., 5/10 min rules), overtime, and hour bank management.
- **Complete Audit:** Immutable logs for any manual adjustment made to time records.
- **Approval Workflow:** Accept or reject certificates and time adjustments with a single click.

---

## 🛠️ Tech Stack

The project was built following Clean Architecture principles and separation of concerns.

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React.js | SPA, Hooks, Context API, TailwindCSS (suggested) |
| **Backend** | C# .NET 8 | Web API, Entity Framework Core |
| **Database** | PostgreSQL | Relational, usage of JSONB and Geographic Types |
| **Testing** | xUnit / Cypress | Unit tests (Business Logic) and E2E |
| **Infra** | Docker | Containerization for development |

---

## 🗂️ Data Modeling

The database was designed for high integrity and auditing. Below is a simplified relationship diagram:

```mermaid
erDiagram
    %% ---------------------------------------------------------
    %% TABELAS DE CONFIGURAÇÃO E USUÁRIOS
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
        uuid user_id FK "Nullable: Se NULL é Sede"
        varchar name
        varchar type "Enum: OFFICE, HOME"
        decimal latitude
        decimal longitude
        int radius_meters
    }

    %% ---------------------------------------------------------
    %% TABELAS OPERACIONAIS
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
    %% TABELAS DE GESTÃO E AUDITORIA
    %% ---------------------------------------------------------

    REQUESTS {
        uuid id PK
        uuid requester_id FK
        uuid reviewer_id FK
        varchar type "Enum: ATESTADO, ESQUECIMENTO"
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
    %% RELACIONAMENTOS
    %% ---------------------------------------------------------

    %% Uma Jornada tem vários Usuários
    WORK_SCHEDULES ||--|{ USERS : "define regras para"

    %% Um Usuário tem vários locais (ou nenhum, se usar só a sede)
    USERS ||--o{ LOCATIONS : "possui casas/locais"

    %% Um Usuário tem muitos registros de ponto
    USERS ||--o{ TIME_ENTRIES : "registra"

    %% Um Usuário tem muitos saldos diários
    USERS ||--o{ DAILY_BALANCES : "acumula"

    %% Um Usuário faz muitas solicitações
    USERS ||--o{ REQUESTS : "solicita (requester)"

    %% Um Usuário (RH) revisa muitas solicitações (Opcional, pois pode ser null)
    USERS ||--o{ REQUESTS : "revisa (reviewer)"

    %% Uma solicitação tem anexos
    REQUESTS ||--|{ ATTACHMENTS : "contém provas"

    %% Um Usuário gera logs
    USERS ||--o{ AUDIT_LOGS : "aciona logs"
