import { Howl } from "howler";

export enum SFX {
  COLLECT = "COLLECT",
  WIN = "WIN",
  TELEPORT = "TELEPORT",
  DAMAGE = "DAMAGE",
  GAME_OVER = "GAME_OVER",
}

const SFX_FILES = {
  [SFX.COLLECT]: "/sfx/collect.mp3",
  [SFX.WIN]: "/sfx/win.mp3",
  [SFX.TELEPORT]: "/sfx/teleport.mp3",
  [SFX.DAMAGE]: "/sfx/damage.mp3",
  [SFX.GAME_OVER]: "/sfx/game-over.mp3",
};

export class Sounds {
  sfxVolume: number;
  howls: any;

  constructor() {
    this.howls = {};
    this.sfxVolume = 0.5;
  }

  init() {
    Object.keys(SFX_FILES).forEach((key) => {
      const file = SFX_FILES[key as SFX];

      this.howls[key] = new Howl({
        src: [file],
      });
    });
  }

  playMusic() {}

  playSequenceSFX(SFXs: Array<keyof typeof SFX>) {
    const soundQueue = SFXs.slice();

    const playNextSound = () => {
      if (soundQueue.length === 0) {
        return;
      }

      const key = soundQueue.shift();
      const howl = this.howls[key as keyof typeof SFX];
      howl.play();

      howl.on("end", playNextSound);
    };

    playNextSound();
  }

  playSFX(key: SFX) {
    const howl = this.howls[key];
    // howl.value(this.sfxVolume);
    howl.play();
  }
}

const soundManager = new Sounds();

export default soundManager;
