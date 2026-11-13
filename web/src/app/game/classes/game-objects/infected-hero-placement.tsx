import {
  Direction,
  THEME_TILES_MAP,
  Z_INDEX_LAYER_SIZE,
} from "~/constants/helpers";
import Body from "../../components/object-graphics/body";
import Placement from "../placement";
import { TILES } from "~/constants/tiles";
import { Battle } from "../battle";
import { MessageContent, QuizzesContent } from "../../components/hud/dialog";
import distortionEntry from "../distortion-entry";

export class InfectedHeroPlacement extends Placement {
  stats: { health: number; level: number; name: string };
  defeatedInFrames: number;
  distortions: {
    backstories: Array<MessageContent>;
    quizzes: Array<QuizzesContent>;
  };

  constructor(properties, level) {
    super(properties, level);
    this.spriteFacingDirection = this.properties?.direction || Direction.Left;
    this.distortions = distortionEntry.get()[level?.id?.split("-")[1]];
    this.defeatedInFrames = 0;

    this.stats = {
      name: "The Infected",
      health: 100,
      level: 1,
    };
  }

  isSolidForBody(_body: any): boolean {
    return true;
  }

  isFacingEachOther(_body: any) {
    return (
      (this.spriteFacingDirection === Direction.Right &&
        _body.spriteFacingDirection === Direction.Left &&
        this.x < _body.x &&
        this.y === _body.y) ||
      (this.spriteFacingDirection === Direction.Left &&
        _body.spriteFacingDirection === Direction.Right &&
        this.x > _body.x &&
        this.y === _body.y) ||
      this.y + 1 === _body.y
    );
  }

  zIndex(): number {
    return this.y * Z_INDEX_LAYER_SIZE + 1;
  }

  defeated() {
    if (this.defeatedInFrames > 0) {
      return;
    }

    this.defeatedInFrames = 8;
  }

  tick(): void {
    if (this.defeatedInFrames > 0) {
      this.defeatedInFrames -= 1;
      if (this.defeatedInFrames === 0) {
        this.level.deletePlacement(this);
      }
    }
  }

  renderComponent(): JSX.Element | null {
    let frameCoordinate =
      this.spriteFacingDirection === Direction.Left
        ? TILES.HERO_INFECTED_LEFT
        : TILES.HERO_INFECTED_RIGHT;

    if (this.defeatedInFrames > 0) {
      frameCoordinate =
        this.spriteFacingDirection === Direction.Left
          ? TILES.HERO_DEATH_LEFT
          : TILES.HERO_DEATH_RIGHT;
    }

    return <Body frameCoordinate={frameCoordinate} yTranslate={1} />;
  }
}
