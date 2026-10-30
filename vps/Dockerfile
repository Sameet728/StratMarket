FROM node:20-slim

# Install Python & system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY vps/requirements.txt ./vps/

RUN npm install --omit=dev
RUN pip3 install --no-cache-dir --break-system-packages -r vps/requirements.txt

# Copy source tree
COPY . .

ENV NODE_ENV=production
ENV VPS_API_ENDPOINT=http://marketplace:3000/api/internal/signals

CMD ["npx", "tsx", "vps/runner.ts"]
