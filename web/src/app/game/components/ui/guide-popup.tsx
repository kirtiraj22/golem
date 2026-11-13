import { Modal, Button } from "@mantine/core";
import React, { Fragment, useState } from "react";

type GuidePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  content: Array<any> | any;
  thumbnail: React.ReactNode;
};

const GuidePopup = ({
  isOpen,
  onClose,
  content,
  thumbnail = <span>Thumbnail</span>,
}: GuidePopupProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentContent = Array.isArray(content)
    ? content[currentIndex]
    : content;

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      size="xl"
      shadow="md"
      centered
      classNames={{
        header: "!bg-[#251404] !text-white",
        body: "!p-0 !bg-[#251404]",
        content: "!rounded-2xl !shadow-md !bg-[#251404] !overflow-hidden",
      }}
    >
      <Fragment>
        <div className="flex items-center gap-5">
          {thumbnail}
          <div className="space-y-3 p-3">
            <p className="text-5xl mb-4">{currentContent?.title}</p>
            <p>{currentContent?.description}</p>
          </div>
        </div>

        {Array.isArray(content) && (
          <div className="flex justify-end gap-2 p-3">
            <Button
              // classNames={{
              //   root: "bg-[#926247]",
              // }}
              color="dark"
              fullWidth
              size="md"
              disabled={currentIndex === 0}
              radius="xl"
              onClick={() => setCurrentIndex(currentIndex - 1)}
            >
              Prev
            </Button>
            <Button
              // classNames={{
              //   root: "bg-[#926247]",
              // }}
              color="dark"
              fullWidth
              size="md"
              radius="xl"
              disabled={currentIndex === content.length - 1}
              onClick={() => setCurrentIndex(currentIndex + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Fragment>
    </Modal>
  );
};

export default GuidePopup;
