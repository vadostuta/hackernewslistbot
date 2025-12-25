// Cloudflare Workers environment bindings
export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  // Optional: KV namespace for storing active users
  USERS_KV?: KVNamespace;
  // Optional: Admin chat ID for stats access (comma-separated for multiple admins)
  ADMIN_CHAT_ID?: string;
}

// Hacker News story type (from API)
export interface HNStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  descendants?: number;
  time: number;
  type: 'story';
}

// Paginated stories response
export interface PaginatedStories {
  stories: HNStory[];
  page: number;
  totalPages: number;
  itemsPerPage: number;
}

// Callback data types
export type CallbackData =
  | { type: 'page'; page: number }
  | { type: 'fetch_current' };

// User activity tracking
export interface UserActivity {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  lastSeen: number; // Unix timestamp
  firstSeen: number; // Unix timestamp
  interactionCount: number;
}

// User statistics
export interface UserStats {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
}
