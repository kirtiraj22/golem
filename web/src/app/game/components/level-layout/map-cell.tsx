import Sprite from "../object-graphics/sprite";
import { CELL_SIZE } from "~/constants/helpers";

const MapCell = ({ x, y, frameCoordinate }) => (
  <div className="absolute" style={{ left: x * CELL_SIZE, top: y * CELL_SIZE }}>
    <Sprite frameCoordinate={frameCoordinate} />
  </div>
);

export default MapCell;
