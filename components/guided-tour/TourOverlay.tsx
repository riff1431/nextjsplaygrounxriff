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
const TOOLTIP_GAP = 14; // gap between spotlight and tooltip
const ARROW_SIZE = 10;

function getTargetRect(target: string): Rect | null {
  // Primary: look for data-tour="<target>"
  let el = document.querySelector(`[data-tour="${target}"]`);
  // Fallback: look for data-tour-match="<target>" (allows one element to serve multiple tours)
  if (!el) {
    el = document.querySelector(`[data-tour-match="${target}"]`);
  }
  // Fallback: look for CSS class name (room tours use class-based targets like "bar-room-info")
  if (!el) {
    el = document.querySelector(`.${target}`);
  }
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

/** Scroll the tour target element into view if it's off-screen */
function scrollTargetIntoView(target: string): void {
  let el =
    document.querySelector(`[data-tour="${target}"]`) ||
    document.querySelector(`[data-tour-match="${target}"]`) ||
    document.querySelector(`.${target}`);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  // If element is off-screen or partially hidden, scroll it into view
  if (r.top < 0 || r.bottom > vh || r.top > vh * 0.75) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
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
    completedTourType,
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

  // When the step changes, try to find the target. If not found, show tooltip without spotlight.
  useEffect(() => {
    if (!step || !activeTour) return;

    // Scroll target into view first (important on mobile where elements may be off-screen)
    scrollTargetIntoView(step.target);

    let attempts = 0;
    const maxAttempts = 5;
    const retryInterval = 400; // ms between retries

    const tryFind = () => {
      const r = getTargetRect(step.target);
      if (r) {
        setTargetRect(r);
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        // Try scrolling again on retry
        scrollTargetIntoView(step.target);
        setTimeout(tryFind, retryInterval);
      } else {
        // Target not found — show tooltip without spotlight (do NOT auto-skip)
        console.warn(`Tour target "${step.target}" not found, showing step without highlight.`);
        setTargetRect(null);
      }
    };

    // Give scroll animation time to settle
    setTimeout(tryFind, 200);

    // Re-measure on scroll/resize
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [step, activeTour, updateRect]);

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

  // Lock body scroll when tour is active — use CSS class approach for iOS compat
  useEffect(() => {
    if (activeTour) {
      document.documentElement.classList.add("tour-active");
      document.body.classList.add("tour-active");
    } else {
      document.documentElement.classList.remove("tour-active");
      document.body.classList.remove("tour-active");
    }
    return () => {
      document.documentElement.classList.remove("tour-active");
      document.body.classList.remove("tour-active");
    };
  }, [activeTour]);

  // ── Completion modal (shown after tour ends) ─────────────────────────
  if (showCompletion) {
    return <TourCompletionModal onDismiss={dismissCompletion} completedTourType={completedTourType} />;
  }

  // Nothing active
  if (!activeTour || !step) return null;

  // ── Desktop tooltip width adapts to viewport ─────────────────────────
  const desktopTooltipWidth = isMobile ? "100%" : Math.min(380, window.innerWidth - 32);

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
    : null; // null = center on screen

  const arrowStyle = targetRect
    ? getArrowStyle(placement, targetRect, tooltipPos!, tooltipSize.w, tooltipSize.h)
    : {};

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // ── Progress: show dots for ≤8 steps, fraction for more ──────────────
  const showDotsProgress = totalSteps <= 8;

  // When no target found on desktop, center the tooltip
  const noTargetDesktop = !isMobile && !targetRect;

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

      {/* SVG spotlight mask — only when target is found */}
      <SpotlightMask rect={targetRect} />

      {/* Neon ring around target — only when target is found */}
      <AnimatePresence mode="wait">
        {targetRect && (
          <SpotlightRing key={`ring-${currentStep}`} rect={targetRect} />
        )}
      </AnimatePresence>

      {/* Tooltip — Desktop: positioned near target / Mobile: bottom sheet / No target: centered */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tooltip-${currentStep}`}
          ref={tooltipRef}
          className={cx(
            "z-[10000]",
            isMobile
              ? "fixed bottom-0 left-0 right-0 rounded-t-3xl"
              : noTargetDesktop
                ? "fixed rounded-2xl"
                : "fixed rounded-2xl"
          )}
          style={
            isMobile
              ? {}
              : noTargetDesktop
                ? {
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    maxWidth: desktopTooltipWidth,
                    width: desktopTooltipWidth,
                  }
                : {
                    top: tooltipPos!.top,
                    left: tooltipPos!.left,
                    maxWidth: desktopTooltipWidth,
                    width: desktopTooltipWidth,
                  }
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
              isMobile ? "rounded-t-3xl" : "rounded-2xl"
            )}
            style={
              isMobile
                ? { paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }
                : {}
            }
          >
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/10 blur-[60px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/8 blur-[50px] pointer-events-none" />

            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-white/25" />
              </div>
            )}

            {/* Header */}
            <div className={cx(
              "flex items-center justify-between",
              isMobile ? "px-4 pt-3 pb-2" : "px-5 pt-4 pb-2"
            )}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cx(
                  "rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/10 border border-pink-500/30 flex items-center justify-center text-xl flex-shrink-0",
                  isMobile ? "w-11 h-11" : "w-10 h-10"
                )}>
                  {step.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cx(
                    "font-bold text-white leading-tight",
                    isMobile ? "text-[15px]" : "text-base"
                  )}>
                    {step.title}
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-pink-300/60 font-semibold">
                    Step {currentStep + 1} of {totalSteps}
                  </span>
                </div>
              </div>
              <button
                onClick={skipTour}
                className={cx(
                  "rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition flex-shrink-0",
                  isMobile ? "p-2.5 -mr-1" : "p-1.5"
                )}
                title="Skip Tour"
              >
                <X className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
              </button>
            </div>

            {/* Content */}
            <div className={isMobile ? "px-4 pb-4" : "px-5 pb-4"}>
              <p className={cx(
                "text-gray-300 leading-relaxed",
                isMobile ? "text-[13px]" : "text-sm"
              )}>
                {step.content}
              </p>
            </div>

            {/* Progress indicator */}
            <div className={cx(
              "flex items-center justify-center",
              isMobile ? "px-4 pb-3" : "px-5 pb-3",
              showDotsProgress ? "gap-1.5" : "gap-0"
            )}>
              {showDotsProgress ? (
                // Dot indicators for ≤ 8 steps
                Array.from({ length: totalSteps }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={cx(
                      "rounded-full transition-all duration-300",
                      i === currentStep
                        ? "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                        : i < currentStep
                          ? "bg-pink-500/50"
                          : "bg-white/15",
                      isMobile
                        ? (i === currentStep ? "h-2 w-7" : "h-2 w-2")
                        : (i === currentStep ? "h-1.5 w-6" : "h-1.5 w-1.5")
                    )}
                    layout
                  />
                ))
              ) : (
                // Progress bar + fraction for > 8 steps
                <div className="flex items-center gap-2.5 w-full max-w-[200px]">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-pink-600 to-pink-400"
                      style={{ boxShadow: "0 0 8px rgba(236,72,153,0.6)" }}
                      initial={false}
                      animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  </div>
                  <span className="text-[10px] text-white/40 font-semibold tabular-nums flex-shrink-0">
                    {currentStep + 1}/{totalSteps}
                  </span>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className={cx(
              "flex items-center justify-between",
              isMobile ? "px-4 pb-4 gap-2" : "px-5 pb-5 gap-3"
            )}>
              <button
                onClick={skipTour}
                className={cx(
                  "text-gray-500 hover:text-gray-300 transition",
                  isMobile ? "text-[13px] px-2 py-2" : "text-xs px-2 py-1"
                )}
              >
                Skip Tour
              </button>

              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    onClick={prevStep}
                    className={cx(
                      "flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition",
                      isMobile
                        ? "px-4 py-2.5 text-[13px] min-h-[44px]"
                        : "px-3 py-2 text-sm"
                    )}
                  >
                    <ChevronLeft className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
                    Back
                  </button>
                )}

                <button
                  onClick={nextStep}
                  className={cx(
                    "flex items-center gap-1 rounded-xl font-semibold transition",
                    "bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400",
                    "text-white shadow-[0_0_20px_rgba(236,72,153,0.4)]",
                    "hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]",
                    "active:scale-95",
                    isMobile
                      ? "px-6 py-2.5 text-[13px] min-h-[44px]"
                      : "px-5 py-2 text-sm"
                  )}
                >
                  {isLastStep ? "Finish" : "Next"}
                  {!isLastStep && <ChevronRight className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />}
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
