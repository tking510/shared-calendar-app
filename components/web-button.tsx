import { Platform, Pressable, View, ViewStyle } from "react-native";
import { ReactNode, useCallback, useEffect, useRef } from "react";

interface WebButtonProps {
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  children: ReactNode;
  activeOpacity?: number;
}

export function WebButton({ onPress, style, children, activeOpacity = 0.7 }: WebButtonProps) {
  const ref = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === "web" && ref.current) {
      // Get the underlying DOM element
      const element = ref.current as unknown as HTMLElement;
      if (element) {
        element.style.cursor = "pointer";
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        
        const handleClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onPress();
        };
        
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPress();
          }
        };
        
        element.addEventListener("click", handleClick);
        element.addEventListener("keydown", handleKeyDown);
        
        return () => {
          element.removeEventListener("click", handleClick);
          element.removeEventListener("keydown", handleKeyDown);
        };
      }
    }
  }, [onPress]);

  if (Platform.OS === "web") {
    return (
      <View
        ref={ref}
        style={Array.isArray(style) ? style : [style]}
      >
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ...(Array.isArray(style) ? style : [style]),
        pressed && { opacity: activeOpacity },
      ]}
    >
      {children}
    </Pressable>
  );
}
