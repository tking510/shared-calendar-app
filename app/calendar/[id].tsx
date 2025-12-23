import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";
import { MALAYSIA_TIMEZONE, formatTimeShortMY } from "@/lib/timezone";

export default function SharedCalendarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const calendarId = parseInt(id || "0", 10);

  const { data: calendar, isLoading, refetch } = trpc.calendars.get.useQuery(
    { id: calendarId },
    { enabled: isAuthenticated && calendarId > 0 }
  );

  const { data: events, refetch: refetchEvents } = trpc.calendars.getEvents.useQuery(
    { calendarId },
    { enabled: isAuthenticated && calendarId > 0 }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchEvents()]);
    setRefreshing(false);
  }, [refetch, refetchEvents]);

  const copyInviteCode = async () => {
    if (calendar?.calendar.inviteCode) {
      await Clipboard.setStringAsync(calendar.calendar.inviteCode);
      Alert.alert("コピーしました", "招待コードをクリップボードにコピーしました");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      timeZone: MALAYSIA_TIMEZONE,
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatTime = (dateString: string) => {
    return formatTimeShortMY(dateString);
  };

  // Navigate to new event screen with calendarId
  const handleAddEvent = () => {
    router.push(`/event/new?calendarId=${calendarId}` as any);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!calendar) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.tint} />
          </Pressable>
          <ThemedText type="title">エラー</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <ThemedText style={{ color: colors.textSecondary }}>
            カレンダーが見つかりません
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Check if user can add events (owner or editor)
  const canAddEvents = calendar.role === "owner" || calendar.role === "editor";

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.tint} />
        </Pressable>
        <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.headerTitle}>
          {calendar.calendar.name}
        </ThemedText>
        <Pressable onPress={() => setShowMembersModal(true)} style={styles.headerButton}>
          <IconSymbol name="person.2.fill" size={24} color={colors.tint} />
        </Pressable>
      </View>

      {/* Calendar Info Card */}
      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <ThemedText style={{ color: colors.textSecondary }}>あなたの役割</ThemedText>
          <ThemedText type="defaultSemiBold">
            {calendar.role === "owner" ? "オーナー" : calendar.role === "editor" ? "編集者" : "閲覧者"}
          </ThemedText>
        </View>
        {calendar.role === "owner" && (
          <View style={styles.infoRow}>
            <ThemedText style={{ color: colors.textSecondary }}>招待コード</ThemedText>
            <Pressable onPress={copyInviteCode} style={styles.codeContainer}>
              <ThemedText type="defaultSemiBold" style={{ letterSpacing: 2 }}>
                {calendar.calendar.inviteCode}
              </ThemedText>
              <IconSymbol name="doc.on.doc" size={16} color={colors.tint} />
            </Pressable>
          </View>
        )}
        <View style={styles.infoRow}>
          <ThemedText style={{ color: colors.textSecondary }}>メンバー数</ThemedText>
          <ThemedText type="defaultSemiBold">{calendar.members?.length || 0}人</ThemedText>
        </View>
      </View>

      {/* Events List */}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">予定一覧</ThemedText>
        {canAddEvents && (
          <Pressable 
            onPress={handleAddEvent} 
            style={[styles.addButton, { backgroundColor: colors.tint }]}
          >
            <IconSymbol name="plus" size={16} color="#FFFFFF" />
            <ThemedText style={styles.addButtonText}>予定を追加</ThemedText>
          </Pressable>
        )}
      </View>

      {events && events.length > 0 ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.eventCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/event/${item.id}` as any)}
            >
              <View style={[styles.eventColorBar, { backgroundColor: colors.tint }]} />
              <View style={styles.eventInfo}>
                <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
                  {formatDate(item.startTime.toString())} {formatTime(item.startTime.toString())}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="calendar" size={48} color={colors.textDisabled} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 12 }}>
            予定がありません
          </ThemedText>
          {canAddEvents && (
            <Pressable 
              onPress={handleAddEvent}
              style={[styles.emptyAddButton, { backgroundColor: colors.tint }]}
            >
              <ThemedText style={styles.addButtonText}>予定を追加する</ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {/* Members Modal */}
      <Modal
        visible={showMembersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <View style={{ width: 60 }} />
            <ThemedText type="defaultSemiBold">メンバー</ThemedText>
            <Pressable onPress={() => setShowMembersModal(false)}>
              <ThemedText style={{ color: colors.tint }}>閉じる</ThemedText>
            </Pressable>
          </View>
          <FlatList
            data={calendar.members || []}
            keyExtractor={(item) => item.user.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.memberCard, { backgroundColor: colors.card }]}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.tint }]}>
                  <ThemedText style={styles.memberAvatarText}>
                    {(item.user.name || item.user.email || "?").charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.memberInfo}>
                  <ThemedText type="defaultSemiBold">{item.user.name || item.user.email || "不明"}</ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
                    {item.role === "owner" ? "オーナー" : item.role === "editor" ? "編集者" : "閲覧者"}
                  </ThemedText>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={{ color: colors.textSecondary }}>
                  メンバーがいません
                </ThemedText>
              </View>
            }
          />
        </ThemedView>
      </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  infoCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyAddButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
});
