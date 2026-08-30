import type { RetroDitherOptions } from "./RetroDither";

type RgbTriplet = [number, number, number];

/** Fallback primary teal + chrome (#f5f6f6 wash) */
export const DITHER_THEME_FALLBACK: Pick<
  RetroDitherOptions,
  "darkColor" | "lightColor" | "colorize"
> = {
  darkColor: [0.0, 0.47, 0.42],
  lightColor: [0.96, 0.99, 0.98],
  colorize: 1,
};

function parseCssRgb(color: string): RgbTriplet | null {
  const match = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (!match) return null;
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
}

/** Resolve axiom theme colors from computed CSS (primary + accent). */
export function readDitherThemeColors(): Pick<
  RetroDitherOptions,
  "darkColor" | "lightColor"
> {
  if (typeof document === "undefined") {
    return {
      darkColor: DITHER_THEME_FALLBACK.darkColor,
      lightColor: DITHER_THEME_FALLBACK.lightColor,
    };
  }

  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.inset = "0";
  document.body.appendChild(probe);

  probe.style.color = "var(--primary)";
  const dark =
    parseCssRgb(getComputedStyle(probe).color) ?? DITHER_THEME_FALLBACK.darkColor;

  probe.style.color = "";
  probe.style.backgroundColor = "var(--accent)";
  const light =
    parseCssRgb(getComputedStyle(probe).backgroundColor) ??
    DITHER_THEME_FALLBACK.lightColor;

  document.body.removeChild(probe);

  return { darkColor: dark, lightColor: light };
}

export const DITHER_BASE_OPTIONS: Omit<
  RetroDitherOptions,
  "darkColor" | "lightColor" | "colorize"
> = {
  radius: 0.5,
  softness: 1,
  pixelSize: 2,
  levels: 4,
  contrast: 0.5,
  brightness: 0.04,
  strength: 0.82,
  baseStrength: 0.05,
  invert: 0,
  scanlines: 0,
  pattern: "bayer",
  trail: 0.45,
  degauss: 0.8,
  followSpeed: 3,
};
