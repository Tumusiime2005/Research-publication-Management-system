# Build Stage
FROM maven:3.9.8-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

# Cache Maven dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build production jar
COPY src ./src
RUN mvn clean package -DskipTests -B

# Production Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S brainhub && adduser -S brainhub -G brainhub

# Copy executable jar from build stage
COPY --from=builder /workspace/target/brain-hub-backend-1.0.0.jar /app/app.jar

# Setup file uploads directory with correct permissions
RUN mkdir -p /app/uploads/publications && chown -R brainhub:brainhub /app

USER brainhub

ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
