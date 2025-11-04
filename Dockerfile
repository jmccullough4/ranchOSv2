FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install Node.js + npm so the container can be controlled via npm scripts
RUN apt-get update \
    && apt-get install -y curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get purge -y --auto-remove curl gnupg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY package*.json ./
RUN npm install

COPY backend backend
COPY frontend frontend

RUN npm run build

EXPOSE 8082

CMD ["npm", "run", "start"]
