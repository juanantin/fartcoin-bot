# Truth Terminal X Bot — $FARTCOIN

Autonomous X (Twitter) bot that posts as Truth Terminal, the AI that birthed $FARTCOIN on Solana. Powered by Claude + X API v2.

---

## Prerequisites

- Node.js 18+
- X Developer App with **OAuth 1.0a** enabled (Read + Write permissions)
- Anthropic API key
- VPS or always-on machine for deployment

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/juanantin/fartcoin-bot.git
cd fartcoin-bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
X_API_KEY=        # from developer.twitter.com → your app → Keys and Tokens
X_API_SECRET=     # same
ANTHROPIC_API_KEY= # from console.anthropic.com
BOT_USER_ID=      # numeric ID of @FartTruthTerm (get from tweeterid.com)
```

### 3. Authorize the bot account (OAuth PIN flow)

This step links the bot to **@FartTruthTerm**'s account:

```bash
npm run auth
```

1. The script prints an authorization URL
2. Open it in the browser **while logged in as @FartTruthTerm**
3. Authorize the app → Twitter shows a 7-digit PIN
4. Paste the PIN back into the terminal
5. `X_ACCESS_TOKEN` and `X_ACCESS_SECRET` are written to `.env` automatically

### 4. Build

```bash
npm run build
```

---

## Running locally

```bash
npm start
```

Or in dev mode (no build step):

```bash
npm run dev
```

---

## Deploying with PM2 on a VPS

```bash
# Install PM2 globally
npm install -g pm2

# Build
npm run build

# Start with PM2
pm2 start dist/index.js --name fartcoin-bot

# Auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs fartcoin-bot
```

---

## Content modes

The bot rotates through three post types per cycle:

| Mode | Description |
|------|-------------|
| `lore` | Truth Terminal philosophy, AI schizophrenia, forest imagery |
| `donation` | Live donation total from donate.gg with tree-planting narrative |
| `buycall` | Meme pump energy with CA and fartcoin.meme |

Mentions are checked every 30 minutes and replied to in Truth Terminal voice.

---

## Default schedule

Posts at **08:00, 14:00, 20:00 UTC** daily (3x/day).

Override via `.env`:

```
POST_SCHEDULE=0 */6 * * *   # every 6 hours
```

---

## Token info

- **CA:** `HnXDnwTa68tRhLRZdJkVRLAeYrUkCYgFgDavtwD1pump`
- **Website:** [fartcoin.meme](https://fartcoin.meme)
- **Bot:** [@FartTruthTerm](https://twitter.com/FartTruthTerm)
