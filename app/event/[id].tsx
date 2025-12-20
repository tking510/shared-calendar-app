import { Link, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";

const REMINDER_LABELS: Record<number, string> = {
  5: "5分前",
  15: "15分前",
  30: "30分前",
  60: "1時間前",
  1440: "1日前",
};

const REPEAT_LABELS: Record<string, string> = {
  none: "繰り返しなし",
  daily: "毎日",
  weekly: "毎週",
  monthly: "毎月",
  yearly: "毎年",
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const eventId = parseInt(id || "0", 10);

  const { data: event, isLoading } = trpc.events.get.useQuery(
    { id: eventId },
    { enabled: eventId > 0 }
  );

  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      router.back();
    },
  });

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("この予定を削除してもよろしいですか？")) {
        deleteMutation.mutate({ id: eventId });
      }
    } else {
      Alert.alert(
        "予定を削除",
        "この予定を削除してもよろしいですか？",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除",
            style: "destructive",
            onPress: () => deleteMutation.mutate({ id: eventId }),
          },
        ]
      );
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <View style={{ ...styles.loadingContainer, backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ ...styles.loadingContainer, backgroundColor: colors.background }}>
        <ThemedText>予定が見つかりません</ThemedText>
      </View>
    );
  }

  return (
    <View style={{ ...styles.container, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          ...styles.header,
          paddingTop: Math.max(insets.top, 20),
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.tint} />
          <ThemedText style={{ color: colors.tint }}>戻る</ThemedText>
        </Pressable>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/event/edit?id=${eventId}` as any)}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <IconSymbol name="pencil" size={22} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash.fill" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Title and Tags */}
        <View style={styles.titleSection}>
          <ThemedText type="title">{event.title}</ThemedText>
          {event.tags && event.tags.length > 0 && (
            <View style={styles.tags}>
              {event.tags.map((tag) => (
                <View
                  key={tag.id}
                  style={{ ...styles.tag, backgroundColor: tag.color + "20" }}
                >
                  <View style={{ ...styles.tagDot, backgroundColor: tag.color }} />
                  <ThemedText style={{ ...styles.tagText, color: tag.color }}>
                    {tag.name}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={{ ...styles.section, backgroundColor: colors.backgroundSecondary }}>
          <View style={styles.sectionRow}>
            <IconSymbol name="clock.fill" size={20} color={colors.textSecondary} />
            <View style={styles.sectionContent}>
              <ThemedText type="defaultSemiBold">
                {formatDate(event.startTime)}
              </ThemedText>
              {!event.allDay && (
                <ThemedText style={{ color: colors.textSecondary }}>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </ThemedText>
              )}
              {event.allDay && (
                <ThemedText style={{ color: colors.textSecondary }}>終日</ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Location */}
        {event.location && (
          <View style={{ ...styles.section, backgroundColor: colors.backgroundSecondary }}>
            <View style={styles.sectionRow}>
              <IconSymbol name="location.fill" size={20} color={colors.textSecondary} />
              <View style={styles.sectionContent}>
                <ThemedText>{event.location}</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Repeat */}
        {event.repeatType !== "none" && (
          <View style={{ ...styles.section, backgroundColor: colors.backgroundSecondary }}>
            <View style={styles.sectionRow}>
              <IconSymbol name="repeat" size={20} color={colors.textSecondary} />
              <View style={styles.sectionContent}>
                <ThemedText>{REPEAT_LABELS[event.repeatType]}</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Reminders */}
        {event.reminders && event.reminders.length > 0 && (
          <View style={{ ...styles.section, backgroundColor: colors.backgroundSecondary }}>
            <View style={styles.sectionRow}>
              <IconSymbol name="bell.fill" size={20} color={colors.textSecondary} />
              <View style={styles.sectionContent}>
                <ThemedText type="defaultSemiBold">リマインダー</ThemedText>
                {event.reminders.map((reminder, index) => (
                  <ThemedText key={index} style={{ color: colors.textSecondary }}>
                    {REMINDER_LABELS[reminder.minutesBefore] || `${reminder.minutesBefore}分前`}
                  </ThemedText>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View style={{ ...styles.section, backgroundColor: colors.backgroundSecondary }}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
              メモ
            </ThemedText>
            <ThemedText style={{ color: colors.textSecondary, lineHeight: 22 }}>
              {event.description}
            </ThemedText>
          </View>
        )}

        {/* Delete Button */}
        <Link href={`/event/delete/${eventId}` as any} asChild>
          <Pressable style={{ ...styles.deleteButton, borderColor: colors.error }}>
            <IconSymbol name="trash.fill" size={20} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: "600" }}>
              この予定を削除
            </ThemedText>
          </Pressable>
        </Link>
      </ScrollView>
    </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  titleSection: {
    gap: 12,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    padding: 16,
    borderRadius: 12,
  },
  sectionRow: {
    flexDirection: "row",
    gap: 12,
  },
  sectionContent: {
    flex: 1,
    gap: 4,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
});
