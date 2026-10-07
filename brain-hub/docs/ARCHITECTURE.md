# BRAIN HUB — System Architecture & Technical Specifications

BRAIN HUB is an enterprise-grade research publication lifecycle management platform designed for academic institutions, research consortiums, and peer-reviewed journals.

---

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT TIER (Next.js)                │
│    Vercel Edge Network / React Server Components       │
│    - TanStack Query (Server State Cache)               │
│    - React Hook Form + Zod Validations                 │
│    - Accessible Semantic UI (Tailwind CSS)             │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JWT Bearer
                            ▼
┌────────────────────────────────────────────────────────┐
│               API GATEWAY / APPLICATION TIER           │
│        Java 21 / Spring Boot 3.3.x on Render / Fly.io  │
│    - Spring Security (Stateless JWT Filter Chain)      │
│    - Global Exception Handler (@RestControllerAdvice)  │
│    - Spring Data JPA with HikariCP Connection Pool     │
│    - Bean Validation (Jakarta Validation 3.0)          │
│    - OpenAPI / Swagger Documentation (/swagger-ui)     │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     PERSISTENCE TIER      │ │     FILE STORAGE TIER     │
│ PostgreSQL 16 (Managed)   │ │ AWS S3 / Cloudflare R2 /  │
│ - Flyway Schema Migrations│ │ MinIO / Local FS          │
│ - B-Tree & Partial Indexes│ │ - PDF MIME Type Enforced  │
│ - Row-Level Constraints   │ │ - 25MB File Size Limit    │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 2. Publication Lifecycle State Machine

Publications traverse a strictly enforced state machine:

```
    [ DRAFT ] ──────────(Submit)──────────► [ SUBMITTED ]
        ▲                                          │
        │                                          │ (Admin Review Assigned)
        │ (Revision Requested)                     ▼
        └─────────────────────────────────── [ UNDER_REVIEW ]
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         ▼                                                   ▼
                   [ APPROVED ]                                        [ REJECTED ]
            (Live on Public Dashboard)                       (Requires Written Rationale)
```

1. **DRAFT**: Researcher inputs title, abstract, research domain, keywords, co-authors, and uploads PDF documents. Can edit repeatedly.
2. **SUBMITTED**: The draft is locked against modifications and queued for editorial verification.
3. **UNDER_REVIEW**: An administrator or reviewer picks the publication from the queue to inspect metadata and verify citations/methodology.
4. **APPROVED**: Publication is assigned an official timestamp, becomes publicly discoverable, searchable, and citation-ready.
5. **REJECTED**: Rejected with a mandatory written critique (min 10 characters) explaining deficiencies. Researcher is alerted via in-app notifications.

---

## 3. Security & Authentication Architecture

- **Stateless Authentication**: Access tokens are HMAC-SHA512 or HMAC-SHA256 signed JWTs with 15-minute validity.
- **Rotating Refresh Tokens**: Stored hashed with SHA-256 in PostgreSQL. Every refresh invalidates the prior refresh token and issues a new pair, mitigating replay attacks.
- **Admin Bootstrapping**: First administrator creation requires a protected environment secret (`ADMIN_BOOTSTRAP_TOKEN`).
- **Role-Based Access Control (RBAC)**: Evaluated at the controller and method level with `@PreAuthorize("hasRole('ADMIN')")`.
