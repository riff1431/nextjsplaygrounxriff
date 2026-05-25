"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useGuidedTour } from "./GuidedTourProvider";
import TourCompletionModal from "./TourCompletionModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

type Placement = "top" | "bottom" | "left" | "right";

const PADDING = 10; // px of breathing room around the target
const TOOLTIP_GAP = 16; // gap between spotlight and tooltip
const ARROW_SIZE = 10;

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
    bottom: r.bottom + PADDING,
    right: r.right + PADDING,
  };
}

function resolvePlacement(
  pref: Placement | "auto" | undefined,
  rect: Rect,
  tooltipW: number,
  tooltipH: number
): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (pref && pref !== "auto") {
    // Validate the preferred placement fits
    if (pref === "bottom" && rect.bottom + TOOLTIP_GAP + tooltipH < vh) return "bottom";
    if (pref === "top" && rect.top - TOOLTIP_GAP - tooltipH > 0) return "top";
    if (pref === "right" && rect.right + TOOLTIP_GAP + tooltipW < vw) return "right";
    if (pref === "left" && rect.left - TOOLTIP_GAP - tooltipW > 0) return "left";
  }

  // Auto: try bottom → top → right → left
  if (rect.bottom + TOOLTIP_GAP + tooltipH < vh) return "bottom";
  if (rect.top - TOOLTIP_GAP - tooltipH > 0) return "top";
  if (rect.right + TOOLTIP_GAP + tooltipW < vw) return "right";
  return "left";
}

function getTooltipPosition(
  placement: Placement,
  rect: Rect,
  tooltipW: number,
  tooltipH: number
): { top: number; left: number } {
  const vw = window.innerWidth;

  switch (placement) {
    case "bottom": {
      let left = rect.left + rect.width / 2 - tooltipW / 2;
      left = Math.max(12, Math.min(left, vw - tooltipW - 12));
      return { top: rect.bottom + TOOLTIP_GAP, left };
    }
    case "top": {
      let left = rect.left + rect.width / 2 - tooltipW / 2;
      left = Math.max(12, Math.min(left, vw - tooltipW - 12));
      return { top: rect.top - TOOLTIP_GAP - tooltipH, left };
    }
    case "right":
      return {
        top: rect.top + rect.height / 2 - tooltipH / 2,
        left: rect.right + TOOLTIP_GAP,
      };
    case "left":
      return {
        top: rect.top + rect.height / 2 - tooltipH / 2,
        left: rect.left - TOOLTIP_GAP - tooltipW,
      };
  }
}

function getArrowStyle(
  placement: Placement,
  rect: Rect,
  tooltipPos: { top: number; left: number },
  tooltipW: number,
  tooltipH: number
): React.CSSProperties {
  const s = ARROW_SIZE;
  const base: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
    filter: "drop-shadow(0 0 6px rgba(236,72,153,0.7))",
  };

  switch (placement) {
    case "bottom":
      return {
        ...base,
        top: -s,
        left: Math.min(
          Math.max(rect.left + rect.width / 2 - tooltipPos.left - s, 16),
          tooltipW - 32
        ),
        borderLeft: `${s}px solid transparent`,
        borderRight: `${s}px solid transparent`,
        borderBottom: `${s}px solid rgba(236,72,153,0.5)`,
      };
    case "top":
      return {
        ...base,
        bottom: -s,
        left: Math.min(
          Math.max(rect.left + rect.width / 2 - tooltipPos.left - s, 16),
          tooltipW - 32
        ),
        borderLeft: `${s}px solid transparent`,
        borderRight: `${s}px solid transparent`,
        borderTop: `${s}px solid rgba(236,72,153,0.5)`,
      };
    case "right":
      return {
        ...base,
        left: -s,
        top: Math.min(
          Math.max(rect.top + rect.height / 2 - tooltipPos.top - s, 16),
          tooltipH - 32
        ),
        borderTop: `${s}px solid transparent`,
        borderBottom: `${s}px solid transparent`,
        borderRight: `${s}px solid rgba(236,72,153,0.5)`,
      };
    case "left":
      return {
        ...base,
        right: -s,
        top: Math.min(
          Math.max(rect.top + rect.height / 2 - tooltipPos.top - s, 16),
          tooltipH - 32
        ),
        borderTop: `${s}px solid transparent`,
        borderBottom: `${s}px solid transparent`,
        borderLeft: `${s}px solid rgba(236,72,153,0.5)`,
      };
  }
}

// ---------------------------------------------------------------------------
// Overlay SVG mask (spotlight cutout)
// ---------------------------------------------------------------------------
function SpotlightMask({ rect }: { rect: Rect | null }) {
  if (!rect) return null;

  const r = 16; // border radius of the cutout

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-[9998]"
      style={{ mixBlendMode: "normal" }}
    >
      <defs>
        <mask id="tour-spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={rect.left}
            y={rect.top}
            width={rect.width}
            height={rect.height}
            rx={r}
            ry={r}
            fill="black"
          />
        </mask>
      </defs>
      {/* Dark backdrop with cutout */}
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.72)"
        mask="url(#tour-spotlight-mask)"
      />
    </svg>
  );
}

