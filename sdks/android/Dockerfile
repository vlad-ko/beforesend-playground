# Multi-stage build for Android SDK
# Stage 1: Build with Gradle
FROM gradle:8.5-jdk21-alpine AS build

WORKDIR /app

# Copy Gradle files
COPY build.gradle.kts settings.gradle.kts ./

# Download dependencies
RUN gradle dependencies --no-daemon || true

# Copy source code
COPY src ./src

# Build the application
RUN gradle clean bootJar --no-daemon

# Stage 2: Runtime with JRE only
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built JAR from build stage
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 5008

ENTRYPOINT ["java", "-jar", "app.jar"]
