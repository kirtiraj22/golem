export class PersistedStorage {
  name: string;

  constructor({ name }) {
    this.name = name;
  }

  get() {
    if (typeof window !== "undefined") {
      const storedEntries = window.localStorage.getItem(this.name);
      return storedEntries ? JSON.parse(storedEntries) : [];
    }
    return [];
  }

  save(entries: any) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(this.name, JSON.stringify(entries));
    }
  }
}
