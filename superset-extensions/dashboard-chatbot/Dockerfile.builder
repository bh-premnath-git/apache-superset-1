# Builder for dashboard-chatbot extension
# Produces a .supx package ready for Superset Extensions framework

FROM node:lts-alpine3.22 AS frontend-build
WORKDIR /build/frontend

# Copy frontend source
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

FROM python:3.11-bookworm AS backend-build
WORKDIR /build
RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*
RUN pip install apache-superset-extensions-cli

# Copy backend source
COPY backend/ ./backend/
COPY extension.json ./

# Copy frontend sources (CLI expects convention frontend/src/index.tsx)
COPY frontend/ ./frontend/
# Also copy built frontend artifacts from previous stage
COPY --from=frontend-build /build/frontend/dist ./frontend/dist/

# Build the extension package
# The superset-extensions CLI packages frontend + backend into .supx
RUN mkdir -p /output && superset-extensions bundle --output /output/my-org.dashboard-chatbot-0.1.0.supx

# Final stage - copy .supx to volume-mounted /output at runtime
FROM alpine:latest
COPY --from=backend-build /output/ /built/
CMD ["sh", "-c", "cp /built/*.supx /output/ && ls -la /output/"]
