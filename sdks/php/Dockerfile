FROM php:8.3-cli-alpine

WORKDIR /app

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install dependencies (include dev for testing)
COPY composer.json composer.lock* ./
RUN composer install --optimize-autoloader

# Copy source code
COPY . .

EXPOSE 5005

CMD ["php", "-S", "0.0.0.0:5005", "index.php"]
