# BRAIN HUB - Offline Development & Setup Guide

Welcome to the **BRAIN HUB Research Publication Management System** offline source package.

This package contains:
1. **Interactive Full Frontend (Vite + React 19 + TypeScript + Tailwind CSS)**:
   Located in the root directory and in `brain-hub/frontend`. Includes real account authentication, Google/Gmail device notifications integration, peer review workflows, publication submission and approval lifecycle, search, DOI generation, and analytics.
2. **Enterprise Backend (Java 21 + Spring Boot 3.x + PostgreSQL + Flyway)**:
   Located in `brain-hub/backend`. Complete RESTful architecture with Spring Security, JWT tokens, BCrypt hashing, OpenAPI Swagger specs, entity models, and PostgreSQL migrations.
3. **Database & Infrastructure**:
   Located in `brain-hub/database` and `brain-hub/docker-compose.yml` for 1-command local PostgreSQL container setup.

---

## 1. Quick Start: Offline Frontend

To run and edit the frontend locally on your computer:

```bash
# 1. Navigate to the frontend directory (workspace root or brain-hub/frontend)
npm install --legacy-peer-deps

# 2. Run the development server
npm run dev
```

Open your browser at:
`http://localhost:3000`

### Available Frontend Scripts
- `npm run dev` - Starts Vite local development server with instant hot-reloading
- `npm run build` - Builds production bundle into `dist/`
- `npm run lint` - Validates TypeScript types and contracts

---

## 2. Quick Start: PostgreSQL Database with Docker

If you have Docker installed, start a local PostgreSQL database with one command:

```bash
cd brain-hub
docker compose up -d postgres
```

Database connection settings:
- **Host**: `localhost:5432`
- **Database**: `brainhub`
- **Username**: `brainhub_user`
- **Password**: `brainhub_secure_password_2026`

---

## 3. Quick Start: Java 21 Spring Boot Backend

To run the Spring Boot API service:

```bash
cd brain-hub/backend

# Verify Java 21 is installed
java -version

# Run with Maven Wrapper
./mvnw clean spring-boot:run
```

Once running:
- **API Root**: `http://localhost:8080/api/v1`
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **Health Check**: `http://localhost:8080/actuator/health`

---

## 4. Key Configuration Files

- `src/` - Active UI components, pages, hooks, state, and services
- `src/services/googleAuth.ts` - Google Identity and OAuth authentication service
- `src/services/gmail.ts` - Gmail API device notification dispatcher
- `brain-hub/backend/src/main/resources/application.yml` - Spring Boot configuration
- `brain-hub/backend/src/main/resources/db/migration/` - SQL schema migrations
- `public/assets/` - Brand assets and system logo

---

## 5. Contact & Attribution
**Systems Analyst**: MARON PRIME THE LEGENDARY SYSTEMS ANALYST
**Contact**: +256 769849051
