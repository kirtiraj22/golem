import { PersistedStorage } from "./persisted-storage";

type Progress = {
  stats?: {
    name: string;
    level: number;
    health: number;
  };
  checkpoint?: string;
  completedLevels?: Array<string>;
};

export class DistortionEntry {
  storage: PersistedStorage;

  constructor() {
    this.storage = new PersistedStorage({ name: "distortions" });
  }

  save(distortions) {
    this.storage.save(distortions);
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
    });
  }
}

const distortionEntry = new DistortionEntry();

export default distortionEntry;
