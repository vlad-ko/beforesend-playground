# Rust SDK Backend for SDK Playground
#
# This Dockerfile uses a multi-stage build:
# 1. Builder stage: Compiles the server application
# 2. Runtime stage: Runs the server and compiles user code on-demand
#
# Why rust:slim-bookworm instead of alpine?
# - Alpine uses musl libc which can cause dynamic linking issues with Rust binaries
# - The rust:alpine builder creates binaries linked against musl, but runtime
#   compatibility issues can cause silent failures (binary exits immediately)
# - rust:slim-bookworm uses glibc which has better compatibility
# - We need the full Rust toolchain at runtime because user code is compiled on-demand
#
# Why not a minimal runtime image?
# - Unlike other SDKs that interpret code, Rust compiles user code on each request
# - This requires cargo, rustc, and the standard library at runtime
# - Using the same image for build and runtime ensures ABI compatibility
#
# Performance considerations:
# - First compilation after container start is slower (cold crate cache)
# - Subsequent compilations are faster due to cargo's incremental compilation
# - The tempfile crate handles cleanup of temporary build directories
#
# Build: docker build -t sdk-playground-sdk-rust .
# Run:   docker run -p 5010:5010 sdk-playground-sdk-rust

# =============================================================================
# Stage 1: Builder - Compile the server application
# =============================================================================
FROM rust:slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy Cargo files first for dependency caching
COPY Cargo.toml ./

# Create dummy main.rs to build and cache dependencies
# This layer is cached unless Cargo.toml changes
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies only (cached layer)
RUN cargo build --release

# Remove dummy files
RUN rm -rf src

# Copy actual source code
COPY src ./src

# Build the application
# Touch main.rs to ensure it's rebuilt with the new source
RUN touch src/main.rs && cargo build --release

# =============================================================================
# Stage 2: Runtime - Run server and compile user code
# =============================================================================
FROM rust:slim-bookworm

WORKDIR /app

# Install runtime dependencies
# - ca-certificates: For HTTPS requests (if needed)
# - curl: For health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Pre-cache common crates used by user code
# This creates a cargo cache that speeds up user code compilation
RUN mkdir -p /tmp/cache-project/src && \
    echo '[package]\nname = "cache"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nserde = { version = "1.0", features = ["derive"] }\nserde_json = "1.0"' > /tmp/cache-project/Cargo.toml && \
    echo 'fn main() {}' > /tmp/cache-project/src/main.rs && \
    cd /tmp/cache-project && \
    cargo build --release && \
    rm -rf /tmp/cache-project

# Copy the compiled server binary from builder
COPY --from=builder /app/target/release/beforesend-rust-sdk /app/server

# Expose the service port
EXPOSE 5010

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5010/health || exit 1

# Run the server
CMD ["/app/server"]
