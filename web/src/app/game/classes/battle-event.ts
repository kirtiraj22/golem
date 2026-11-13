import { SubmissionMenu } from "./submission-menu";

export class BattleEvent {
  battle: any;
  event: any;

  constructor(event, battle) {
    this.event = event;
    this.battle = battle;
  }

  message(resolve) {
    // console.log("A Message | ", this.event);
  }

  submissionMenu(resolve) {
    const menu = new SubmissionMenu({
      caster: this.event.caster,
      enemy: this.event.enemy,
      onComplete: (submission) => {
        /**
         * Resolve what move to use, what to use it on
         */
        resolve(submission);
      },
    });

    // console.log("menu", menu);
    menu.init();
  }

  init(resolve) {
    /**
     * this invocke method that goes inside BattleEvent
     * { type: "submissionMenu" } => this.submissionMenu()
     * { type: "textMessage" } => this.textMessage()
     */
    this[this.event.type](resolve);
  }
}
