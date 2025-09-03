# syntax=docker/dockerfile:1

FROM node:18-alpine AS web
WORKDIR /app
COPY photo-search-intent-first/webapp/package*.json ./photo-search-intent-first/webapp/
RUN cd photo-search-intent-first/webapp && npm ci
COPY photo-search-intent-first/webapp ./photo-search-intent-first/webapp
RUN cd photo-search-intent-first/webapp && npm run build

FROM python:3.11-slim AS api
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn[standard]
COPY photo-search-intent-first/requirements.txt /app/photo-search-intent-first/requirements.txt
RUN pip install --no-cache-dir -r /app/photo-search-intent-first/requirements.txt
COPY photo-search-intent-first /app/photo-search-intent-first
COPY --from=web /app/photo-search-intent-first/api/web /app/photo-search-intent-first/api/web
EXPOSE 8000
CMD ["python","-m","uvicorn","photo-search-intent-first.api.server:app","--host","0.0.0.0","--port","8000"]

