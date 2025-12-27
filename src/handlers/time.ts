import type { Context } from 'grammy';
import type { Env } from '../types';
import { setPreferredDeliveryHour, trackUserActivity } from '../lib/storage';
import { InlineKeyboard } from 'grammy';

/**
 * Convert CET hour to UTC
 * Note: This uses CET (UTC+1) winter time. Adjust for CEST (UTC+2) in summer if needed.
 */
function cetToUtc(cetHour: number): number {
  // CET is UTC+1, so we subtract 1
  const utcHour = cetHour - 1;
  // Handle wraparound (e.g., 0 CET = 23 UTC previous day)
  return utcHour < 0 ? utcHour + 24 : utcHour;
}

/**
 * Handle /time command - allows users to set their preferred delivery time
 */
export async function handleTimeCommand(ctx: Context, env: Env): Promise<void> {
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

    // Create time selection keyboard (CET times)
    const keyboard = new InlineKeyboard();

    // Time slots from 5am to 11pm in CET
    const times = [
      { label: '5:00 AM', hour: 5 },
      { label: '6:00 AM', hour: 6 },
      { label: '7:00 AM', hour: 7 },
      { label: '8:00 AM', hour: 8 },
      { label: '9:00 AM ⭐', hour: 9 }, // Default
      { label: '10:00 AM', hour: 10 },
      { label: '11:00 AM', hour: 11 },
      { label: '12:00 PM', hour: 12 },
      { label: '1:00 PM', hour: 13 },
      { label: '2:00 PM', hour: 14 },
      { label: '3:00 PM', hour: 15 },
      { label: '4:00 PM', hour: 16 },
      { label: '5:00 PM', hour: 17 },
      { label: '6:00 PM', hour: 18 },
      { label: '7:00 PM', hour: 19 },
      { label: '8:00 PM', hour: 20 },
      { label: '9:00 PM', hour: 21 },
      { label: '10:00 PM', hour: 22 },
      { label: '11:00 PM', hour: 23 },
    ];

    // Build keyboard (3 buttons per row)
    for (let i = 0; i < times.length; i += 3) {
      const row = times.slice(i, i + 3);
      row.forEach((time) => {
        keyboard.text(time.label, `time:${time.hour}`);
      });
      keyboard.row();
    }

    const message = `⏰ *Choose Your Delivery Time*

Select when you'd like to receive daily Hacker News stories \\(CET timezone\\):

⭐ Default: 9:00 AM CET

_Note: Stories are delivered once daily at your chosen time\\._`;

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error('Error in /time command:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

/**
 * Handle time selection callback
 */
export async function handleTimeSelection(
  ctx: Context,
  env: Env,
  cetHour: number
): Promise<void> {
  try {
    const chatId = ctx.chat?.id;

    if (!chatId) {
      console.error('No chat ID found in context');
      return;
    }

    // Convert CET to UTC
    const utcHour = cetToUtc(cetHour);

    // Save preference
    await setPreferredDeliveryHour(env, chatId, utcHour);

    // Format time for display
    const timeStr = cetHour === 9 ? `${cetHour}:00 AM CET ⭐` : `${cetHour >= 12 ? cetHour === 12 ? '12' : cetHour - 12 : cetHour}:00 ${cetHour >= 12 ? 'PM' : 'AM'} CET`;

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `✅ *Delivery Time Updated*

You'll now receive daily Hacker News stories at *${timeStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}*

You can change this anytime with /time`,
      { parse_mode: 'MarkdownV2' }
    );

    console.log(`User ${chatId} set delivery time to ${cetHour}:00 CET (${utcHour}:00 UTC)`);
  } catch (error) {
    console.error('Error handling time selection:', error);
    await ctx.answerCallbackQuery('An error occurred. Please try again.');
  }
}
