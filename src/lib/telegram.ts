import { InlineKeyboard } from 'grammy';
import type { HNStory } from '../types';
import { escapeMarkdown, formatDate, encodePageCallback, FETCH_CURRENT_CALLBACK } from './utils';

const ITEMS_PER_PAGE = 10;
const HN_BASE_URL = 'https://news.ycombinator.com/item?id=';

/**
 * Format stories into a Telegram message with pagination
 */
export function formatStories(
  stories: HNStory[],
  page: number = 0,
  itemsPerPage: number = ITEMS_PER_PAGE
): string {
  const start = page * itemsPerPage;
  const pageStories = stories.slice(start, start + itemsPerPage);

  let message = `📰 *Hacker News Top Stories*\n`;
  message += `📅 ${formatDate(new Date())}\n\n`;

  if (pageStories.length === 0) {
    message += 'No stories available at the moment.';
    return message;
  }

  pageStories.forEach((story, index) => {
    const position = start + index + 1;

    // Use story URL if available, otherwise link to HN discussion
    const storyUrl = story.url || `${HN_BASE_URL}${story.id}`;
    const hnDiscussionUrl = `${HN_BASE_URL}${story.id}`;

    // Title with link
    message += `*${position}\\.* [${escapeMarkdown(story.title)}](${storyUrl})\n`;

    // Story metadata
    message += `   👍 ${story.score} points`;

    if (story.descendants !== undefined && story.descendants > 0) {
      message += ` \\| 💬 [${story.descendants} comments](${hnDiscussionUrl})`;
    } else {
      message += ` \\| 💬 [discuss](${hnDiscussionUrl})`;
    }

    if (story.by) {
      message += ` \\| 👤 ${escapeMarkdown(story.by)}`;
    }

    message += '\n\n';
  });

  return message.trim();
}

/**
 * Create inline keyboard with pagination controls
 */
export function createPaginationKeyboard(
  currentPage: number,
  totalPages: number
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Row 1: Pagination buttons
  const buttons = [];

  if (currentPage > 0) {
    buttons.push({ text: '◀️ Prev', callback_data: encodePageCallback(currentPage - 1) });
  }

  // Page indicator (non-clickable, but grammY requires callback_data)
  buttons.push({
    text: `Page ${currentPage + 1}/${totalPages}`,
    callback_data: 'noop',
  });

  if (currentPage < totalPages - 1) {
    buttons.push({ text: 'Next ▶️', callback_data: encodePageCallback(currentPage + 1) });
  }

  // Add pagination buttons to first row
  buttons.forEach((btn) => keyboard.text(btn.text, btn.callback_data));

  // Row 2: Fetch current button
  keyboard.row();
  keyboard.text('🔄 Fetch Current', FETCH_CURRENT_CALLBACK);

  return keyboard;
}

/**
 * Calculate total pages for given number of stories
 */
export function getTotalPages(storiesCount: number, itemsPerPage: number = ITEMS_PER_PAGE): number {
  return Math.ceil(storiesCount / itemsPerPage);
}

/**
 * Create welcome message for /start command
 */
export function getWelcomeMessage(): string {
  return `👋 *Welcome to Hacker News Top Bot\\!*

I'll fetch the top 30 stories from Hacker News and send them to you every day at 8:00 AM CET\\.

You can also click the *🔄 Fetch Current* button anytime to get the latest stories on\\-demand\\.

Use /start anytime to refresh the stories\\.

Let's get started\\!`;
}
