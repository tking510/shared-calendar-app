/**
 * Calendar App Theme Colors
 * Modern, clean design with improved readability
 */

import { Platform } from "react-native";

// Primary brand color - warm coral/salmon for a friendly feel
const tintColorLight = "#E85D4C";
const tintColorDark = "#FF7A6B";

export const Colors = {
  light: {
    // Text colors with better contrast
    text: "#1A1A2E",
    textSecondary: "#6B7280",
    textDisabled: "#9CA3AF",
    
    // Background colors
    background: "#FAFBFC",
    backgroundSecondary: "#FFFFFF",
    backgroundTertiary: "#F3F4F6",
    
    // Brand colors
    tint: tintColorLight,
    tintLight: "#FEF2F2",
    
    // UI elements
    icon: "#6B7280",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColorLight,
    border: "#E5E7EB",
    borderLight: "#F3F4F6",
    
    // Status colors
    success: "#10B981",
    successLight: "#D1FAE5",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    
    // Card and surface
    card: "#FFFFFF",
    cardElevated: "#FFFFFF",
    
    // Calendar specific
    sunday: "#EF4444",
    saturday: "#3B82F6",
    today: tintColorLight,
  },
  dark: {
    // Text colors
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    textDisabled: "#4B5563",
    
    // Background colors
    background: "#0F172A",
    backgroundSecondary: "#1E293B",
    backgroundTertiary: "#334155",
    
    // Brand colors
    tint: tintColorDark,
    tintLight: "#3B1A1A",
    
    // UI elements
    icon: "#9CA3AF",
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColorDark,
    border: "#334155",
    borderLight: "#1E293B",
    
    // Status colors
    success: "#34D399",
    successLight: "#064E3B",
    warning: "#FBBF24",
    warningLight: "#78350F",
    error: "#F87171",
    errorLight: "#7F1D1D",
    
    // Card and surface
    card: "#1E293B",
    cardElevated: "#334155",
    
    // Calendar specific
    sunday: "#F87171",
    saturday: "#60A5FA",
    today: tintColorDark,
  },
};

// Preset tag colors - vibrant but not overwhelming
export const TagColors = [
  "#3B82F6", // Blue - Work
  "#10B981", // Emerald - Personal
  "#F59E0B", // Amber - Family
  "#EF4444", // Red - Important
  "#8B5CF6", // Purple - Hobby
  "#06B6D4", // Cyan - Health
  "#6366F1", // Indigo
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Orange
];

// Spacing scale (8pt grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Border radius scale
export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

// Shadow presets
export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

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
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
