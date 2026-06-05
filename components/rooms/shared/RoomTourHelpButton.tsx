"use client";

import React, { useEffect, useState, useCallback } from "react";
import { HelpCircle } from "lucide-react";
import { useGuidedTour } from "@/components/guided-tour/GuidedTourProvider";
import type { TourType } from "@/components/guided-tour/tourSteps";
import { useAuth } from "@/app/context/AuthContext";

interface RoomTourHelpButtonProps {
  /** Which room tour to start when clicked */
  tourType: TourType;
  /** Room accent colour in HSL format, e.g. "45, 90%, 55%" */
  accentHsl?: string;
}

/**
 * A responsive Help / Tour icon button for room headers.
 * - Desktop: glass-morphism pill with icon + "Guide" label
 * - Mobile: compact icon-only button
 * - Pulsing dot if the tour hasn't been completed yet
 */
export default function RoomTourHelpButton({
  tourType,
  accentHsl = "320, 80%, 60%",
}: RoomTourHelpButtonProps) {
  const { startTour, activeTour } = useGuidedTour();
  const { user } = useAuth();
  const [completed, setCompleted] = useState<boolean | null>(null);

  // Check if tour has been completed
  const checkStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(
        `/api/v1/rooms/tour/status?tourName=${encodeURIComponent(tourType)}`
      );
      const data = await res.json();
      if (data.success) {
        setCompleted(data.completed);
      }
    } catch {
      // Silently fail — don't block the UI
    }
  }, [user, tourType]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Don't show while another tour is already active
  if (activeTour) return null;

  const accentColor = `hsl(${accentHsl})`;
  const accentBg = `hsla(${accentHsl}, 0.15)`;
  const accentBorder = `hsla(${accentHsl}, 0.4)`;
  const accentGlow = `0 0 15px hsla(${accentHsl}, 0.3)`;

  return (
    <button
      onClick={() => startTour(tourType)}
      className="relative flex items-center gap-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
      style={{
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        padding: "6px 10px",
        color: accentColor,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: accentGlow,
        cursor: "pointer",
      }}
      title="Room Guide"
      aria-label="Start room guided tour"
    >
      <HelpCircle className="w-4 h-4" />
      <span
        className="hidden sm:inline text-xs font-semibold"
        style={{ letterSpacing: "0.3px" }}
      >
        Guide
      </span>

      {/* Pulsing dot — only show if tour hasn't been completed */}
      {completed === false && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center"
          aria-hidden
        >
          <span
            className="absolute w-3 h-3 rounded-full animate-ping"
            style={{ background: accentColor, opacity: 0.5 }}
          />
          <span
            className="relative w-2 h-2 rounded-full"
            style={{
              background: accentColor,
              boxShadow: `0 0 6px ${accentColor}`,
            }}
          />
        </span>
      )}
    </button>
  );
}
