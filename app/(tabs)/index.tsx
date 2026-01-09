import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  useWindowDimensions,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Shadows, BorderRadius, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";
import { getDatePartsMY, formatTimeShortMY } from "@/lib/timezone";

// マレーシア時間で時刻をフォーマット
const formatTimeLocal = (date: Date | string): string => {
  return formatTimeShortMY(date);
};

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
  repeatType?: string;
  tags?: { id: number; name: string; color: string }[];
  people?: { id: number; name: string; color: string }[];
  departments?: { id: number; name: string; color: string }[];
}

// Helper function to check if an event occurs on a specific date (including repeats)
// マレーシア時間（GMT+8）で日付を比較
function isEventOnDate(
  event: { startTime: Date | string; repeatType?: string },
  targetDate: Date
): boolean {
  // イベントの開始時間をマレーシア時間で取得
  const eventParts = getDatePartsMY(event.startTime);
  const eventYear = eventParts.year;
  const eventMonth = eventParts.month;
  const eventDay = eventParts.day;
  
  // ターゲット日付（ローカルのカレンダー日付）
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1; // getMonth()は0始まり
  const targetDay = targetDate.getDate();
  
  // ターゲットがイベント開始日より前ならマッチしない
  const targetDateNum = targetYear * 10000 + targetMonth * 100 + targetDay;
  const eventDateNum = eventYear * 10000 + eventMonth * 100 + eventDay;
  if (targetDateNum < eventDateNum) return false;

  // 同じ日付ならマッチ
  if (targetYear === eventYear && targetMonth === eventMonth && targetDay === eventDay) {
    return true;
  }

  // 繰り返しタイプをチェック
  const eventDate = new Date(event.startTime);
  switch (event.repeatType) {
    case "daily":
      return true;
    case "weekly": {
      // マレーシア時間での曜日を取得
      const eventDayOfWeek = new Date(eventYear, eventMonth - 1, eventDay).getDay();
      const targetDayOfWeek = targetDate.getDay();
      return targetDayOfWeek === eventDayOfWeek;
    }
    case "monthly":
      return targetDay === eventDay;
    case "yearly":
      return targetDay === eventDay && targetMonth === eventMonth;
    default:
      return false;
  }
}

