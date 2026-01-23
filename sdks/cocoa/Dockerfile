# Multi-stage build for Cocoa SDK
# Stage 1: Build with Swift
FROM swift:5.9-jammy AS build

WORKDIR /app

# Copy Package files first for dependency caching
COPY Package.swift ./

# Resolve dependencies
RUN swift package resolve

# Copy source code
COPY Sources ./Sources
COPY Tests ./Tests

# Build the application
RUN swift build -c release

# Stage 2: Runtime with Swift runtime
FROM swift:5.9-jammy-slim

WORKDIR /app

# Copy the built executable from build stage
COPY --from=build /app/.build/release/App ./App

EXPOSE 5009

ENTRYPOINT ["./App"]
CMD ["serve", "--env", "production", "--hostname", "0.0.0.0", "--port", "5009"]
