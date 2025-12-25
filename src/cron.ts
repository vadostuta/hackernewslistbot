import type { Env } from './types';
import { createBot } from './lib/bot';
import { fetchTopStories } from './lib/hn-api';
import { setCachedStories, getActiveUsers, getUserStats } from './lib/storage';
import { formatStories, createPaginationKeyboard, getTotalPages } from './lib/telegram';
import { sleep } from './lib/utils';

/**
 * Cron handler for daily story fetching
 * Triggered at 7:00 UTC (8:00 AM CET in winter)
 */
export async function handleScheduled(env: Env): Promise<void> {
  console.log('🕐 Cron job started at:', new Date().toISOString());

  try {
    // Step 1: Fetch top 30 stories from HN
    console.log('Fetching top 30 stories from Hacker News...');
    const stories = await fetchTopStories(30);

    if (stories.length === 0) {
      console.error('No stories fetched, aborting cron job');
      return;
    }

    console.log(`✅ Fetched ${stories.length} stories`);

    // Step 2: Cache the stories for the day
    await setCachedStories(stories);
    console.log('✅ Stories cached');

    // Step 3: Get list of active users and log statistics
    const users = await getActiveUsers(env);

    // Log user statistics if KV is configured
    if (env.USERS_KV) {
      const stats = await getUserStats(env);
      console.log(`📊 User Statistics:`);
      console.log(`   Total Users: ${stats.totalUsers}`);
      console.log(`   Active Today: ${stats.activeToday}`);
      console.log(`   Active This Week: ${stats.activeThisWeek}`);
      console.log(`   Active This Month: ${stats.activeThisMonth}`);
    }

    if (users.length === 0) {
      console.log('No active users to notify');
      return;
    }

    console.log(`📤 Sending stories to ${users.length} users...`);

    // Step 4: Send stories to each user
    const bot = createBot(env);
    let successCount = 0;
    let failCount = 0;

    for (const chatId of users) {
      try {
        // Format message
        const message = formatStories(stories, 0); // First page
        const totalPages = getTotalPages(stories.length);
        const keyboard = createPaginationKeyboard(0, totalPages);

        // Send message
        await bot.api.sendMessage(chatId, message, {
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard,
          disable_web_page_preview: true,
        });

        successCount++;

        // Rate limiting: Telegram allows 30 msg/sec
        // Add 50ms delay to be safe (20 msg/sec)
        await sleep(50);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to send to user ${chatId}:`, error);
      }
    }

    console.log(`✅ Cron job completed: ${successCount} sent, ${failCount} failed`);
  } catch (error) {
    console.error('❌ Cron job error:', error);
  }
}
