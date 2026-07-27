FROM node:22.20.0-alpine3.22 AS build
WORKDIR /workspace

ARG NEXT_PUBLIC_PROJECT42_API_ORIGIN=http://localhost:8787
ARG NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY=http://localhost:8080/realms/project42
ARG NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID=project42-learn
ARG NEXT_PUBLIC_PROJECT42_OIDC_SCOPE="openid profile email"

ENV NEXT_PUBLIC_PROJECT42_API_ORIGIN=$NEXT_PUBLIC_PROJECT42_API_ORIGIN
ENV NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY=$NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY
ENV NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID=$NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID
ENV NEXT_PUBLIC_PROJECT42_OIDC_SCOPE=$NEXT_PUBLIC_PROJECT42_OIDC_SCOPE
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run pages:build

FROM ghcr.io/nginx/nginx-unprivileged:1.31.1-alpine3.23
COPY self-host/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/pages /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
  CMD wget --quiet --spider http://127.0.0.1:8080/health || exit 1
