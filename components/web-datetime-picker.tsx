import { Platform, View, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface WebDateTimePickerProps {
  value: Date;
  mode: "date" | "time";
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
}

export function WebDateTimePicker({
  value,
  mode,
  onChange,
  onClose,
  minimumDate,
}: WebDateTimePickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  
  const [selectedDate, setSelectedDate] = useState(value);
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());

  // Generate arrays for picker
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  
  // Generate days for current month
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Generate months
  const months = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];
  
  // Generate years (current year ± 5)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleConfirm = () => {
    if (mode === "date") {
      const newDate = new Date(selectedDate);
      newDate.setHours(value.getHours(), value.getMinutes());
      onChange(newDate);
    } else {
      const newDate = new Date(value);
      newDate.setHours(selectedHour, selectedMinute);
      onChange(newDate);
    }
    onClose();
  };

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Pressable onPress={onClose} style={styles.headerButton}>
                <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
              </Pressable>
              <ThemedText type="defaultSemiBold">
                {mode === "date" ? "日付を選択" : "時刻を選択"}
              </ThemedText>
              <Pressable onPress={handleConfirm} style={styles.headerButton}>
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>完了</ThemedText>
              </Pressable>
            </View>

            {mode === "date" ? (
              <View style={styles.datePickerContainer}>
                {/* Year */}
                <View style={styles.pickerColumn}>
                  <ThemedText style={[styles.pickerLabel, { color: colors.textSecondary }]}>年</ThemedText>
                  <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                    {years.map((y) => (
                      <Pressable
                        key={y}
                        style={[
                          styles.pickerItem,
                          selectedDate.getFullYear() === y && { backgroundColor: colors.tint + "20" },
                        ]}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setFullYear(y);
                          setSelectedDate(newDate);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.pickerItemText,
                            selectedDate.getFullYear() === y && { color: colors.tint, fontWeight: "600" },
                          ]}
                        >
                          {y}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Month */}
                <View style={styles.pickerColumn}>
                  <ThemedText style={[styles.pickerLabel, { color: colors.textSecondary }]}>月</ThemedText>
                  <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                    {months.map((m, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.pickerItem,
                          selectedDate.getMonth() === index && { backgroundColor: colors.tint + "20" },
                        ]}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(index);
                          setSelectedDate(newDate);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.pickerItemText,
                            selectedDate.getMonth() === index && { color: colors.tint, fontWeight: "600" },
                          ]}
                        >
                          {m}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Day */}
                <View style={styles.pickerColumn}>
                  <ThemedText style={[styles.pickerLabel, { color: colors.textSecondary }]}>日</ThemedText>
                  <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                    {days.map((d) => (
                      <Pressable
                        key={d}
                        style={[
                          styles.pickerItem,
                          selectedDate.getDate() === d && { backgroundColor: colors.tint + "20" },
                        ]}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(d);
                          setSelectedDate(newDate);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.pickerItemText,
                            selectedDate.getDate() === d && { color: colors.tint, fontWeight: "600" },
                          ]}
                        >
                          {d}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            ) : (
              <View style={styles.timePickerContainer}>
                {/* Hour */}
                <View style={styles.pickerColumn}>
                  <ThemedText style={[styles.pickerLabel, { color: colors.textSecondary }]}>時</ThemedText>
                  <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                    {hours.map((h) => (
                      <Pressable
                        key={h}
                        style={[
                          styles.pickerItem,
                          selectedHour === h && { backgroundColor: colors.tint + "20" },
                        ]}
                        onPress={() => setSelectedHour(h)}
                      >
                        <ThemedText
                          style={[
                            styles.pickerItemText,
                            selectedHour === h && { color: colors.tint, fontWeight: "600" },
                          ]}
                        >
                          {h.toString().padStart(2, "0")}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Minute */}
                <View style={styles.pickerColumn}>
                  <ThemedText style={[styles.pickerLabel, { color: colors.textSecondary }]}>分</ThemedText>
                  <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                    {minutes.map((m) => (
                      <Pressable
                        key={m}
                        style={[
                          styles.pickerItem,
                          selectedMinute === m && { backgroundColor: colors.tint + "20" },
                        ]}
                        onPress={() => setSelectedMinute(m)}
                      >
                        <ThemedText
                          style={[
                            styles.pickerItemText,
                            selectedMinute === m && { color: colors.tint, fontWeight: "600" },
                          ]}
                        >
                          {m.toString().padStart(2, "0")}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: 320,
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  datePickerContainer: {
    flexDirection: "row",
    padding: 16,
  },
  timePickerContainer: {
    flexDirection: "row",
    padding: 16,
    justifyContent: "center",
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  pickerScroll: {
    height: 200,
    width: "100%",
  },
  pickerItem: {
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemText: {
    fontSize: 16,
  },
});
