# Multi-stage build for Cocoa SDK
# Stage 1: Build with Swift
FROM swift:5.9-jammy AS build

WORKDIR /app

# Install WebKit GTK for JavaScriptCore support on Linux
# Also install C++ libraries and development files required by JXKit
RUN apt-get update && apt-get install -y \
    libjavascriptcoregtk-4.0-dev \
    libjavascriptcoregtk-4.0-18 \
    libc++1 \
    libc++abi1 \
    libc++-dev \
    libc++abi-dev \
    && rm -rf /var/lib/apt/lists/*

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

# Install WebKit GTK runtime libraries and C++ standard library
RUN apt-get update && apt-get install -y \
    libjavascriptcoregtk-4.0-18 \
    libc++1 \
    libc++abi1 \
    && rm -rf /var/lib/apt/lists/*

# Copy the built executable from build stage
COPY --from=build /app/.build/release/App ./App

EXPOSE 5009

ENTRYPOINT ["./App"]
CMD ["serve", "--env", "production", "--hostname", "0.0.0.0", "--port", "5009"]
