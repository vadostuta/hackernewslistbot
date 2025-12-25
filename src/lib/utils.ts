import type { CallbackData } from '../types';

// Callback data constants
export const FETCH_CURRENT_CALLBACK = 'fc';

/**
 * Encode page number into callback data
 * Format: "p:0", "p:1", "p:2" (3-4 bytes)
 */
export function encodePageCallback(page: number): string {
  return `p:${page}`;
}

/**
 * Decode callback data to determine action
 */
export function decodeCallback(data: string): CallbackData | null {
  // Check for fetch current
  if (data === FETCH_CURRENT_CALLBACK) {
    return { type: 'fetch_current' };
  }

  // Check for page navigation
  const pageMatch = data.match(/^p:(\d+)$/);
  if (pageMatch) {
    return { type: 'page', page: parseInt(pageMatch[1], 10) };
  }

  return null;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Escape markdown special characters for Telegram
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
