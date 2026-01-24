FROM rust:alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache musl-dev

# Copy Cargo files
COPY Cargo.toml ./

# Create dummy main.rs to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies
RUN cargo build --release

# Remove dummy files
RUN rm -rf src

# Copy actual source
COPY . .

# Build application
RUN cargo build --release

FROM rust:alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache musl-dev

# Copy built binary
COPY --from=builder /app/target/release/beforesend-rust-sdk /app/server

# Expose port
EXPOSE 5010

# Run the server
CMD ["/app/server"]
