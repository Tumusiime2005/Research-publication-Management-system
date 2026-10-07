# BRAIN HUB — Security Architecture & OWASP Compliance

This document outlines the security controls, cryptographic choices, and defense-in-depth measures implemented in BRAIN HUB.

---

## 1. Authentication & Session Security

- **Password Hashing**: Uses BCrypt with cost factor 12. Plaintext passwords are never stored, logged, or serialized.
- **Stateless JWTs**: Access tokens carry user ID, email, and roles, signed using HMAC-SHA256 with a 256-bit+ secret key. Tokens expire strictly after 15 minutes.
- **Refresh Token Rotation**: Refresh tokens are stored hashed (SHA-256) in PostgreSQL. Each refresh invalidates the consumed token and issues a new pair. If a revoked token is used, it indicates token theft and triggers security audits.
- **Zero Hardcoded Secrets**: All keys, passwords, and tokens are read exclusively from environment variables.

---

## 2. Authorization & Insecure Direct Object References (IDOR) Protection

- **Server-Side Verification**: Ownership verification occurs strictly inside `PublicationService`:
  ```java
  publicationRepository.findByIdAndSubmittedBy(id, user)
      .orElseThrow(() -> new ResourceNotFoundException("Publication not found"));
  ```
  A researcher cannot manipulate URL IDs to view or alter drafts belonging to other researchers.
- **Administrative Endpoints**: Guarded by Spring Security method security `@PreAuthorize("hasRole('ADMIN')")`.

---

## 3. File Upload Hardening

- **MIME Type Validation**: Enforces `application/pdf` on the server by inspecting HTTP headers and validating byte structures.
- **File Size Ceiling**: Capped strictly at 25MB (`spring.servlet.multipart.max-file-size=25MB`).
- **Path Traversal Prevention**: Filenames are sanitized via regex `[^a-zA-Z0-9._-]` and verified to remain strictly within the designated storage directory using `Path.normalize()` and `Path.startsWith()`.
- **Public Isolation**: Private/draft documents are not accessible to unauthorized users.

---

## 4. Audit Logging & Non-Repudiation

- Critical events (`REGISTER_USER`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `CREATE_DRAFT`, `SUBMIT_PUBLICATION`, `REVIEW_DECISION_APPROVED`, `REVIEW_DECISION_REJECTED`) are persisted to the `audit_logs` table along with the actor ID, entity reference, IP address, and metadata.
- Audit logs are immutable (read-only for administrators).
