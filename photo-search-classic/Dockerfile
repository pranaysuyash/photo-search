# syntax=docker/dockerfile:1

FROM node:18-alpine AS web
WORKDIR /app
COPY photo-search-classic/webapp/package*.json ./photo-search-classic/webapp/
RUN cd photo-search-classic/webapp && npm ci
COPY photo-search-classic/webapp ./photo-search-classic/webapp
RUN cd photo-search-classic/webapp && npm run build

FROM python:3.11-slim AS api
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn[standard]
COPY photo-search-classic/requirements.txt /app/photo-search-classic/requirements.txt
RUN pip install --no-cache-dir -r /app/photo-search-classic/requirements.txt
COPY photo-search-classic /app/photo-search-classic
COPY --from=web /app/photo-search-classic/api/web /app/photo-search-classic/api/web
EXPOSE 8001
CMD ["python","-m","uvicorn","photo-search-classic.api.server:app","--host","0.0.0.0","--port","8001"]

