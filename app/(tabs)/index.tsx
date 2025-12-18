import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: EventWithTags[];
}

interface EventWithTags {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  tags?: { id: number; name: string; color: string }[];
}

export default function CalendarScreen() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Get first and last day of month for query
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

  const { data: events, isLoading, refetch } = trpc.events.list.useQuery(
    {
      startDate: firstDayOfMonth.toISOString(),
      endDate: lastDayOfMonth.toISOString(),
    },
    { enabled: isAuthenticated }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Generate calendar days
  const generateCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();

    // Days from previous month
    const prevMonth = new Date(year, month, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: [],
      });
    }

    // Days of current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      // Find events for this day
      const dayEvents = (events || []).filter((event) => {
        const eventDate = new Date(event.startTime);
        return (
          eventDate.getDate() === i &&
          eventDate.getMonth() === month &&
          eventDate.getFullYear() === year
        );
      });

      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        events: dayEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: new Date(e.startTime),
          endTime: new Date(e.endTime),
        })),
      });
    }

    // Days from next month to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: [],
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get events for selected date
  const selectedDateEvents = (events || [])
    .filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      );
    })
    .map((e) => ({
      ...e,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
    }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isSelectedDate = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  if (authLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loginPrompt}>
          <IconSymbol name="calendar" size={64} color={colors.tint} />
          <ThemedText type="title" style={styles.loginTitle}>
            共有カレンダー
          </ThemedText>
          <ThemedText style={[styles.loginText, { color: colors.textSecondary }]}>
            ログインして予定を管理しましょう
          </ThemedText>
          <Pressable
            style={[styles.loginButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push("/login")}
          >
            <ThemedText style={styles.loginButtonText}>ログイン</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <ThemedText type="title">
            {currentDate.getFullYear()}年 {MONTHS[currentDate.getMonth()]}
          </ThemedText>
        </View>
        <View style={styles.headerButtons}>
          <Pressable onPress={goToToday} style={styles.todayButton}>
            <ThemedText style={{ color: colors.tint }}>今日</ThemedText>
          </Pressable>
          <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.tint} />
          </Pressable>
          <Pressable onPress={goToNextMonth} style={styles.navButton}>
            <IconSymbol name="chevron.right" size={24} color={colors.tint} />
          </Pressable>
        </View>
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map((day, index) => (
          <View key={day} style={styles.dayHeader}>
            <ThemedText
              style={[
                styles.dayHeaderText,
                { color: index === 0 ? colors.error : index === 6 ? colors.tint : colors.textSecondary },
              ]}
            >
              {day}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => (
          <Pressable
            key={index}
            style={[
              styles.dayCell,
              isSelectedDate(day.date) && { backgroundColor: colors.tint + "20" },
            ]}
            onPress={() => setSelectedDate(day.date)}
          >
            <View
              style={[
                styles.dayNumber,
                day.isToday && { backgroundColor: colors.tint },
              ]}
            >
              <ThemedText
                style={[
                  styles.dayText,
                  !day.isCurrentMonth && { color: colors.textDisabled },
                  day.isToday && { color: "#FFFFFF" },
                  index % 7 === 0 && day.isCurrentMonth && !day.isToday && { color: colors.error },
                  index % 7 === 6 && day.isCurrentMonth && !day.isToday && { color: colors.tint },
                ]}
              >
                {day.date.getDate()}
              </ThemedText>
            </View>
            {/* Event dots */}
            {day.events.length > 0 && (
              <View style={styles.eventDots}>
                {day.events.slice(0, 3).map((event, i) => (
                  <View
                    key={i}
                    style={[
                      styles.eventDot,
                      { backgroundColor: event.tags?.[0]?.color || colors.tint },
                    ]}
                  />
                ))}
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Selected date events */}
      <View style={[styles.eventsSection, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.eventsSectionHeader}>
          <ThemedText type="subtitle">
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日の予定
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>
            {selectedDateEvents.length}件
          </ThemedText>
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.eventsLoading} color={colors.tint} />
        ) : selectedDateEvents.length === 0 ? (
          <View style={styles.noEvents}>
            <ThemedText style={{ color: colors.textSecondary }}>
              予定はありません
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={selectedDateEvents}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.eventCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/event/${item.id}`)}
              >
                <View
                  style={[
                    styles.eventColorBar,
                    { backgroundColor: colors.tint },
                  ]}
                />
                <View style={styles.eventContent}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
                    {item.startTime.getHours().toString().padStart(2, "0")}:
                    {item.startTime.getMinutes().toString().padStart(2, "0")} -
                    {item.endTime.getHours().toString().padStart(2, "0")}:
                    {item.endTime.getMinutes().toString().padStart(2, "0")}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          />
        )}
      </View>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.tint, bottom: insets.bottom + 16 }]}
        onPress={() => router.push(`/event/new?date=${selectedDate.toISOString()}`)}
      >
        <IconSymbol name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loginPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loginTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  loginText: {
    textAlign: "center",
    marginBottom: 24,
  },
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navButton: {
    padding: 8,
  },
  dayHeaders: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
    borderRadius: 8,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  eventDots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventsSection: {
    flex: 1,
    marginTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  eventsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  eventsLoading: {
    marginTop: 32,
  },
  noEvents: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  eventColorBar: {
    width: 4,
    height: "100%",
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
