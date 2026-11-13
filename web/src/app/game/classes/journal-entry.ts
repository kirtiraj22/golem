import { PersistedStorage } from "./persisted-storage";

export class JournalEntry {
  lastEntryDate: any;
  storage: PersistedStorage;

  constructor() {
    this.lastEntryDate = new Date();
    this.storage = new PersistedStorage({ name: "journals" });
  }

  hasWroteToday() {
    const today = new Date();

    return (
      this.storage.get().length > 0 &&
      this.lastEntryDate.getDate() === today.getDate() &&
      this.lastEntryDate.getMonth() === today.getMonth() &&
      this.lastEntryDate.getFullYear() === today.getFullYear()
    );
  }

  save(journal: string) {
    const today = new Date();

    const entries = [
      ...this.storage.get(),
      { title: today, content: journal, date: today },
    ];

    this.storage.save(entries);

    this.lastEntryDate = today; // Update last entry date
  }
}

const journalEntry = new JournalEntry();

export default journalEntry;
