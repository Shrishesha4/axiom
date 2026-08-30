"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type FocusEvent,
} from "react";
import { cn } from "@/lib/utils";

const PASSWORD_CHAR =
  typeof navigator !== "undefined" && navigator.userAgent.match(/firefox|fxios/i)
    ? "\u25CF"
    : "\u2022";

const SPRING = { stiffness: 500, damping: 30, mass: 0.5 };
const REDUCED_MOTION_SPRING = { stiffness: 10000, damping: 100, mass: 0.1 };

export type SmoothCaretInputProps = ComponentPropsWithoutRef<"input"> & {
  wrapperClassName?: string;
};

export const SmoothCaretInput = forwardRef<HTMLInputElement, SmoothCaretInputProps>(
  function SmoothCaretInput(
    {
      className,
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      type = "text",
      style,
      disabled,
      readOnly,
      ...props
    },
    forwardedRef,
  ) {
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const caretX = useMotionValue(0);
    const caretOpacity = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = useReducedMotion();
    const isControlled = value !== undefined;
    const springCaretX = useSpring(
      caretX,
      prefersReducedMotion ? REDUCED_MOTION_SPRING : SPRING,
    );
    const inputValue = isControlled ? String(value ?? "") : internalValue;
    const showSmoothCaret = type !== "file" && type !== "hidden" && !readOnly;

    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    const syncMeasureSpan = () => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return;

      const styles = window.getComputedStyle(input);
      const isPassword = input.type === "password";

      let fontSize = styles.fontSize;
      if (
        PASSWORD_CHAR === "\u2022" &&
        isPassword &&
        !navigator.userAgent.match(/chrome|chromium|crios/i)
      ) {
        fontSize = `${parseFloat(fontSize) + 6.25}px`;
      }

      measureSpan.style.font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize} ${styles.fontFamily}`;
      measureSpan.style.letterSpacing = styles.letterSpacing;
      measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings;
      measureSpan.style.fontVariationSettings = styles.fontVariationSettings;
    };

    const measurePrefixWidth = (text: string) => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return null;

      syncMeasureSpan();
      measureSpan.textContent = text;

      const paddingLeft = parseFloat(window.getComputedStyle(input).paddingLeft) || 0;

      return text.length > 0 ? measureSpan.offsetWidth + paddingLeft : paddingLeft - 1;
    };

    const scrollCaretIntoView = (target: HTMLInputElement, absoluteWidth: number) => {
      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
      const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
      const visibleLeft = target.scrollLeft + paddingLeft;

      if (absoluteWidth > visibleRight) {
        target.scrollLeft = Math.min(
          absoluteWidth - target.clientWidth + paddingRight,
          maxScroll,
        );
        return;
      }

      if (absoluteWidth < visibleLeft) {
        target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
      }
    };

    const getCaretIndex = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;

      if (selectionStart === selectionEnd) {
        return selectionStart;
      }

      return target.selectionDirection === "backward" ? selectionStart : selectionEnd;
    };

    const updateCaretFromInput = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;
      const caretIndex = getCaretIndex(target);
      const isPassword = target.type === "password";
      const textBeforeCaret = isPassword
        ? PASSWORD_CHAR.repeat(caretIndex)
        : target.value.slice(0, caretIndex);

      const absoluteWidth = measurePrefixWidth(textBeforeCaret);
      if (absoluteWidth === null) return;

      scrollCaretIntoView(target, absoluteWidth);

      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const caretPosition = absoluteWidth - target.scrollLeft;
      const minX = paddingLeft - 1;
      const maxX = target.clientWidth - paddingRight;
      const isCaretVisible = caretPosition >= minX && caretPosition <= maxX + 1;

      caretX.set(Math.min(caretPosition, maxX));

      if (!isCaretVisible || hasSelection || disabled) {
        caretOpacity.set(0);
        return;
      }

      caretOpacity.set(1);
    };

    const updateCaretRef = useRef(updateCaretFromInput);
    updateCaretRef.current = updateCaretFromInput;
    const caretOpacityRef = useRef(caretOpacity);
    caretOpacityRef.current = caretOpacity;

    useEffect(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) {
        updateCaretRef.current(input);
      }
    }, [inputValue, type]);

    useEffect(() => {
      const input = inputRef.current;
      const container = containerRef.current;
      if (!input || !container || !showSmoothCaret) return;

      const updateCaretIfFocused = () => {
        if (document.activeElement === input) {
          updateCaretRef.current(input);
        }
      };

      const handleSelectionChange = () => {
        if (document.activeElement !== input) return;

        requestAnimationFrame(() => {
          if (document.activeElement === input) {
            updateCaretRef.current(input);
          }
        });
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      document.fonts.addEventListener("loadingdone", updateCaretIfFocused);
      void document.fonts.ready.then(updateCaretIfFocused);
      input.addEventListener("scroll", updateCaretIfFocused);

      const resizeObserver = new ResizeObserver(updateCaretIfFocused);
      resizeObserver.observe(container);

      updateCaretIfFocused();

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        document.fonts.removeEventListener("loadingdone", updateCaretIfFocused);
        input.removeEventListener("scroll", updateCaretIfFocused);
        resizeObserver.disconnect();
      };
    }, [showSmoothCaret]);

    const inputClassName = cn(
      "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
      showSmoothCaret && "caret-transparent",
      className,
    );

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(event.target.value);
      }
      onChange?.(event);
      if (showSmoothCaret) {
        requestAnimationFrame(() => {
          updateCaretRef.current(event.target);
        });
      }
    };

    const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
      onFocus?.(event);
      if (showSmoothCaret) {
        requestAnimationFrame(() => {
          updateCaretRef.current(event.target);
        });
      }
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      caretOpacityRef.current.set(0);
      onBlur?.(event);
    };

    if (!showSmoothCaret) {
      return (
        <input
          {...props}
          ref={inputRef}
          type={type}
          value={inputValue}
          disabled={disabled}
          readOnly={readOnly}
          className={inputClassName}
          style={style}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      );
    }

    return (
      <div
        ref={containerRef}
        className={cn("relative grid w-full min-w-0 grid-cols-1", wrapperClassName)}
      >
        <input
          {...props}
          ref={inputRef}
          type={type}
          value={inputValue}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(inputClassName, "col-start-1 col-end-2 row-start-1 row-end-2")}
          style={style}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <span
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 whitespace-pre"
        />
        <motion.div
          aria-hidden
          className="pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 h-[0.9em] w-0.5 self-center bg-primary"
          style={{ x: springCaretX, opacity: caretOpacity }}
        />
      </div>
    );
  },
);

SmoothCaretInput.displayName = "SmoothCaretInput";
