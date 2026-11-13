export class GameLoop {
  onStep: (param: any) => void;
  rafCallback: null;
  hasStopped: boolean;
  isPaused: boolean;

  constructor(onStep) {
    this.onStep = onStep;
    this.rafCallback = null;
    this.hasStopped = false;
    this.isPaused = false;
    this.start();
  }

  start() {
    let previousMs;
    const step = 1 / 60;
    const tick = (timestampMs) => {
      if (this.hasStopped) {
        return;
      }
      if (previousMs === undefined) {
        previousMs = timestampMs;
      }
      let delta = (timestampMs - previousMs) / 1000;
      while (delta >= step) {
        if (!this.isPaused) {
          this.onStep();
        }
        delta -= step;
      }
      previousMs = timestampMs - delta * 1000;
      //Recapture the callback to be able to shut it off
      this.rafCallback = requestAnimationFrame(tick);
    };

    // Initial kickoff
    this.rafCallback = requestAnimationFrame(tick);
  }

  stop() {
    this.hasStopped = true;
    cancelAnimationFrame(this.rafCallback);
  }

  pause() {
    this.isPaused = true;
  }

  continue() {
    this.isPaused = false;
  }
}
