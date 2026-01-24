FROM elixir:1.16-alpine

WORKDIR /app

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy mix files
COPY mix.exs mix.lock* ./

# Install dependencies
RUN mix deps.get && mix deps.compile

# Copy source code
COPY . .

# Compile the app
RUN mix compile

EXPOSE 5011

CMD ["mix", "run", "--no-halt"]
