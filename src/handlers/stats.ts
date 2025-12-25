import type { Context } from 'grammy';
import type { Env } from '../types';
import { getUserStats, isAdmin } from '../lib/storage';

/**
 * Handle /stats command
 * Shows user statistics (admin only if ADMIN_CHAT_ID is set)
 */
export async function handleStatsCommand(ctx: Context, env: Env): Promise<void> {
  try {
    const chatId = ctx.chat?.id;

    if (!chatId) {
      console.error('No chat ID found in context');
      return;
    }

    // Check if KV is configured
    if (!env.USERS_KV) {
      await ctx.reply(
        '📊 Statistics tracking is not enabled\\.\n\n' +
        'To enable stats, configure a KV namespace in your Cloudflare Workers settings\\.',
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    // Check admin access if ADMIN_CHAT_ID is set
    if (env.ADMIN_CHAT_ID && !isAdmin(env, chatId)) {
      await ctx.reply('🔒 This command is only available to administrators\\.',
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    // Get statistics
    const stats = await getUserStats(env);

    // Format message
    const message =
      `📊 *Bot Statistics*\n\n` +
      `👥 *Total Users:* ${stats.totalUsers}\n` +
      `🟢 *Active Today:* ${stats.activeToday}\n` +
      `📅 *Active This Week:* ${stats.activeThisWeek}\n` +
      `📆 *Active This Month:* ${stats.activeThisMonth}\n\n` +
      `_Last updated: ${new Date().toLocaleString('en-US', {
        timeZone: 'Europe/Paris',
        dateStyle: 'medium',
        timeStyle: 'short'
      })}_`;

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    console.error('Error in /stats command:', error);
    await ctx.reply('An error occurred while fetching statistics\\. Please try again later\\.',
      { parse_mode: 'MarkdownV2' }
    );
  }
}