// Neon glow ring around target
function SpotlightRing({ rect }: { rect: Rect }) {
  return (
    <motion.div
      className="fixed z-[9999] pointer-events-none rounded-2xl tour-spotlight-ring"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// TourOverlay
// ---------------------------------------------------------------------------
export default function TourOverlay() {
  const {
    activeTour,
    currentStep,
    steps,
    totalSteps,
    showCompletion,
    nextStep,
    prevStep,
    skipTour,
    dismissCompletion,
  } = useGuidedTour();

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ w: 340, h: 200 });

  const step = steps[currentStep] ?? null;

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Find target element rect
  const updateRect = useCallback(() => {
    if (!step) {
      setTargetRect(null);
      return;
    }
    const r = getTargetRect(step.target);
    setTargetRect(r);
  }, [step]);

  useEffect(() => {
    updateRect();
    // Re-measure on scroll/resize
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [updateRect]);

  // Measure tooltip after render
  useEffect(() => {
    if (tooltipRef.current) {
      const r = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ w: r.width, h: r.height });
    }
  }, [currentStep, activeTour, targetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!activeTour) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") nextStep();
      else if (e.key === "ArrowLeft") prevStep();
      else if (e.key === "Escape") skipTour();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTour, nextStep, prevStep, skipTour]);

  // Lock body scroll when tour is active
  useEffect(() => {
    if (activeTour) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeTour]);

  // ── Completion modal (shown after tour ends) ─────────────────────────
  if (showCompletion) {
    return <TourCompletionModal onDismiss={dismissCompletion} />;
  }

  // Nothing active
  if (!activeTour || !step) return null;

  // Compute tooltip placement & position
  const placement = targetRect
    ? resolvePlacement(
        step.placement,
        targetRect,
        tooltipSize.w,
        tooltipSize.h
      )
    : "bottom";

  const tooltipPos = targetRect
    ? getTooltipPosition(placement, targetRect, tooltipSize.w, tooltipSize.h)
    : { top: 100, left: 100 };

  const arrowStyle = targetRect
    ? getArrowStyle(placement, targetRect, tooltipPos, tooltipSize.w, tooltipSize.h)
    : {};

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop blur layer */}
      <motion.div
        className="fixed inset-0 z-[9997] backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={skipTour}
      />

      {/* SVG spotlight mask */}
      <SpotlightMask rect={targetRect} />

      {/* Neon ring around target */}
      <AnimatePresence mode="wait">
        {targetRect && (
          <SpotlightRing key={`ring-${currentStep}`} rect={targetRect} />
        )}
      </AnimatePresence>

      {/* Tooltip — Desktop: positioned near target / Mobile: bottom sheet */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tooltip-${currentStep}`}
          ref={tooltipRef}
          className={cx(
            "z-[10000]",
            isMobile
              ? "fixed bottom-0 left-0 right-0 rounded-t-3xl"
              : "fixed rounded-2xl max-w-[380px] w-[380px]"
          )}
          style={
            isMobile
              ? {}
              : { top: tooltipPos.top, left: tooltipPos.left }
          }
          initial={isMobile ? { y: "100%" } : { opacity: 0, y: 12, scale: 0.96 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
          exit={isMobile ? { y: "100%" } : { opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
        >
          {/* Tooltip Card */}
          <div
            className={cx(
              "relative border bg-black/90 backdrop-blur-xl overflow-hidden",
              "border-pink-500/40",
              "shadow-[0_0_40px_rgba(236,72,153,0.25),0_0_100px_rgba(236,72,153,0.08)]",
              isMobile ? "rounded-t-3xl pb-8" : "rounded-2xl"
            )}
          >
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/10 blur-[60px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/8 blur-[50px] pointer-events-none" />

            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
            )}

            {/* Header */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/10 border border-pink-500/30 flex items-center justify-center text-xl">
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {step.title}
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-pink-300/60 font-semibold">
                    Step {currentStep + 1} of {totalSteps}
                  </span>
                </div>
              </div>
              <button
                onClick={skipTour}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition"
                title="Skip Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                {step.content}
              </p>
            </div>

            {/* Progress dots */}
            <div className="px-5 pb-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                  key={i}
                  className={cx(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentStep
                      ? "bg-pink-500 w-6 shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                      : i < currentStep
                        ? "bg-pink-500/50 w-1.5"
                        : "bg-white/15 w-1.5"
                  )}
                  layout
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              <button
                onClick={skipTour}
                className="text-xs text-gray-500 hover:text-gray-300 transition px-2 py-1"
              >
                Skip Tour
              </button>

              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}

                <button
                  onClick={nextStep}
                  className={cx(
                    "flex items-center gap-1 px-5 py-2 rounded-xl text-sm font-semibold transition",
                    "bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400",
                    "text-white shadow-[0_0_20px_rgba(236,72,153,0.4)]",
                    "hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]"
                  )}
                >
                  {isLastStep ? "Finish" : "Next"}
                  {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Arrow (desktop only) */}
          {!isMobile && targetRect && (
            <div style={arrowStyle} />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
