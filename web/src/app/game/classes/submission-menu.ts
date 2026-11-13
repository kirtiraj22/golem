import { actions } from "./battle-state";

export class SubmissionMenu {
  caster: any;
  onComplete: any;
  enemy: any;

  constructor({ caster, enemy, onComplete }) {
    this.caster = caster;
    this.enemy = enemy;
    this.onComplete = onComplete;
  }

  decide() {
    this.onComplete({
      action: actions[this.caster.actions[0]],
      target: this.enemy,
    });
  }

  init() {
    this.decide();
  }
}
