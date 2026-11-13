/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import progressEntry from "../game/classes/progress-entry";
import { useRouter } from "next/navigation";
import distortionEntry from "../game/classes/distortion-entry";
import Journal from "../game/components/ui/journal";
import Dialog, { DialogType } from "../game/components/hud/dialog";
import { CHARACTERS, TUTORIAL_DIALOGS } from "~/constants/dialogs";
import GuidePopup from "../game/components/ui/guide-popup";
import { COGNITIVE_DISTORTIONS } from "~/constants/dialogs";
import journalEntry from "../game/classes/journal-entry";

const MainMenu = () => {
  const navigate = useRouter();
  const timeoutRef = useRef<any>(null);

  const [screen, setScreen] = useState("main-menu");
  const [additionalScreen, setAdditionalScreen] = useState("");

  const [dialogs, setDialogs] = useState(TUTORIAL_DIALOGS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcerMessage, setAnnouncerMessage] = useState("");

  const handleSubmit = async (journal: string) => {
    if (!journal) {
      return;
    }

    try {
      setIsSubmitting(true);

      journalEntry.save(journal);
      const res = await fetch("/api/distortions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ journal }),
      });

      const result = await res.json();

      distortionEntry.save(result?.data);
      setIsSubmitting(false);

      navigate.push("/game");
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const MENU = [
    {
      title: "Start Game",
      onClick: () => {
        setScreen("tutorial");
      },
    },
    { title: "Exit Game", onClick: () => {} },
  ];

  useEffect(() => {
    if (announcerMessage) {
      timeoutRef.current = setTimeout(() => {
        setAnnouncerMessage("");
      }, 1500);
    }

    return () => {
      clearTimeout(timeoutRef?.current);
    };
  }, [announcerMessage]);

  const guidePopupContent = useMemo(() => {
    return CHARACTERS[additionalScreen as keyof typeof CHARACTERS] || null;
  }, [additionalScreen]);

  return (
    <div
      className="w-full h-full border border-red-500 "
      style={{
        backgroundImage: `url(/bg-menu.jpg)`,
        backgroundSize: "cover",
        imageRendering: "pixelated",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
        {screen === "main-menu" && (
          <div className="flex flex-col">
            <h1 className="text-8xl font-bold text-center mb-8">
              Cognivirues <br /> <span className="text-red-500">Outbreak</span>
            </h1>

            {MENU.map((option, idx) => (
              <button
                key={idx}
                className="option flex items-center justify-center hover:bg-orange-500 p-4 rounded-md cursor-pointer bg-red-500 text-white text-6xl my-4"
                onClick={option?.onClick}
              >
                {option?.title}
              </button>
            ))}
          </div>
        )}

        {screen === "tutorial" && (
          <Fragment>
            <Journal
              isOpen={additionalScreen === "journaling"}
              onSave={() => {
                setAnnouncerMessage(
                  "Good, now you understand what your function is."
                );
                setAdditionalScreen("");
                setDialogs(dialogs?.slice(1));
              }}
              onClose={() => {}}
              isSubmitting={false}
            />

            <GuidePopup
              thumbnail={
                <img
                  src={
                    additionalScreen === "distortions-guide"
                      ? "/characters/the-infected.jpg"
                      : guidePopupContent?.img
                  }
                  height={200}
                />
              }
              content={
                additionalScreen === "distortions-guide"
                  ? COGNITIVE_DISTORTIONS
                  : guidePopupContent
              }
              isOpen={
                additionalScreen === "distortions-guide" ||
                additionalScreen === "the-infected" ||
                additionalScreen === "the-thief" ||
                additionalScreen === "the-floater" ||
                additionalScreen === "the-clowny" ||
                additionalScreen === "the-hopper"
              }
              onClose={() => {
                setAdditionalScreen("");
                setDialogs(dialogs?.slice(1));
              }}
            />

            <Dialog
              isOpen={!!dialogs.length}
              onClose={() => {}}
              onComplete={() => {
                switch (dialogs[0]?.withAdditional) {
                  case "journaling":
                    setAdditionalScreen("journaling");
                    break;

                  case "distortions-guide":
                    setAdditionalScreen("distortions-guide");
                    break;

                  case "the-infected":
                    setAdditionalScreen("the-infected");
                    break;

                  case "the-thief":
                    setAdditionalScreen("the-thief");
                    break;

                  case "the-clowny":
                    setAdditionalScreen("the-clowny");
                    break;

                  case "the-floater":
                    setAdditionalScreen("the-floater");
                    break;

                  case "the-hopper":
                    setAdditionalScreen("the-hopper");
                    break;

                  default:
                    if (dialogs.length === 1) {
                      setScreen("journaling");
                      progressEntry.save({ hasCompletedTutorial: true });
                    }

                    setDialogs(dialogs?.slice(1));
                    break;
                }
              }}
              leftSection={
                <img
                  src="https://img.itch.zone/aW1nLzExNzY3NzEyLnBuZw==/original/zOww4a.png"
                  alt="Ciabatta"
                  width={900}
                  height={500}
                  className="-mt-14"
                />
              }
              content={
                !!announcerMessage
                  ? ([
                      {
                        type: "message",
                        text: announcerMessage,
                      },
                    ] as DialogType)
                  : (dialogs as DialogType)
              }
            />
          </Fragment>
        )}

        {screen === "journaling" && (
          <Journal
            isOpen
            onClose={() => {}}
            onSave={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
};

export default MainMenu;
