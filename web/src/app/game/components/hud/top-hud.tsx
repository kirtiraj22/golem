import React from "react";
import { PLACEMENT_TYPE_FLOUR } from "~/constants/helpers";
import cx from "classnames";
import FlourCount from "./flour-count";
import LevelCompleteMessage from "./level-complete-message";
import DeathMessage from "./death-message";
import InventoryList from "./inventory-list";
import HealthBar from "./healthbar";

const TopHud = ({ level }: { level: any }) => {
  const healthRemaining = level?.heroRef?.stats?.health;

  return (
    <div className="absolute inset-x-0 top-[4px]">
      <div className="flex gap-[4px] origin-top-left scale-[var(--pixel-size)] items-center">
        <HealthBar name="Peter" hp={healthRemaining} />
        <FlourCount level={level} />
        <InventoryList level={level} />
      </div>
      <div className="flex gap-[2px] origin-top-right scale-[var(--pixel-size)]">
        {level.isCompleted && <LevelCompleteMessage />}
        {level.deathOutcome && <DeathMessage level={level} />}
      </div>
    </div>
  );
};

export default TopHud;
