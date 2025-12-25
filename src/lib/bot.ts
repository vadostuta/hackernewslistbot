import { Bot } from 'grammy';
import type { Env } from '../types';

/**
 * Create and configure a grammY bot instance
 */
export function createBot(env: Env): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  // Error handling middleware
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
}
