// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "calendar": "calendar-today",
  "calendar.badge.plus": "event",
  "person.2.fill": "people",
  "gearshape.fill": "settings",
  "plus": "add",
  "xmark": "close",
  "trash.fill": "delete",
  "pencil": "edit",
  "tag.fill": "label",
  "bell.fill": "notifications",
  "checkmark": "check",
  "chevron.left": "chevron-left",
  "clock.fill": "schedule",
  "clock": "schedule",
  "location.fill": "location-on",
  "repeat": "repeat",
  "square.and.arrow.up": "share",
  "link": "link",
  "person.badge.plus": "person-add",
  "person.fill": "person",
  "building.2.fill": "business",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
