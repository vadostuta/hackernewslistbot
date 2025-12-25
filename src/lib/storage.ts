import type { HNStory, Env, UserActivity, UserStats } from '../types';
import { getTodayKey } from './utils';

const CACHE_KEY_PREFIX = 'hn:stories:';
const USERS_KEY = 'users:active';
const USER_ACTIVITY_PREFIX = 'user:activity:';
const CACHE_TTL_SECONDS = 86400; // 24 hours

/**
 * Get cached stories for today using Workers Cache API
 */
export async function getCachedStories(): Promise<HNStory[] | null> {
  try {
    const cache = caches.default;
    const cacheKey = `${CACHE_KEY_PREFIX}${getTodayKey()}`;
    const cacheUrl = new URL(`https://cache.local/${cacheKey}`);

    const cached = await cache.match(cacheUrl);

    if (!cached) {
      console.log('Cache miss for stories');
      return null;
    }

    const stories: HNStory[] = await cached.json();
    console.log(`Cache hit: ${stories.length} stories`);
    return stories;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Store stories in Workers Cache API with 24h TTL
 */
export async function setCachedStories(stories: HNStory[]): Promise<void> {
  try {
    const cache = caches.default;
    const cacheKey = `${CACHE_KEY_PREFIX}${getTodayKey()}`;
    const cacheUrl = new URL(`https://cache.local/${cacheKey}`);

    const response = new Response(JSON.stringify(stories), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${CACHE_TTL_SECONDS}`,
      },
    });

    await cache.put(cacheUrl, response);
    console.log(`Cached ${stories.length} stories`);
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Get list of active users from KV
 * Returns empty array if KV is not configured
 */
export async function getActiveUsers(env: Env): Promise<number[]> {
  if (!env.USERS_KV) {
    console.log('KV not configured, returning empty user list');
    return [];
  }

  try {
    const usersJson = await env.USERS_KV.get(USERS_KEY);

    if (!usersJson) {
      return [];
    }

    const users: number[] = JSON.parse(usersJson);
    console.log(`Found ${users.length} active users`);
    return users;
  } catch (error) {
    console.error('Error reading active users from KV:', error);
    return [];
  }
}

/**
 * Add a user to the active users list in KV
 */
export async function addActiveUser(env: Env, chatId: number): Promise<void> {
  if (!env.USERS_KV) {
    console.log('KV not configured, skipping user storage');
    return;
  }

  try {
    const users = await getActiveUsers(env);

    // Add user if not already in list
    if (!users.includes(chatId)) {
      users.push(chatId);
      await env.USERS_KV.put(USERS_KEY, JSON.stringify(users));
      console.log(`Added user ${chatId} to active list (total: ${users.length})`);
    } else {
      console.log(`User ${chatId} already in active list`);
    }
  } catch (error) {
    console.error('Error adding active user to KV:', error);
  }
}

/**
 * Track user activity (updates or creates user activity record)
 */
export async function trackUserActivity(
  env: Env,
  chatId: number,
  username?: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  if (!env.USERS_KV) {
    console.log('KV not configured, skipping activity tracking');
    return;
  }

  try {
    const key = `${USER_ACTIVITY_PREFIX}${chatId}`;
    const now = Date.now();

    // Get existing activity or create new
    const existingJson = await env.USERS_KV.get(key);
    let activity: UserActivity;

    if (existingJson) {
      activity = JSON.parse(existingJson);
      activity.lastSeen = now;
      activity.interactionCount += 1;
      // Update metadata if provided
      if (username) activity.username = username;
      if (firstName) activity.firstName = firstName;
      if (lastName) activity.lastName = lastName;
    } else {
      // New user
      activity = {
        chatId,
        username,
        firstName,
        lastName,
        lastSeen: now,
        firstSeen: now,
        interactionCount: 1,
      };
    }

    await env.USERS_KV.put(key, JSON.stringify(activity));
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
}

/**
 * Get all users' activity data
 */
export async function getAllUsersActivity(env: Env): Promise<UserActivity[]> {
  if (!env.USERS_KV) {
    return [];
  }

  try {
    const users = await getActiveUsers(env);
    const activities: UserActivity[] = [];

    for (const chatId of users) {
      const key = `${USER_ACTIVITY_PREFIX}${chatId}`;
      const activityJson = await env.USERS_KV.get(key);

      if (activityJson) {
        activities.push(JSON.parse(activityJson));
      }
    }

    return activities;
  } catch (error) {
    console.error('Error getting users activity:', error);
    return [];
  }
}

/**
 * Get user statistics (total, active today, this week, this month)
 */
export async function getUserStats(env: Env): Promise<UserStats> {
  const activities = await getAllUsersActivity(env);

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const stats: UserStats = {
    totalUsers: activities.length,
    activeToday: activities.filter((a) => a.lastSeen >= oneDayAgo).length,
    activeThisWeek: activities.filter((a) => a.lastSeen >= oneWeekAgo).length,
    activeThisMonth: activities.filter((a) => a.lastSeen >= oneMonthAgo).length,
  };

  return stats;
}

/**
 * Check if a chat ID is an admin
 */
export function isAdmin(env: Env, chatId: number): boolean {
  if (!env.ADMIN_CHAT_ID) {
    return false;
  }

  const adminIds = env.ADMIN_CHAT_ID.split(',').map((id) => parseInt(id.trim(), 10));
  return adminIds.includes(chatId);
}
