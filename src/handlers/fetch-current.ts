import type { HNStory } from '../types';
import { fetchTopStories } from '../lib/hn-api';
import { getCachedStories, setCachedStories } from '../lib/storage';

/**
 * Fetch current top stories (from cache or API)
 * This is used by both the /start command and "Fetch Current" button
 */
export async function fetchCurrentStories(forceRefresh: boolean = false): Promise<HNStory[]> {
  // Try to get from cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedStories();
    if (cached && cached.length > 0) {
      console.log('Using cached stories');
      return cached;
    }
  }

  // Fetch fresh data from HN API
  console.log('Fetching fresh stories from HN API');
  const stories = await fetchTopStories(30);

  // Update cache
  if (stories.length > 0) {
    await setCachedStories(stories);
  }

  return stories;
}
