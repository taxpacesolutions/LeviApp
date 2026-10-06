export interface CategoryInfo {
  key: string;
  label: string;
  emoji: string;
}

/** Shown in the "+ Earn Bucks" sheet. Keys are stored on transactions. */
export const EARN_CATEGORIES: CategoryInfo[] = [
  { key: "schoolwork", label: "Finished schoolwork", emoji: "✏️" },
  { key: "reading", label: "Reading", emoji: "📚" },
  { key: "chores", label: "Chores", emoji: "🧹" },
  { key: "helping", label: "Helped family", emoji: "🤝" },
  { key: "attitude", label: "Good attitude", emoji: "😊" },
  { key: "morning_routine", label: "Morning routine", emoji: "☀️" },
  { key: "bedtime_routine", label: "Bedtime routine", emoji: "🌙" },
  { key: "extra_effort", label: "Extra effort", emoji: "💪" },
  { key: "special", label: "Special achievement", emoji: "🏆" },
  { key: "bonus", label: "Bonus", emoji: "🎉" },
  { key: "custom", label: "Custom", emoji: "✨" },
];

/** Shown in the "− Deduct Bucks" sheet. */
export const DEDUCT_CATEGORIES: (CategoryInfo & { adjustment?: boolean })[] = [
  { key: "purchase", label: "Spent on something", emoji: "🛒" },
  { key: "reward", label: "Reward", emoji: "🎁" },
  { key: "correction", label: "Fix a mistake", emoji: "🛠️", adjustment: true },
  { key: "other", label: "Other", emoji: "➖" },
];

const OTHER: CategoryInfo[] = [
  { key: "savings", label: "Savings", emoji: "🐷" },
  { key: "goal", label: "Goal", emoji: "🎯" },
  { key: "savings_bonus", label: "Savings Bonus", emoji: "🐷" },
  { key: "adjustment", label: "Adjustment", emoji: "🛠️" },
];

const ALL = new Map([...EARN_CATEGORIES, ...DEDUCT_CATEGORIES, ...OTHER].map((c) => [c.key, c]));

export function categoryInfo(key: string | null | undefined): CategoryInfo {
  if (!key) return { key: "", label: "Other", emoji: "⭐" };
  return ALL.get(key) ?? { key, label: key.replace(/_/g, " "), emoji: "⭐" };
}

export const STREAKABLE = EARN_CATEGORIES.filter((c) => !["custom", "bonus", "special"].includes(c.key));

export const EMOJI_CHOICES = [
  "🎁", "🍨", "🎬", "🎮", "🍕", "🧸", "🎡", "💵", "📱", "🏀", "⚽", "🚲",
  "🧱", "🦖", "🚀", "🎨", "📚", "🎧", "🍿", "🏖️", "🎢", "🐶", "🛹", "⭐",
  "🎯", "🏆", "💎", "🔥", "🌟", "🐷", "🦸", "✏️", "🤝", "💰", "🏦", "🎉",
];

/** How each kind of badge is earned (shown in Parent Mode). */
export const RULE_LABELS: Record<string, string> = {
  lifetime_earned: "Total Bucks earned reaches…",
  savings_balance: "Savings balance reaches…",
  category_count: "Earned for a category this many times…",
  streak_days: "Streak reaches this many days…",
  rewards_redeemed: "Rewards redeemed reaches…",
  goals_completed: "Goals completed reaches…",
  manual: "Given by a parent",
};
