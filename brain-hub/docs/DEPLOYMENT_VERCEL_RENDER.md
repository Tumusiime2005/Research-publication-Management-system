# Production Deployment Guide: Vercel & Java Spring Boot (Render / Railway / AWS)

This document provides exact, production-ready steps to deploy the BRAIN HUB system with separate tiers:
1. **Frontend**: Next.js deployed on Vercel.
2. **Backend**: Java 21 Spring Boot deployed on Render, Railway, Fly.io, or AWS ECS/Fargate.
3. **Database**: Managed PostgreSQL (e.g. Neon, Supabase, Render PostgreSQL, AWS RDS).

---

## 1. Managed Database Provisioning (PostgreSQL)

1. Provision a PostgreSQL 15+ database on your preferred managed cloud provider (e.g., Neon, Render, Supabase, AWS RDS).
2. Note the database connection parameters:
   - Host, Port, Database name
   - Username and secure Password
   - Full JDBC URL: `jdbc:postgresql://<host>:5432/<dbname>?sslmode=require`

---

## 2. Java Spring Boot Deployment (Render / Railway / Fly.io)

### Option A: Render (Web Service)
1. In Render, select **New +** -> **Web Service**.
2. Connect your Git repository containing the `/brain-hub/backend` folder.
3. Choose **Docker** runtime (or Dockerfile path: `./backend/Dockerfile`).
4. Set **Environment Variables**:
   ```env
   PORT=8080
   SPRING_PROFILES_ACTIVE=prod
   SPRING_DATASOURCE_URL=jdbc:postgresql://<db_host>:5432/<dbname>?sslmode=require
   SPRING_DATASOURCE_USERNAME=<db_user>
   SPRING_DATASOURCE_PASSWORD=<db_password>
   JWT_SECRET=super_secret_64_character_hex_or_string_key_for_hmac_256
   ADMIN_BOOTSTRAP_TOKEN=BH-PROD-SECURE-ADMIN-TOKEN-2026
   CORS_ALLOWED_ORIGINS=https://your-brain-hub-app.vercel.app
   STORAGE_PROVIDER=local
   STORAGE_LOCAL_DIR=/app/uploads/publications
   ```
5. Deploy the service. Flyway will automatically run `V1__init_schema.sql` and `V2__add_indexes_and_audit.sql` on startup.
6. Verify healthy status at: `https://<your-render-url>/actuator/health`

---

## 3. Frontend Deployment on Vercel

1. Import the Git repository in the Vercel Dashboard.
2. Set **Root Directory** to `frontend` (or `./frontend`).
3. Set **Framework Preset** to Next.js.
4. Configure **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://<your-render-backend-url>
   ```
5. Deploy! Vercel will build the Next.js application, optimize routes, and serve it via its global Edge Network.

---

## 4. Bootstrapping Your First Administrator

Once both services are running:
1. Send a POST request to your backend's `/api/auth/bootstrap-admin` with your bootstrap secret token:
```bash
curl -X POST https://<your-backend-url>/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Chief",
    "lastName": "Editor",
    "email": "admin@brainhub.org",
    "password": "SuperSecureAdminPassword2026!",
    "institution": "Global Research Council",
    "bootstrapSecretToken": "BH-PROD-SECURE-ADMIN-TOKEN-2026"
  }'
```
2. Log in through the Vercel frontend interface at `/login` with `admin@brainhub.org`.
