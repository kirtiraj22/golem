import React from "react";
import { Z_INDEX_LAYER_SIZE } from "~/constants/helpers";
import Placement from "../placement";
import AtlasSprite from "../../components/object-graphics/atlas-sprite";
import type { AtlasSpriteConfig } from "../atlas-sprite-config";

type PropPlacementProperties = {
  sprite?: AtlasSpriteConfig;
  solid?: boolean;
  zOffset?: number;
};

/**
 * Generic static world object for the new spritesheets.
 *
 * A prop may have a visual sprite, be an invisible collision footprint, or
 * both. Keeping the collision footprint as separate cells preserves the
 * existing cell-based collision system.
 */
export class PropPlacement extends Placement {
  declare properties: PropPlacementProperties & Placement["properties"];

  isSolidForBody(_body: any): boolean {
    return Boolean(this.properties.solid);
  }

  zIndex(): number {
    return (
      this.y * Z_INDEX_LAYER_SIZE +
      (this.properties.zOffset ?? 4)
    );
  }

  renderComponent(): React.JSX.Element | null {
    if (!this.properties.sprite) {
      return null;
    }

    return <AtlasSprite sprite={this.properties.sprite} />;
  }
}
