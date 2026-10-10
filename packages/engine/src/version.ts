/**
 * Bump when an engine change makes old action logs replay differently (wall generation, action shapes, RuleSet
 * fields, rules or scoring): offline saves with another version are discarded and running online games are aborted
 * (unrated) on the next game-server start instead of being finished under different rules.
 */
export const ENGINE_VERSION = 2; // 2: ChaCha20 wall RNG
