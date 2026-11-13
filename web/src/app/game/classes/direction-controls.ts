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
  heldDirections: never[];
  directionKeyDownHandler: (event: any) => void;
  directionKeyUpHandler: (event: any) => void;
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
    this.directionKeyDownHandler = (event) => {
      const direction = this.directionKeys[event.key];

      if (direction && this.heldDirections.indexOf(direction) === -1) {
        this.heldDirections.unshift(direction);
      }
    };

    this.directionKeyUpHandler = (event) => {
      const direction = this.directionKeys[event.key];
      const index = this.heldDirections.indexOf(direction);

      if (index > -1) {
        this.heldDirections.splice(index, 1);
      }
    };

    document.addEventListener("keydown", this.directionKeyDownHandler);
    document.addEventListener("keyup", this.directionKeyUpHandler);
  }

  get direction() {
    return this.heldDirections[0];
  }

  unbind() {
    document.removeEventListener("keydown", this.directionKeyDownHandler);
    document.removeEventListener("keyup", this.directionKeyUpHandler);
  }
}
