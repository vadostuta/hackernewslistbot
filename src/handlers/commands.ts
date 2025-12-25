import type { Context } from 'grammy';
import type { Env } from '../types';
import { addActiveUser, trackUserActivity } from '../lib/storage';
import { formatStories, createPaginationKeyboard, getTotalPages, getWelcomeMessage } from '../lib/telegram';
import { fetchCurrentStories } from './fetch-current';

/**
 * Handle /start command
 */
export async function handleStartCommand(ctx: Context, env: Env): Promise<void> {
  try {
    const chatId = ctx.chat?.id;

    if (!chatId) {
      console.error('No chat ID found in context');
      return;
    }

    // Track user activity
    await trackUserActivity(
      env,
      chatId,
      ctx.from?.username,
      ctx.from?.first_name,
      ctx.from?.last_name
    );

    // Send welcome message
    await ctx.reply(getWelcomeMessage(), {
      parse_mode: 'MarkdownV2',
    });

    // Add user to active users list (for daily notifications)
    await addActiveUser(env, chatId);

    // Fetch and display current stories
    const stories = await fetchCurrentStories(false);

    if (stories.length === 0) {
      await ctx.reply('Sorry, could not fetch stories at the moment. Please try again later.');
      return;
    }

    // Send first page of stories
    const message = formatStories(stories, 0);
    const totalPages = getTotalPages(stories.length);
    const keyboard = createPaginationKeyboard(0, totalPages);

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error('Error in /start command:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}
