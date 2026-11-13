/* eslint-disable @next/next/no-img-element */
import React, {
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useState,
} from "react";
import cx from "classnames";

export enum DialogContentType {
  Message = "message",
  Quizzes = "quizzes",
}

type BaseContent = {
  type: DialogContentType;
  text: string;
};

export type MessageContent = BaseContent & { skippable?: boolean };

export type QuizzesContent = BaseContent & {
  options: Array<string>;
  answer: number;
  response: {
    correct: MessageContent;
    wrong: MessageContent;
  };
  onSelectCorrectAnswer: () => void;
  onSelectWrongAnswer: () => void;
};

export type DialogType = Array<MessageContent | QuizzesContent>;

type DialogProps = {
  isOpen?: boolean;
  onClose?: () => void;
  content?: DialogType;
  leftSection?: ReactNode;
  onComplete?: () => void;
};

const Dialog = ({
  isOpen,
  onClose,
  content = [],
  leftSection,
  onComplete,
}: DialogProps) => {
  const currentDialog = content[0] || null;
  const isLastDialog = content.length === 1;

  const onNextDialog = useCallback(() => {
    onComplete?.();

    if (isLastDialog) {
      onClose?.();
    }
  }, [isLastDialog, onClose, onComplete]);

  useEffect(() => {
    if (!isOpen || !currentDialog) {
      return;
    }

    const isSkippable =
      "skippable" in currentDialog && !!currentDialog.skippable;

    let keySafe = true;
    const onKeyDown = function (event) {
      if (event.code !== "Enter" || !isSkippable || !keySafe) {
        return;
      }

      keySafe = false;
      onNextDialog();
    };

    const onKeyUp = function (event) {
      if (event.code === "Enter") {
        keySafe = true;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [currentDialog, isOpen, onNextDialog]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute bottom-0 inset-x-0 flex flex-col  border-t-[4px] border-[var(--menu-border-color)] rounded-sm bg-[var(--menu-background)] text-[var(--menu-font-color)] h-[300px]">
      <div className="grow flex flex-col min-h-0">
        {currentDialog?.type === "quizzes" && (
          <div className="flex items-start grow min-h-0">
            <p
              className={cx(
                "w-3/5 text-6xl m-0 px-5 py-3 h-[40vh] overflow-y-scroll pb-12",
                "break-words whitespace-pre-wrap",
                "[&_a]:text-blue-70",
                "[&_ul]:list-disc [&_ul]:pl-7",
                "[&_ol]:list-decimal [&_ol]:pl-7"
              )}
              dangerouslySetInnerHTML={{
                __html: currentDialog?.text,
              }}
            ></p>
            <div className="w-2/5 p-4">
              <p className="text-5xl mb-4">
                Identify the distorted way of thinking from his speech
              </p>
              <div className="shadow-md grid grid-cols-2 grid-rows-2 gap-2 h-full">
                {(currentDialog as QuizzesContent)?.options?.map(
                  (option, idx) => (
                    <button
                      key={idx}
                      id={option}
                      onClick={() => {
                        // const selectedAnswer = event?.target?.id;
                        const selectedAnswer = idx;

                        if (
                          selectedAnswer ===
                          (currentDialog as QuizzesContent).answer
                        ) {
                          onNextDialog();
                          (
                            currentDialog as QuizzesContent
                          ).onSelectCorrectAnswer();
                        } else {
                          (
                            currentDialog as QuizzesContent
                          ).onSelectWrongAnswer();
                        }
                      }}
                      className="option flex items-center justify-center hover:bg-orange-500 p-4 rounded-md cursor-pointer bg-red-500 text-white text-2xl"
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {currentDialog?.type === "message" && (
          <div className="flex items-start grow min-h-0">
            {leftSection}
            <p
              className={cx(
                "text-6xl m-0 px-5 py-3 h-[calc(100%-10px)] overflow-y-scroll"
                // "break-words whitespace-pre-wrap",
                // // "text-base text-dark font-normal",
                // "[&_a]:text-blue-70",
                // "[&_ul]:list-disc [&_ul]:pl-7",
                // "[&_ol]:list-decimal [&_ol]:pl-7"
              )}
              dangerouslySetInnerHTML={{
                __html: currentDialog?.text,
              }}
            ></p>
          </div>
        )}
      </div>

      <div className="px-5 py-3 flex justify-end hidden">
        <button
          className="px-2 py-1 border border-[#333]"
          onClick={() => {
            // switch (content[dialogState.currentIndex]?.type) {
            //   case "quizzes":
            //     handleNextQuestion();
            //     handleNextDialog();
            //     onComplete?.(dialogState);
            //     break;
            //   case "message":
            //     handleNextDialog();
            //     onComplete?.(dialogState);
            //     break;
            //   case "essays":
            //     break;
            //   default:
            //     handleNextDialog();
            //     onComplete?.(dialogState);
            //     break;
            // }
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default memo(Dialog);
