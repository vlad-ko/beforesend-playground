FROM ruby:3.3-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache build-base

# Install dependencies
COPY Gemfile Gemfile.lock* ./
RUN bundle install

# Copy source code
COPY . .

EXPOSE 5004

CMD ["ruby", "app.rb"]
