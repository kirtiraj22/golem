export class PlacementTypeAnimationFrames {
  framesSequence: string[];
  changeOnFrameCount: number;
  showFrame: number;
  tickCounter: number;

  constructor(framesSequence = ["0x1"], changeOnFrameCount = 30) {
    this.framesSequence = framesSequence;
    this.changeOnFrameCount = changeOnFrameCount;
    this.showFrame = 0;
    this.tickCounter = 0;
  }

  get activeFrame() {
    return this.framesSequence[this.showFrame];
  }

  tick() {
    this.tickCounter += 1;

    if (this.tickCounter > this.changeOnFrameCount) {
      this.tickCounter = 0;
      this.showFrame += 1;

      if (this.showFrame === this.framesSequence.length) {
        this.showFrame = 0;
      }
    }
  }
}
