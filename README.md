# 📰 Hacker News Top Bot

A modern Telegram bot that fetches and delivers the top 30 stories from Hacker News daily at 8:00 AM CET. Built with TypeScript, running on Cloudflare Workers.

## Features

- 🕐 **Scheduled Daily Updates** - Automatically fetches top 30 HN stories at 8:00 AM CET
- 🔄 **On-Demand Fetching** - Click "Fetch Current" button anytime for latest stories
- 📄 **Paginated Display** - Stories split into 3 pages (10 items per page)
- ⚡ **Serverless & Fast** - Runs entirely on Cloudflare Workers
- 💾 **Stateless Architecture** - Uses Workers Cache API, no database required
- 🔗 **Direct Links** - Links to both article and HN discussion
- 📊 **User Activity Tracking** - Track active users and view statistics (optional)

## Tech Stack

- **Runtime**: Bun.js (development) / Cloudflare Workers (production)
- **Framework**: Hono.js - Modern web framework for edge runtimes
- **Bot Library**: grammY - Type-safe Telegram bot framework
- **Language**: TypeScript
- **Validation**: zod - Runtime type validation
- **Deployment**: Wrangler - Cloudflare Workers CLI

## Project Structure

```
hackernewstopbot/
├── src/
│   ├── index.ts                 # Main webhook handler + cron export
│   ├── cron.ts                  # Cron job handler
│   ├── lib/
│   │   ├── bot.ts               # grammY bot instance
│   │   ├── hn-api.ts            # Hacker News API client
│   │   ├── telegram.ts          # Message formatting & pagination
│   │   ├── storage.ts           # Cache/KV abstraction
│   │   └── utils.ts             # Helper functions
│   ├── handlers/
│   │   ├── commands.ts          # /start command handler
│   │   ├── stats.ts             # /stats command handler
│   │   ├── callbacks.ts         # Pagination & fetch current
│   │   └── fetch-current.ts     # Story fetching logic
│   └── types/
│       └── index.ts             # TypeScript type definitions
├── wrangler.toml                # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Telegram account to create a bot

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the prompts to name your bot
4. Copy the **bot token** (you'll need this later)
5. Send `/setcommands` to BotFather and set:
   ```
   start - Start the bot and get latest HN stories
   stats - View bot usage statistics (admin only)
   ```

### 2. Clone and Install Dependencies

```bash
# Clone the repository
cd hackernewstopbot

# Install dependencies
npm install
# or with Bun
bun install
```

### 3. Configure Cloudflare Workers

Login to Cloudflare (first time only):

```bash
npx wrangler login
```

### 4. Set Environment Secrets

Set your Telegram bot token:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
# Paste your bot token when prompted
```

Generate and set a webhook secret (for security):

```bash
# Generate a random secret
openssl rand -base64 32

# Set the secret
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
# Paste the generated secret
```

### 5. (Optional) Configure KV for User Storage & Stats

If you want to persist the list of active users who receive daily notifications and track user statistics:

```bash
# Create a KV namespace
npx wrangler kv:namespace create USERS_KV

# Copy the namespace ID from the output
# Update wrangler.toml and uncomment the KV section
```

Then in `wrangler.toml`, uncomment:

```toml
[[kv_namespaces]]
binding = "USERS_KV"
id = "your-kv-namespace-id"
```

> **Note**: Without KV, the bot will still work, but won't persist users between deployments and won't track statistics. Users need to send `/start` after each deployment to receive daily notifications.

### 6. (Optional) Set Admin Chat ID for Stats

To access the `/stats` command, set your Telegram chat ID:

```bash
# First, get your chat ID by messaging @userinfobot on Telegram
# Then set it as an environment variable
npx wrangler secret put ADMIN_CHAT_ID
# Paste your chat ID when prompted (e.g., 123456789)
```

> **Note**: If ADMIN_CHAT_ID is not set, anyone can use the `/stats` command (if KV is configured). You can also set multiple admins by comma-separating IDs: `123456,789012`

## Local Development

```bash
# Start local development server
npm run dev
# or
bun run dev
```

This starts Wrangler in development mode. To test the bot locally, you'll need to:

