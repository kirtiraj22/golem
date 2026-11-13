export class TurnCycle {
  battle: any;
  onNewEvent: any;
  currentTurn: string;

  constructor({ battle, onNewEvent }: any) {
    this.battle = battle;
    this.onNewEvent = onNewEvent;
    this.currentTurn = "PLAYER";
  }

  async turn() {
    const caster = this.battle.combatans["PLAYER"];
    const enemy = this.battle.combatans["OPPONENT"];

    const submission = await this.onNewEvent({
      type: "submissionMenu",
      caster,
      enemy,
    });
    console.log("message", submission?.action?.success[0]);

    // await this.onNewEvent();

    // const events = submission?.action?.success;

    // console.log("events", events);

    // events?.forEach(async (event) => {
    //   const newEvent = {
    //     submission,
    //     action: submission.action,
    //     caster,
    //     target: submission.target,
    //     ...event,
    //   };

    //   await this.onNewEvent(newEvent);
    // });

    // for (let i = 0; i < events.length; i++) {
    //   const event = {
    //     submission,
    //     action: submission.action,
    //     caster,
    //     target: submission.target,
    //     ...events[i],
    //   };

    //   console.log("message", events[i], i);
    //   await this.onNewEvent(event);
    // }

    this.currentTurn = this.currentTurn === "PLAYER" ? "OPPONENT" : "PLAYER";
    // this.turn();
    // console.log("switch turn");
  }

  async init() {
    // await this.onNewEvent({
    //   type: "message",
    //   text: "The battle is starting!",
    // });

    this.turn();
  }
}
