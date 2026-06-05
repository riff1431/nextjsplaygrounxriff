"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { tourConfigs, type TourType, type TourStep, isRoomTour } from "./tourSteps";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------
interface GuidedTourContextType {
  /** Which tour is currently active (null = no tour) */
  activeTour: TourType | null;
  /** Current step index (0-based) */
  currentStep: number;
  /** Steps for the active tour */
  steps: TourStep[];
  /** Total number of steps in the active tour */
  totalSteps: number;
  /** Whether the completion modal is visible */
  showCompletion: boolean;
  /** Start a specific tour */
  startTour: (type: TourType) => void;
  /** Go to the next step */
  nextStep: () => void;
  /** Go to the previous step */
  prevStep: () => void;
  /** Skip the entire tour */
  skipTour: () => void;
  /** Finish the tour (triggers completion modal) */
  finishTour: () => void;
  /** Dismiss the completion modal */
  dismissCompletion: () => void;
  /** Whether the tour system is initializing */
  isLoading: boolean;
}

const GuidedTourContext = createContext<GuidedTourContextType | undefined>(
  undefined
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function GuidedTourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [activeTour, setActiveTour] = useState<TourType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const steps = activeTour ? tourConfigs[activeTour] : [];
  const totalSteps = steps.length;

  // ── Auto-start logic: check DB on first login ──────────────────────────
  useEffect(() => {
    if (authLoading || !user || hasChecked) return;

    const checkTourStatus = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("guided_tour_completed, guided_tour_type, role, account_type")
          .eq("id", user.id)
          .single();

        if (profile && !profile.guided_tour_completed) {
          // Determine which tour to show
          let tourType: TourType = "fan";

          if (profile.role === "creator") {
            tourType = "creator";
          } else if (
            profile.account_type &&
            ["sugadaddy", "sugamama", "sugababy"].includes(
              profile.account_type.toLowerCase()
            )
          ) {
            tourType = "suga";
          }

          // Small delay so the page has time to render target elements
          setTimeout(() => {
            setActiveTour(tourType);
            setCurrentStep(0);
          }, 1500);
        }
      } catch (err) {
        // Silently fail — don't block the app if DB columns don't exist yet
        console.warn("Guided tour check skipped:", err);
      } finally {
        setIsLoading(false);
        setHasChecked(true);
      }
    };

    checkTourStatus();
  }, [user, authLoading, hasChecked]);

  // ── Persist completion to DB ───────────────────────────────────────────
  const persistCompletion = useCallback(
    async (tourType: TourType) => {
      if (!user) return;
      try {
        if (isRoomTour(tourType)) {
          // Room-specific tours → dedicated table via API
          await fetch("/api/v1/rooms/tour/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tourName: tourType }),
          });
        } else {
          // Global onboarding tours → profiles table
          await supabase
            .from("profiles")
            .update({
              guided_tour_completed: true,
              guided_tour_type: tourType,
            })
            .eq("id", user.id);
        }
      } catch (err) {
        console.warn("Failed to persist tour completion:", err);
      }
    },
    [user, supabase]
  );

  // ── Reset completion in DB (for restart) ───────────────────────────────
  const resetCompletion = useCallback(async () => {
    if (!user) return;
    try {
      await supabase
        .from("profiles")
        .update({
          guided_tour_completed: false,
          guided_tour_type: null,
        })
        .eq("id", user.id);
    } catch (err) {
      console.warn("Failed to reset tour completion:", err);
    }
  }, [user, supabase]);

  // ── Public API ─────────────────────────────────────────────────────────
  const startTour = useCallback(
    (type: TourType) => {
      setShowCompletion(false);
      setCurrentStep(0);
      resetCompletion();
      // Small delay so overlay doesn't flash before page settles
      setTimeout(() => setActiveTour(type), 100);
    },
    [resetCompletion]
  );

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Last step → finish
      if (activeTour) {
        persistCompletion(activeTour);
      }
      setActiveTour(null);
      setCurrentStep(0);
      setShowCompletion(true);
    }
  }, [currentStep, totalSteps, activeTour, persistCompletion]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    if (activeTour) {
      persistCompletion(activeTour);
    }
    setActiveTour(null);
    setCurrentStep(0);
  }, [activeTour, persistCompletion]);

  const finishTour = useCallback(() => {
    if (activeTour) {
      persistCompletion(activeTour);
    }
    setActiveTour(null);
    setCurrentStep(0);
    setShowCompletion(true);
  }, [activeTour, persistCompletion]);

  const dismissCompletion = useCallback(() => {
    setShowCompletion(false);
  }, []);

  return (
    <GuidedTourContext.Provider
      value={{
        activeTour,
        currentStep,
        steps,
        totalSteps,
        showCompletion,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
        dismissCompletion,
        isLoading,
      }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) {
    throw new Error("useGuidedTour must be used within <GuidedTourProvider>");
  }
  return ctx;
}