export default function CalendarScreen() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  
  // Responsive breakpoints
  const isTablet = windowWidth >= 768;
  const isDesktop = windowWidth >= 1024;
  const maxContentWidth = isDesktop ? 1200 : isTablet ? 900 : windowWidth;

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

      // Find events for this day (including repeating events)
      const dayEvents = (events || []).filter((event) => isEventOnDate(event, date));

      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        events: dayEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: new Date(e.startTime),
          endTime: new Date(e.endTime),
          repeatType: e.repeatType,
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
    .filter((event) => isEventOnDate(event, selectedDate))
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
          <View style={[styles.loginIconContainer, { backgroundColor: colors.tintLight }]}>
            <IconSymbol name="calendar" size={48} color={colors.tint} />
          </View>
          <ThemedText type="title" style={styles.loginTitle}>
            共有カレンダー
          </ThemedText>
          <ThemedText style={[styles.loginText, { color: colors.textSecondary }]}>
            ログインして予定を管理しましょう
          </ThemedText>
          <Pressable
            style={[styles.loginButton, { backgroundColor: colors.tint }, Shadows.md]}
            onPress={() => router.push("/login")}
          >
            <ThemedText style={styles.loginButtonText}>ログイン</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // PC layout: side-by-side calendar and events
  const renderCalendarContent = () => (
    <View style={[styles.calendarSection, isDesktop && { flex: 2 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <ThemedText style={styles.headerYear}>{currentDate.getFullYear()}年</ThemedText>
          <ThemedText type="title" style={styles.headerMonth}>
            {MONTHS[currentDate.getMonth()]}
          </ThemedText>
        </View>
        <View style={styles.headerButtons}>
          <Pressable 
            onPress={goToToday} 
            style={[styles.todayButton, { backgroundColor: colors.tintLight }]}
          >
            <ThemedText style={[styles.todayButtonText, { color: colors.tint }]}>今日</ThemedText>
          </Pressable>
          <View style={styles.navButtons}>
            <Pressable onPress={goToPreviousMonth} style={[styles.navButton, { backgroundColor: colors.backgroundTertiary }]}>
              <IconSymbol name="chevron.left" size={20} color={colors.text} />
            </Pressable>
            <Pressable onPress={goToNextMonth} style={[styles.navButton, { backgroundColor: colors.backgroundTertiary }]}>
              <IconSymbol name="chevron.right" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map((day, index) => (
          <View key={day} style={styles.dayHeader}>
            <ThemedText
              style={[
                styles.dayHeaderText,
                { color: index === 0 ? colors.sunday : index === 6 ? colors.saturday : colors.textSecondary },
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
              isSelectedDate(day.date) && [styles.selectedDayCell, { backgroundColor: colors.tintLight }],
            ]}
            onPress={() => setSelectedDate(day.date)}
          >
            <View
              style={[
                styles.dayNumber,
                day.isToday && [styles.todayNumber, { backgroundColor: colors.tint }],
              ]}
            >
              <ThemedText
                style={[
                  styles.dayText,
                  !day.isCurrentMonth && { color: colors.textDisabled },
                  day.isToday && styles.todayText,
                  index % 7 === 0 && day.isCurrentMonth && !day.isToday && { color: colors.sunday },
                  index % 7 === 6 && day.isCurrentMonth && !day.isToday && { color: colors.saturday },
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

    </View>
  );

  const renderEventsSection = () => (
    <View style={[
      styles.eventsSection, 
      { backgroundColor: colors.card },
      isDesktop && styles.eventsSectionDesktop,
      Shadows.sm,
    ]}>
      <View style={styles.eventsSectionHeader}>
        <View>
          <ThemedText style={[styles.eventsSectionDate, { color: colors.textSecondary }]}>
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
          </ThemedText>
          <ThemedText type="subtitle" style={styles.eventsSectionTitle}>
            {selectedDateEvents.length > 0 ? `${selectedDateEvents.length}件の予定` : "予定なし"}
          </ThemedText>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.eventsLoading} color={colors.tint} />
      ) : selectedDateEvents.length === 0 ? (
        <View style={styles.noEvents}>
          <View style={[styles.noEventsIcon, { backgroundColor: colors.backgroundTertiary }]}>
            <IconSymbol name="calendar" size={32} color={colors.textDisabled} />
          </View>
          <ThemedText style={[styles.noEventsText, { color: colors.textSecondary }]}>
            この日の予定はありません
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={selectedDateEvents}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.eventsList}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.eventCard, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => router.push(`/event/${item.id}`)}
            >
              <View
                style={[
                  styles.eventColorBar,
                  { backgroundColor: colors.tint },
                ]}
              />
              <View style={styles.eventContent}>
                <ThemedText style={styles.eventTitle} numberOfLines={1}>
                  {item.title}
                </ThemedText>
                <View style={styles.eventTimeRow}>
                  <IconSymbol name="clock" size={14} color={colors.textSecondary} />
                  <ThemedText style={[styles.eventTime, { color: colors.textSecondary }]}>
                    {formatTimeLocal(item.startTime)} - {formatTimeLocal(item.endTime)}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.textDisabled} />
            </Pressable>
          )}
        />
      )}
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {isDesktop ? (
        // Desktop layout: side-by-side
        <View style={[styles.desktopLayout, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          {renderCalendarContent()}
          {renderEventsSection()}
        </View>
      ) : (
        // Mobile layout: stacked
        <>
          {renderCalendarContent()}
          {renderEventsSection()}
        </>
      )}

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.tint, bottom: insets.bottom + 16 }, Shadows.lg]}
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
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  calendarSection: {
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
    padding: Spacing.xxl,
  },
  loginIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  loginTitle: {
    marginBottom: Spacing.sm,
  },
  loginText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    fontSize: 15,
    lineHeight: 22,
  },
  loginButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  headerYear: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 2,
  },
  headerMonth: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  todayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  navButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaders: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.sm,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
    borderRadius: BorderRadius.md,
  },
  selectedDayCell: {
    borderRadius: BorderRadius.md,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  todayNumber: {
    // backgroundColor set inline
  },
  dayText: {
    fontSize: 15,
    fontWeight: "500",
  },
  todayText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  eventDots: {
    flexDirection: "row",
    gap: 3,
    marginTop: 3,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  eventsSection: {
    flex: 1,
    marginTop: Spacing.sm,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
  },
  eventsSectionDesktop: {
    flex: 1,
    marginTop: 0,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    marginLeft: 0,
  },
  eventsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  eventsSectionDate: {
    fontSize: 13,
    marginBottom: 2,
  },
  eventsSectionTitle: {
    fontSize: 18,
  },
  eventsLoading: {
    marginTop: Spacing.xxl,
  },
  noEvents: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Spacing.xxl,
  },
  noEventsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  noEventsText: {
    fontSize: 15,
  },
  eventsList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  eventColorBar: {
    width: 4,
    alignSelf: "stretch",
  },
  eventContent: {
    flex: 1,
    padding: Spacing.md,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  eventTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventTime: {
    fontSize: 13,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
