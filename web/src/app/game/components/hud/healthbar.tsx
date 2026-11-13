import React from "react";
import { PLACEMENT_TYPE_FLOUR, PLACEMENT_TYPE_HERO } from "~/constants/helpers";
import cx from "classnames";
import { TILES } from "~/constants/tiles";
import Sprite from "../object-graphics/sprite";

const health = ({ name = "Peter", hp = 100, level = 1 }) => {
  return (
    <div className="flex flex-col relative">
      <div className="flex items-center justify-between ml-[4px] mr-[3px]">
        <p className="text-[4px] pl-[1px] tracking-[1px] text-white max-w-[50%]">
          {name}
        </p>
        <p className="text-[4px] tracking-[1px] text-white">Lvl {level}</p>
      </div>
      <svg
        className="w-[50px] h-[10px]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -0.5 38 9"
        shapeRendering="crispEdges"
      >
        <path
          stroke="#222034"
          d="M2 0h34M1 1h1M36 1h1M0 2h1M3 2h32M37 2h1M0 3h1M2 3h1M35 3h1M37 3h1M0 4h1M2 4h1M35 4h1M37 4h1M0 5h1M2 5h1M35 5h1M37 5h1M0 6h1M3 6h32M37 6h1M1 7h1M36 7h1M2 8h34"
        />
        <path stroke="#ffffff" d="M2 1h34" />
        <path
          stroke="#f2f2f5"
          d="M1 2h2M35 2h2M1 3h1M36 3h1M1 4h1M36 4h1M1 5h1M36 5h1M1 6h2M35 6h2M2 7h34"
        />
        <path stroke="#323c39" d="M3 3h32" />
        <path stroke="#494d4c" d="M3 4h32M3 5h32" />
        <svg x={3} y={2.5} width={32} height={3}>
          <rect
            style={{
              width: `${hp}%`,
            }}
            className={cx("fill-[#6aff03] transition-all", {
              "fill-yellow-500": hp <= 60 && hp >= 40,
              "fill-red-500": hp <= 40,
            })}
            height={4}
          />
        </svg>
      </svg>
    </div>
  );
};

export default health;
