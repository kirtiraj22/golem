export class Inventory {
  private inventoryMap: Map<K, V>;

  constructor() {
    this.inventoryMap = new Map();
  }

  has(key: any) {
    return Boolean(this.inventoryMap.has(key));
  }

  add(key: any) {
    if (!key) {
      console.warn("WARNING! Trying to add falsy key to inventory", key);
      return;
    }
    this.inventoryMap.set(key, true);
  }

  clear() {
    this.inventoryMap = new Map();
  }
}
