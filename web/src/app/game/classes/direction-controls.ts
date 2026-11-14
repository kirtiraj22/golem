import { Direction } from "~/constants/helpers";

export class DirectionControls {
  directionKeys: {
    ArrowUp: Direction;
    ArrowLeft: Direction;
    ArrowRight: Direction;
    ArrowDown: Direction;
    w: Direction;
    a: Direction;
    d: Direction;
    s: Direction;
  };
  heldDirections: Direction[];
  directionKeyDownHandler: (event: KeyboardEvent) => void;
  directionKeyUpHandler: (event: KeyboardEvent) => void;
  enabled: boolean;
  constructor() {
    this.directionKeys = {
      ArrowUp: Direction.Top,
      ArrowLeft: Direction.Left,
      ArrowRight: Direction.Right,
      ArrowDown: Direction.Bottom,
      w: Direction.Top,
      a: Direction.Left,
      d: Direction.Right,
      s: Direction.Bottom,
    };
    this.heldDirections = [];
    this.enabled = true;
    this.directionKeyDownHandler = (event) => {
      if (
        !this.enabled ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        this.isTypingTarget(event.target)
      ) {
        return;
      }

      const direction =
        this.directionKeys[event.key as keyof typeof this.directionKeys];

      if (direction && this.heldDirections.indexOf(direction) === -1) {
        this.heldDirections.unshift(direction);
      }
    };

    this.directionKeyUpHandler = (event) => {
      const direction =
        this.directionKeys[event.key as keyof typeof this.directionKeys];

      if (!direction) {
        return;
      }

      const index = this.heldDirections.indexOf(direction);

      if (index > -1) {
        this.heldDirections.splice(index, 1);
      }
    };

    document.addEventListener("keydown", this.directionKeyDownHandler);
    document.addEventListener("keyup", this.directionKeyUpHandler);
  }

  isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;

    if (!element) {
      return false;
    }

    return (
      element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.tagName === "SELECT" ||
      element.isContentEditable
    );
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!enabled) {
      this.heldDirections = [];
    }
  }

  get direction() {
    return this.heldDirections[0];
  }

  unbind() {
    document.removeEventListener("keydown", this.directionKeyDownHandler);
    document.removeEventListener("keyup", this.directionKeyUpHandler);
  }
}