1. Expose your local server (use [ngrok](https://ngrok.com/) or similar)
2. Set the Telegram webhook to your local URL (see Webhook Setup below)

## Deployment

### Deploy to Cloudflare Workers

```bash
npm run deploy
# or
bun run deploy
```

This will output your Worker URL, e.g., `https://hackernewstopbot.your-subdomain.workers.dev`

### Set Telegram Webhook

After deployment, configure Telegram to send updates to your Worker:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://hackernewstopbot.your-subdomain.workers.dev/webhook",
    "secret_token": "<YOUR_WEBHOOK_SECRET>"
  }'
```

Replace:
- `<YOUR_BOT_TOKEN>` - Your bot token from BotFather
- `<YOUR_WEBHOOK_SECRET>` - The secret you set in step 4
- `hackernewstopbot.your-subdomain.workers.dev` - Your Worker URL from deployment

**Verify webhook is set:**

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

You should see your webhook URL in the response.

## Usage

### Bot Commands

- `/start` - Start the bot, subscribe to daily updates, and get current top stories
- `/stats` - View bot usage statistics (requires KV; admin-only if ADMIN_CHAT_ID is set)

### Inline Buttons

- **◀️ Prev** / **Next ▶️** - Navigate between pages
- **🔄 Fetch Current** - Fetch latest stories from HN immediately

### Statistics

The bot tracks user activity when KV is configured:
- **Total Users** - All users who have ever used the bot
- **Active Today** - Users active in the last 24 hours
- **Active This Week** - Users active in the last 7 days
- **Active This Month** - Users active in the last 30 days

Statistics are logged in the cron job logs and can be viewed via the `/stats` command.

## How It Works

### Daily Scheduled Fetching (8:00 AM CET)

1. Cloudflare Workers cron triggers at 7:00 UTC (8:00 AM CET in winter)
2. Bot fetches top 30 stories from HN API
3. Stories are cached for 24 hours using Workers Cache API
4. Bot sends paginated stories to all active users (from KV or none if KV not configured)

### On-Demand Fetching

1. User clicks "🔄 Fetch Current" button
2. Bot fetches fresh stories from HN API
3. Cache is updated
4. User receives first page with navigation buttons

### Pagination

- Stories are split into 3 pages (10 items per page)
- Page number is encoded in callback data (`p:0`, `p:1`, `p:2`)
- Clicking Next/Prev retrieves stories from cache and displays requested page
- No database needed - state is encoded in button callbacks

## Environment Variables

Set via `wrangler secret put`:

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from BotFather | Yes |
| `TELEGRAM_WEBHOOK_SECRET` | Random secret for webhook validation | Yes |
| `ADMIN_CHAT_ID` | Your Telegram chat ID for `/stats` command access. Get it from [@userinfobot](https://t.me/userinfobot). Can be comma-separated for multiple admins. | No |

## Configuration

### Cron Schedule

Edit `wrangler.toml` to change the schedule:

```toml
[triggers]
crons = ["0 7 * * *"]  # 7:00 UTC = 8:00 AM CET (winter)
```

**Note**:
- Winter (CET, UTC+1): 7:00 UTC = 8:00 AM CET
- Summer (CEST, UTC+2): 7:00 UTC = 7:00 AM CEST

To run at 8:00 AM year-round with DST adjustment, you would need to handle DST logic in code or use two cron expressions.

### Items Per Page

Edit `src/lib/telegram.ts`:

```typescript
const ITEMS_PER_PAGE = 10; // Change to desired number
```

### Story Limit

Edit `src/handlers/fetch-current.ts` and `src/cron.ts`:

```typescript
await fetchTopStories(30); // Change to desired limit
```

## Monitoring

### View Logs

```bash
npm run tail
# or
bun run tail
```

This streams live logs from your Worker.

### Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Workers & Pages
3. Click on your worker
4. View metrics, logs, and cron trigger history

## Troubleshooting

### Bot not responding

1. Check if webhook is set correctly:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

2. View Worker logs:
   ```bash
   npx wrangler tail
   ```

3. Test the health check endpoint:
   ```bash
   curl https://your-worker.workers.dev/
   ```

### Cron job not running

1. Check Cloudflare Dashboard → Your Worker → Triggers → Cron Triggers
2. Verify cron expression in `wrangler.toml`
3. Check logs around scheduled time:
   ```bash
   npx wrangler tail
   ```

### Stories not caching

- Cache API should work automatically
- Check logs for "Cached X stories" message
- Verify no errors in fetch/cache operations

### Users not receiving daily updates

- Ensure KV namespace is configured (if using KV)
- Check that users sent `/start` after deployment
- Verify cron job is running (check logs)

## API Rate Limits

### Hacker News API

- No official rate limits documented
- Be respectful with concurrent requests
- Current implementation: Fetches 30 stories concurrently

### Telegram Bot API

- 30 messages per second to different users
- Current implementation: 50ms delay between messages (20 msg/sec)

## Development Tips

### Type Checking

```bash
npm run typecheck
# or
bun run typecheck
```

### Testing Cron Locally

```bash
# Start dev server
npm run dev

# In another terminal, trigger cron manually
curl "http://localhost:8787/__scheduled?cron=0+7+*+*+*"
```

## Future Enhancements

- [ ] User preferences (story count, categories)
- [ ] Multiple notification times
- [ ] Filter by points/comments threshold
- [ ] Multi-language support
- [ ] Analytics dashboard
- [ ] Support for other sources (Reddit, Product Hunt)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgments

- [Hacker News API](https://github.com/HackerNews/API)
- [grammY](https://grammy.dev/) - Telegram bot framework
- [Hono](https://hono.dev/) - Web framework
- [Cloudflare Workers](https://workers.cloudflare.com/)

---

Built with ❤️ using modern JavaScript tools
