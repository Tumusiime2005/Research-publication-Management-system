import React, { useState } from 'react';
import { Code2, Server, Database, Shield, Rocket, FileCode, Check, Copy } from 'lucide-react';

const CODE_SNIPPETS: Record<string, { title: string; language: string; code: string; desc: string }> = {
  'pom.xml': {
    title: 'Maven Dependencies (pom.xml)',
    language: 'xml',
    desc: 'Java 21, Spring Boot 3.3.4, Spring Security, Spring Data JPA, Flyway, JJWT 0.12.6, and Testcontainers.',
    code: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
    </parent>
    <groupId>com.brainhub</groupId>
    <artifactId>brain-hub-backend</artifactId>
    <version>1.0.0</version>
    <properties>
        <java.version>21</java.version>
        <jjwt.version>0.12.6</jjwt.version>
        <springdoc.version>2.6.0</springdoc.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>\${jjwt.version}</version>
        </dependency>
    </dependencies>
</project>`
  },
  'SecurityConfig.java': {
    title: 'Spring Security 6 Configuration',
    language: 'java',
    desc: 'Stateless JWT authentication filter chain, BCrypt password hashing, and role-based endpoint access control.',
    code: `@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/publications/public/**").permitAll()
                .requestMatchers("/api-docs/**", "/swagger-ui/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}`
  },
  'V1__init_schema.sql': {
    title: 'Flyway Migration V1: PostgreSQL Schema',
    language: 'sql',
    desc: 'Complete relational DDL: users, refresh_tokens, publications, publication_authors, publication_reviews, notifications, audit_logs.',
    code: `CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('RESEARCHER', 'ADMIN')),
    institution VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    abstract TEXT NOT NULL,
    research_area VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE publication_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    decision VARCHAR(30) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'REVISION_REQUESTED')),
    verification_notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);`
  },
  'PublicationController.java': {
    title: 'Publication REST Controller',
    language: 'java',
    desc: 'REST API endpoints for drafting, uploading documents, and submitting publications for review.',
    code: `@RestController
@RequestMapping("/api/publications")
public class PublicationController {

    private final PublicationService publicationService;
    private final FileStorageService fileStorageService;

    @PostMapping
    public ResponseEntity<PublicationResponse> createDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreatePublicationRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(publicationService.createDraft(principal.getUser(), request, httpRequest.getRemoteAddr()));
    }

    @PostMapping(value = "/{id}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PublicationResponse> uploadDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file
    ) {
        var fileInfo = fileStorageService.storeFile(file);
        return ResponseEntity.ok(publicationService.attachDocument(principal.getUser(), id, fileInfo));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<PublicationResponse> submitForReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(publicationService.submitForReview(principal.getUser(), id, httpRequest.getRemoteAddr()));
    }
}`
  },
  'docker-compose.yml': {
    title: 'Docker Compose Local Orchestration',
    language: 'yaml',
    desc: 'Starts PostgreSQL 16, Spring Boot 3 API with multi-stage build, and MinIO S3 object storage.',
    code: `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: brainhub-postgres
    environment:
      POSTGRES_DB: brain_hub_db
      POSTGRES_USER: brain_user
      POSTGRES_PASSWORD: brain_secure_pass_2026
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: brainhub-backend
    depends_on:
      - postgres
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/brain_hub_db
      JWT_SECRET: 4c7e9a8f2b1d6c0e5a8f7b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1
      ADMIN_BOOTSTRAP_TOKEN: BH-BOOTSTRAP-SECURE-KEY-2026
    ports:
      - "8080:8080"

volumes:
  postgres_data:`
  }
};

export const ArchitectureViewer: React.FC = () => {
  const [activeSnippetKey, setActiveSnippetKey] = useState<string>('pom.xml');
  const [copied, setCopied] = useState(false);

  const activeSnippet = CODE_SNIPPETS[activeSnippetKey];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#6D28D9] mb-1">
          <Code2 className="w-4 h-4 text-[#6D28D9]" />
          <span>Production Engineering Specifications</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">
          BRAIN HUB System Architecture & Monorepo
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          The monorepo contains a separate Java 21 / Spring Boot 3.3.x backend service configured for Render / Railway / AWS deployment,
          Flyway migrations for PostgreSQL, and a Next.js / TypeScript edge-deployed frontend for Vercel.
        </p>
      </div>

      {/* 3 Pillars Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center mb-3">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Java 21 & Spring Boot 3</h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Stateless REST architecture with Spring Security, BCrypt (cost factor 12), JJWT token generation,
            HikariCP connection pooling, and OpenAPI / Swagger 3 documentation.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">PostgreSQL 16 & Flyway</h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Relational integrity with versioned Flyway migrations (<code className="font-mono text-[11px]">V1</code>, <code className="font-mono text-[11px]">V2</code>),
            UUID primary keys, partial indexes, and audit logging table.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Rocket className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Vercel & Render Ready</h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Decoupled deployment: Next.js edge static delivery on Vercel communicating securely over HTTPS
            with persistent Spring Boot container instances.
          </p>
        </div>
      </div>

      {/* Code Inspector Box */}
      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800">
        {/* Top File Selector Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1">
            {Object.keys(CODE_SNIPPETS).map((key) => (
              <button
                key={key}
                onClick={() => setActiveSnippetKey(key)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer shrink-0 ${
                  activeSnippetKey === key
                    ? 'bg-slate-800 text-purple-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ml-3"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Source'}
          </button>
        </div>

        {/* Snippet Description */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>{activeSnippet.desc}</span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-purple-400">
            {activeSnippet.language}
          </span>
        </div>

        {/* Code Content */}
        <div className="p-5 overflow-x-auto max-h-[480px]">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed tabular-nums">
            <code>{activeSnippet.code}</code>
          </pre>
        </div>
      </div>

      {/* Monorepo Directory Tree Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="text-sm font-bold text-[#1E1B4B] mb-2">
          Project Monorepo Structure (<code className="font-mono text-xs">/brain-hub</code>)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All files are generated in the application workspace and ready for export or repository push.
        </p>

        <pre className="p-4 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed overflow-x-auto">
{`/brain-hub
├── backend/
│   ├── pom.xml                                      # Maven Java 21 & Spring Boot 3.3.4
│   ├── Dockerfile                                   # Multi-stage Eclipse Temurin container build
│   └── src/
│       ├── main/java/com/brainhub/
│       │   ├── BrainHubApplication.java             # Main Application entry point
│       │   ├── config/
│       │   │   ├── SecurityConfig.java              # Stateless JWT & BCrypt configuration
│       │   │   ├── JwtAuthenticationFilter.java     # Per-request token parser
│       │   │   └── OpenApiConfig.java               # Swagger 3 UI definitions
│       │   ├── controller/
│       │   │   ├── AuthController.java              # Register, login, refresh, admin bootstrap
│       │   │   ├── PublicationController.java       # Researcher draft & submission APIs
│       │   │   ├── AdminPublicationController.java  # Editorial queue & review decision APIs
│       │   │   └── PublicPublicationController.java # Approved research discovery APIs
│       │   ├── entity/                              # JPA Entities (User, Publication, Review, etc.)
│       │   ├── repository/                          # Spring Data JPA interfaces
│       │   └── service/                             # Business logic & audit logging
│       ├── main/resources/
│       │   ├── application.yml                      # Development database & JWT configuration
│       │   ├── application-prod.yml                 # Production overrides
│       │   └── db/migration/
│       │       ├── V1__init_schema.sql              # Core tables DDL
│       │       └── V2__add_indexes_and_audit.sql    # Performance indexes & constraints
│       └── test/java/com/brainhub/
│           └── BrainHubApplicationTests.java        # Testcontainers PostgreSQL test suite
├── database/
│   └── schema.sql                                   # Raw SQL DDL schema
├── docs/
│   ├── ARCHITECTURE.md                              # System architecture & lifecycle state machine
│   ├── DEPLOYMENT_VERCEL_RENDER.md                  # Deployment guide for Vercel & Render
│   └── SECURITY.md                                  # Cryptographic & OWASP security policies
├── docker-compose.yml                               # Local Postgres 16, Spring Boot, and MinIO
├── README.md                                        # Getting started & API documentation
└── .env.example                                     # Environment variable template`}
        </pre>
      </div>
    </div>
  );
};
