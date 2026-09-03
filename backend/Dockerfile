FROM composer:2 AS dependencies

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --ignore-platform-req=ext-mongodb

FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends $PHPIZE_DEPS libssl-dev \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf \
    && a2enmod mpm_prefork rewrite \
    && test "$(apache2ctl -M 2>/dev/null | grep -c '_mpm_')" -eq 1 \
    && sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=dependencies /app/vendor ./vendor
COPY . ./
COPY php.ini /usr/local/etc/php/conf.d/anonspace.ini

RUN mkdir -p uploads \
    && chown -R www-data:www-data uploads

EXPOSE 80
