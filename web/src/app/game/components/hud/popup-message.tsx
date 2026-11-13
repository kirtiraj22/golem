import React from "react";

const PopupMessage = () => {
  return (
    <div className="outer-container absolute inset-0 z-[var(--ui-popup-z-index)] flex items-center justify-center">
      <div className="popup-container relative">
        <div className="quite-button">Button</div>
      </div>

      <div className="death-container flex items-center h-[38px] w-[42px] absolute left-[4px] top-[18px]"></div>
    </div>
  );
};

export default PopupMessage;
