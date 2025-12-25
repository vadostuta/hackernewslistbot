import { z } from 'zod';
import type { HNStory } from '../types';

// Zod schema for validating HN story data
const HNStorySchema = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string().url().optional(),
  score: z.number(),
  by: z.string(),
  descendants: z.number().optional(),
  time: z.number(),
  type: z.literal('story'),
});

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

/**
 * Fetch a single story by ID with timeout
 */
async function fetchStory(id: number): Promise<HNStory | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(`${HN_API_BASE}/item/${id}.json`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Failed to fetch story ${id}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Validate with zod
    const parsed = HNStorySchema.safeParse(data);

    if (!parsed.success) {
      console.error(`Invalid story data for ${id}:`, parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error(`Error fetching story ${id}:`, error);
    return null;
  }
}

/**
 * Fetch top N stories from Hacker News
 * Returns array of valid stories (filters out nulls/invalid data)
 */
export async function fetchTopStories(limit: number = 30): Promise<HNStory[]> {
  try {
    // Step 1: Fetch top story IDs
    const response = await fetch(`${HN_API_BASE}/topstories.json`);

    if (!response.ok) {
      throw new Error(`Failed to fetch top stories: ${response.statusText}`);
    }

    const ids: number[] = await response.json();

    // Step 2: Fetch story details concurrently
    const topIds = ids.slice(0, limit);
    console.log(`Fetching ${topIds.length} stories from HN...`);

    const storyPromises = topIds.map((id) =>
      fetchStory(id).catch((err) => {
        console.error(`Failed to fetch story ${id}:`, err);
        return null;
      })
    );

    const stories = await Promise.all(storyPromises);

    // Step 3: Filter out nulls and invalid stories
    const validStories = stories.filter((s): s is HNStory => s !== null);

    console.log(`Successfully fetched ${validStories.length}/${topIds.length} stories`);

    return validStories;
  } catch (error) {
    console.error('Error fetching top stories:', error);
    throw error;
  }
}
