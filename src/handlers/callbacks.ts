import type { CallbackQueryContext, Context } from 'grammy';
import type { Env } from '../types';
import { decodeCallback } from '../lib/utils';
import { formatStories, createPaginationKeyboard, getTotalPages } from '../lib/telegram';
import { fetchCurrentStories } from './fetch-current';
import { handleTimeSelection } from './time';

/**
 * Handle callback queries (pagination, fetch current, and time selection)
 */
export async function handleCallbackQuery(ctx: CallbackQueryContext<Context>, env: Env): Promise<void> {
  try {
    const callbackData = ctx.callbackQuery.data;

    if (!callbackData) {
      await ctx.answerCallbackQuery('Invalid action');
      return;
    }

    // Handle "noop" (page indicator button)
    if (callbackData === 'noop') {
      await ctx.answerCallbackQuery();
      return;
    }

    // Handle time selection (format: "time:9")
    if (callbackData.startsWith('time:')) {
      const hour = parseInt(callbackData.split(':')[1], 10);
      if (!isNaN(hour)) {
        await handleTimeSelection(ctx, env, hour);
        return;
      }
    }

    // Decode callback data for other actions
    const action = decodeCallback(callbackData);

    if (!action) {
      await ctx.answerCallbackQuery('Invalid action');
      return;
    }

    // Handle different actions
    if (action.type === 'page') {
      await handlePageNavigation(ctx, action.page);
    } else if (action.type === 'fetch_current') {
      await handleFetchCurrent(ctx);
    }
  } catch (error) {
    console.error('Error in callback query handler:', error);
    await ctx.answerCallbackQuery('An error occurred. Please try again.');
  }
}

/**
 * Handle page navigation (Next/Prev buttons)
 */
async function handlePageNavigation(ctx: CallbackQueryContext<Context>, page: number): Promise<void> {
  try {
    // Get stories from cache
    const stories = await fetchCurrentStories(false);

    if (stories.length === 0) {
      await ctx.answerCallbackQuery('No stories available');
      return;
    }

    // Format message for requested page
    const message = formatStories(stories, page);
    const totalPages = getTotalPages(stories.length);
    const keyboard = createPaginationKeyboard(page, totalPages);

    // Edit the message with new page
    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });

    await ctx.answerCallbackQuery(`Page ${page + 1}/${totalPages}`);
  } catch (error) {
    console.error('Error navigating to page:', error);
    await ctx.answerCallbackQuery('Failed to load page');
  }
}

/**
 * Handle "Fetch Current" button
 */
async function handleFetchCurrent(ctx: CallbackQueryContext<Context>): Promise<void> {
  try {
    // Show loading indicator
    await ctx.answerCallbackQuery('Fetching latest stories...');

    // Fetch fresh stories from API
    const stories = await fetchCurrentStories(true); // Force refresh

    if (stories.length === 0) {
      await ctx.editMessageText('Sorry, could not fetch stories at the moment. Please try again later.');
      return;
    }

    // Send first page of fresh stories
    const message = formatStories(stories, 0);
    const totalPages = getTotalPages(stories.length);
    const keyboard = createPaginationKeyboard(0, totalPages);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error('Error fetching current stories:', error);
    await ctx.answerCallbackQuery('Failed to fetch stories');
  }
}
