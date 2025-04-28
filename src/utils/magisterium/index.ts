// Re-export functions from individual service files

export * from '../../types/magisterium'; // Export common types

// Export functions from liturgicalService
// Export getDailyMassReadings instead of getVerseOfTheDay
export { getDailyMassReadings, getLiturgicalEvents } from './liturgicalService';

// Export functions from prayersService (assuming it exists or will be created)
// export * from './prayersService';

// Export functions from saintsHistoryService
export { getSaintsAndHistory } from '../../services/saints/saintsHistoryService';

// You might also directly export the proxy request function if needed elsewhere,
// though using specific service functions is generally cleaner.
// export { proxyMagisteriumRequest } from './proxyService';
