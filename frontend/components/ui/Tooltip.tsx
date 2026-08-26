"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/utils/cn";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
  maxWidth?: number;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  className,
  maxWidth = 280,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 8;
    switch (position) {
      case "top":
        setTooltipStyle({
          left: rect.left + rect.width / 2,
          top: rect.top - gap,
          transform: "translate(-50%, -100%)",
        });
        break;
      case "bottom":
        setTooltipStyle({
          left: rect.left + rect.width / 2,
          top: rect.bottom + gap,
          transform: "translate(-50%, 0)",
        });
        break;
      case "left":
        setTooltipStyle({
          left: rect.left - gap,
          top: rect.top + rect.height / 2,
          transform: "translate(-100%, -50%)",
        });
        break;
      case "right":
        setTooltipStyle({
          left: rect.right + gap,
          top: rect.top + rect.height / 2,
          transform: "translate(0, -50%)",
        });
        break;
    }
  }, [position]);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  }, [delay, updatePosition]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const onScroll = () => {
      updatePosition();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className={cn("inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible &&
        createPortal(
          <div
            role="tooltip"
            style={{ ...tooltipStyle, maxWidth }}
            className="fixed z-[200] pointer-events-none px-2.5 py-1.5 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg animate-in fade-in duration-150"
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
