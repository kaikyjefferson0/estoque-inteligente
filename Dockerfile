# Dois alvos, usados pelo docker-compose.yml: "api" (FastAPI) e "site" (React servido pelo nginx).
# Só para rodar localmente: o deploy no Render não usa este arquivo.

# --- API ---
FROM python:3.14-slim AS api-dependencias
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
COPY backend/requirements.txt /tmp/requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt \
    && /opt/venv/bin/pip uninstall -y pip

FROM python:3.14-slim AS api
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin estoque
COPY --from=api-dependencias /opt/venv /opt/venv
WORKDIR /app
COPY backend/alembic.ini ./
COPY backend/alembic ./alembic
COPY backend/app ./app
USER estoque
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)"]
# A mesma sequência do startCommand do render.yaml. 1 processo, porque os limites de tentativas
# (RN-47, RN-52 e RN-56) ficam na memória do processo
CMD ["sh", "-c", "alembic upgrade head && python -m app.scripts.sincronizar_permissoes && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1"]

# --- Site ---
FROM node:24-slim AS site-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# As VITE_* entram no build: mudar qualquer uma exige docker compose up --build
ARG VITE_API_URL
ARG VITE_DEMO=true
ARG VITE_DEMO_EMAIL
ARG VITE_DEMO_SENHA
RUN npm run build

FROM nginxinc/nginx-unprivileged:1-alpine AS site
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site-build /frontend/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/"]
