export interface SaintOfTheDay {
  name: string;
  feast: string;
  description: string;
  yearOfDeath?: string;
}

export interface HistoricalEvent {
  year: string;
  event: string;
  description: string;
}

export interface SaintsAndHistoryResult {
  saintOfTheDay: SaintOfTheDay | null; // Can be null if it's a Feria
  historicalEvents: HistoricalEvent[];
}
