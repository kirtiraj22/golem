export class Combatan {
  battle: any;

  constructor(config, battle) {
    Object.keys(config).forEach((key) => {
      this[key] = config[key];
    });

    this.battle = battle;
  }

  init() {}
}
