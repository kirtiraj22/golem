import { Button } from "@mantine/core";
import React from "react";

const Journaling = () => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#251404]/80">
      <div className="flex bg-[#251404]">
        <div className="bg-[url('/notes-bg.png')] min-h-[430px] bg-no-repeat bg-cover flex-1 relative -rotate-1">
          <textarea
            className="absolute bottom-0 inset-x-0 top-1 mt-3 ml-8 mr-12 mb-5 text-black rotate-1 resize-none bg-transparent px-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            name="journal"
            style={{
              backgroundPosition: "0px -34px",
            }}
          ></textarea>
        </div>

        <div className="space-y-2 p-3 self-end">
          <Button
            classNames={{
              root: "bg-[#926247]",
            }}
            fullWidth
            size="md"
            radius="xl"
          >
            Kirim
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Journaling;
