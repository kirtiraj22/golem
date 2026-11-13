import { PersistedStorage } from "./persisted-storage";

type Progress = {
  stats?: {
    name: string;
    level: number;
    health: number;
  };
  checkpoint?: string;
  completedLevels?: Array<string>;
  hasCompletedTutorial?: boolean;
};

export class ProgressEntry {
  storage: PersistedStorage;

  constructor() {
    this.storage = new PersistedStorage({ name: "progress" });
  }

  save({
    stats = this.get().stats,
    checkpoint = this.get().checkpoint,
    completedLevels = this.get().completedLevels,
    hasCompletedTutorial = this.get().hasCompletedTutorial,
  }: Progress = {}) {
    const currentProgress = this.get();

    this.storage.save({
      ...currentProgress,
      ...(stats && { stats }),
      ...(checkpoint && { checkpoint }),
      ...(completedLevels && { completedLevels }),
      ...(hasCompletedTutorial && { hasCompletedTutorial }),
    });
  }

  get() {
    return this.storage.get();
  }

  reset() {
    this.storage.save({
      stats: {
        name: "Peter",
        health: 100,
        level: 1,
      },
      checkpoint: "",
      completedLevels: [],
      hasCompletedTutorial: true,
    });
  }
}

const progressEntry = new ProgressEntry();

export default progressEntry;
