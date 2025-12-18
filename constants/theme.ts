/**
 * Calendar App Theme Colors
 */

import { Platform } from "react-native";

const tintColorLight = "#007AFF";
const tintColorDark = "#0A84FF";

export const Colors = {
  light: {
    text: "#1C1C1E",
    textSecondary: "#8E8E93",
    textDisabled: "#C7C7CC",
    background: "#FFFFFF",
    backgroundSecondary: "#F2F2F7",
    tint: tintColorLight,
    icon: "#8E8E93",
    tabIconDefault: "#8E8E93",
    tabIconSelected: tintColorLight,
    border: "#E5E5EA",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    card: "#FFFFFF",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    textDisabled: "#48484A",
    background: "#000000",
    backgroundSecondary: "#1C1C1E",
    tint: tintColorDark,
    icon: "#8E8E93",
    tabIconDefault: "#8E8E93",
    tabIconSelected: tintColorDark,
    border: "#38383A",
    success: "#30D158",
    warning: "#FF9F0A",
    error: "#FF453A",
    card: "#1C1C1E",
  },
};

// Preset tag colors
export const TagColors = [
  "#007AFF", // Blue - Work
  "#34C759", // Green - Personal
  "#FF9500", // Orange - Family
  "#FF3B30", // Red - Important
  "#AF52DE", // Purple - Hobby
  "#00C7BE", // Teal - Health
  "#5856D6", // Indigo
  "#FF2D55", // Pink
];

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
