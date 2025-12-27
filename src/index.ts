import { Hono } from 'hono';
import { webhookCallback } from 'grammy';
import type { Env } from './types';
import { createBot } from './lib/bot';
import { handleStartCommand } from './handlers/commands';
import { handleCallbackQuery } from './handlers/callbacks';
import { handleStatsCommand } from './handlers/stats';
import { handleTimeCommand } from './handlers/time';
import { handleScheduled } from './cron';

const app = new Hono<{ Bindings: Env }>();

// Health check endpoint
app.get('/', (c) => {
  return c.text('🤖 Hacker News Top Bot is running!');
});

// Manual cron trigger for testing (GET request for easy testing)
app.get('/trigger-cron', async (c) => {
  const env = c.env;

  try {
    console.log('Manual cron trigger started');
    await handleScheduled(env);
    return c.text('✅ Cron job executed successfully! Check your Telegram for the message.');
  } catch (error) {
    console.error('Manual cron trigger error:', error);
    return c.text('❌ Error: ' + error, 500);
  }
});

// Webhook endpoint for Telegram updates
app.post('/webhook', async (c) => {
  const env = c.env;

  // Verify webhook secret
  const secret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    console.error('Invalid webhook secret');
    return c.text('Unauthorized', 401);
  }

  try {
    // Create bot instance
    const bot = createBot(env);

    // Register command handlers
    bot.command('start', async (ctx) => {
      await handleStartCommand(ctx, env);
    });

    bot.command('stats', async (ctx) => {
      await handleStatsCommand(ctx, env);
    });

    bot.command('time', async (ctx) => {
      await handleTimeCommand(ctx, env);
    });

    // Register callback query handler
    bot.on('callback_query:data', async (ctx) => {
      await handleCallbackQuery(ctx, env);
    });

    // Initialize bot before handling updates
    await bot.init();

    // Process the update using grammY's webhook callback
    const update = await c.req.json();
    await bot.handleUpdate(update);

    return c.text('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    return c.text('Error', 500);
  }
});

// Export both the Hono app and scheduled handler
export default {
  fetch: app.fetch,
  scheduled: async (
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> => {
    await handleScheduled(env);
  },
};
