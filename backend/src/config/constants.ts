export const GAME_CONSTANTS = {
  // Real-time Crash loop settings
  CRASH_TICK_RATE_MS: 100, // Update multiplier every 100ms (10 ticks/sec)
  CRASH_GROWTH_RATE: 0.006, // Exponential multiplier growth rate per tick (0.6%)
  COUNTDOWN_DURATION: 5, // 5 seconds countdown before round starts

  // Economic configuration
  INITIAL_COINS: parseInt(process.env.INITIAL_COINS || '1000', 10),
  DEFAULT_COMMISSION: parseFloat(process.env.DEFAULT_COMMISSION || '10'), // Percentage
};
