# BRAIN HUB — Production Research Publication Management System

BRAIN HUB is an academic research publication management platform featuring:
- **Backend**: Java 21, Spring Boot 3.3.x, Spring Security, Spring Data JPA, Flyway, PostgreSQL.
- **Frontend**: Next.js with TypeScript, Tailwind CSS, TanStack Query, React Hook Form.
- **Database**: PostgreSQL 16 with Flyway versioned migrations and composite indexing.
- **Security**: BCrypt hashing, stateless short-lived JWTs, rotating refresh tokens, RBAC, immutable audit logging.

---

## Directory Structure

```
/brain-hub
├── backend/                  # Java 21 Spring Boot 3 REST API
│   ├── pom.xml               # Maven dependencies (Security, JPA, Flyway, JJWT, OpenAPI)
│   ├── Dockerfile            # Multi-stage Eclipse Temurin 21 container build
│   └── src/                  # Source code (Entities, Repositories, Services, Controllers)
├── database/                 # Schema definitions and database initialization scripts
├── docs/                     # System architecture, deployment guide, and security policy
├── docker-compose.yml        # Local development orchestration (Postgres, Spring Boot, MinIO)
└── .env.example              # Environment variables template
```

---

## Quick Start (Local Docker Compose)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Start all services:
   ```bash
   docker-compose up --build
   ```
3. The Spring Boot API will run on `http://localhost:8080`.
4. Swagger UI documentation is available at `http://localhost:8080/swagger-ui.html`.
5. MinIO console is available at `http://localhost:9001` (User: `minioadmin`, Pass: `minioadminpassword2026`).

---

## API Endpoints Overview

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/api/auth/register` | Register researcher | Public |
| POST | `/api/auth/login` | Authenticate and obtain JWT | Public |
| POST | `/api/auth/bootstrap-admin` | Bootstrap initial admin | Secret Token |
| POST | `/api/publications` | Create research draft | RESEARCHER |
| POST | `/api/publications/{id}/upload` | Upload PDF research paper | RESEARCHER |
| POST | `/api/publications/{id}/submit` | Submit draft for review | RESEARCHER |
| GET | `/api/publications/public` | Search approved publications | Public |
| GET | `/api/admin/publications` | View review queue | ADMIN |
| POST | `/api/admin/publications/{id}/review`| Record decision (Approve/Reject) | ADMIN |
| GET | `/api/admin/audit-logs` | Query system audit trail | ADMIN |
