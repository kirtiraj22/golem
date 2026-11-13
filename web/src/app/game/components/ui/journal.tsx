import { Modal, Button } from "@mantine/core";
import React, { useState } from "react";

type JournalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => void;
  isSubmitting: boolean;
};

const Journal = ({ isOpen, onClose, onSave, isSubmitting }: JournalProps) => {
  const [journal, setJournal] = useState("");

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Just write down what's on your mind"
      size="xl"
      shadow="md"
      centered
      classNames={{
        header: "!bg-[#251404] !text-white",
        body: "!p-0 !bg-[#251404]",
        content: "!rounded-2xl !shadow-md !bg-[#251404] !overflow-hidden",
      }}
    >
      <div className="flex">
        <div className="bg-[url('/notes-bg.png')] min-h-[430px] bg-no-repeat bg-cover flex-1 relative -rotate-1">
          <textarea
            className="text-2xl absolute bottom-0 inset-x-0 top-1 mt-9 ml-8 mr-12 mb-5 text-black rotate-1 resize-none bg-transparent px-3 py-4 rounded-md border border-gray-300 focus:outline-none !border-none"
            name="journal"
            onChange={(e) => setJournal(e.target.value)}
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
            color="dark"
            loading={isSubmitting}
            fullWidth
            size="md"
            radius="xl"
            onClick={() => {
              if (!journal) {
                return;
              }
              onSave(journal);
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Journal;
