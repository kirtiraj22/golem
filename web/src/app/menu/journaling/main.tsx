"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import distortionEntry from "~/app/game/classes/distortion-entry";
import Journal from "~/app/game/components/ui/journal";
import ChildHoodDistortions from "~/data/childhood.json";

export const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

const Journaling = () => {
  const navigate = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (journal: string) => {
    if (!journal) {
      return;
    }

    try {
      setIsSubmitting(true);
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

  return (
    <div
      className="w-full h-full border border-red-500"
      style={{
        backgroundImage: `url(/bg-menu.jpg)`,
        backgroundSize: "cover",
        imageRendering: "pixelated",
      }}
    >
      <Journal
        isOpen
        onClose={() => {}}
        onSave={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default Journaling;
