import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
  Modal,
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

export default function SharedCalendarsScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: calendars, isLoading, refetch } = trpc.calendars.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createMutation = trpc.calendars.create.useMutation({
    onSuccess: (data) => {
      setShowCreateModal(false);
      setNewCalendarName("");
      refetch();
      Alert.alert(
        "カレンダーを作成しました",
        `招待コード: ${data.inviteCode}\n\nこのコードを共有相手に送ってください。`,
        [
          {
            text: "コードをコピー",
            onPress: () => Clipboard.setStringAsync(data.inviteCode),
          },
          { text: "OK" },
        ]
      );
    },
    onError: (error) => {
      Alert.alert("エラー", error.message);
    },
  });

  const joinMutation = trpc.calendars.join.useMutation({
    onSuccess: (data) => {
      setShowJoinModal(false);
      setInviteCode("");
      refetch();
      Alert.alert("参加しました", `「${data.name}」に参加しました。`);
    },
    onError: (error) => {
      Alert.alert("エラー", "招待コードが無効です。");
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreate = () => {
    if (!newCalendarName.trim()) {
      Alert.alert("エラー", "カレンダー名を入力してください");
      return;
    }
    createMutation.mutate({ name: newCalendarName.trim() });
  };

  const handleJoin = () => {
    if (inviteCode.length !== 8) {
      Alert.alert("エラー", "招待コードは8文字です");
      return;
    }
    joinMutation.mutate({ inviteCode: inviteCode.toUpperCase() });
  };

  const copyInviteCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert("コピーしました", "招待コードをクリップボードにコピーしました");
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
          <IconSymbol name="person.2.fill" size={64} color={colors.tint} />
          <ThemedText type="title" style={styles.loginTitle}>
            共有カレンダー
          </ThemedText>
          <ThemedText style={[styles.loginText, { color: colors.textSecondary }]}>
            ログインしてカレンダーを共有しましょう
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
        <ThemedText type="title">共有カレンダー</ThemedText>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.tint }]}
          onPress={() => setShowCreateModal(true)}
        >
          <IconSymbol name="plus" size={20} color="#FFFFFF" />
          <ThemedText style={styles.actionButtonText}>新規作成</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => setShowJoinModal(true)}
        >
          <IconSymbol name="link" size={20} color={colors.tint} />
          <ThemedText style={[styles.actionButtonText, { color: colors.tint }]}>
            コードで参加
          </ThemedText>
        </Pressable>
      </View>

      {/* Calendar List */}
      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.tint} />
      ) : calendars && calendars.length > 0 ? (
        <FlatList
          data={calendars}
          keyExtractor={(item) => item.calendar.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.calendarCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/calendar/${item.calendar.id}` as any)}
            >
              <View style={styles.calendarInfo}>
                <ThemedText type="defaultSemiBold">{item.calendar.name}</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
                  {item.role === "owner" ? "オーナー" : item.role === "editor" ? "編集者" : "閲覧者"}
                </ThemedText>
              </View>
              {item.role === "owner" && (
                <Pressable
                  style={styles.copyButton}
                  onPress={() => copyInviteCode(item.calendar.inviteCode)}
                >
                  <IconSymbol name="square.and.arrow.up" size={20} color={colors.tint} />
                </Pressable>
              )}
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2.fill" size={48} color={colors.textDisabled} />
          <ThemedText style={{ color: colors.textSecondary, marginTop: 12 }}>
            共有カレンダーがありません
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
            新規作成するか、招待コードで参加してください
          </ThemedText>
        </View>
      )}

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCreateModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">新規カレンダー</ThemedText>
            <Pressable onPress={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>作成</ThemedText>
              )}
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="カレンダー名"
                placeholderTextColor={colors.textDisabled}
                value={newCalendarName}
                onChangeText={setNewCalendarName}
                autoFocus
              />
            </View>
          </View>
        </ThemedView>
      </Modal>

      {/* Join Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowJoinModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">カレンダーに参加</ThemedText>
            <Pressable onPress={handleJoin} disabled={joinMutation.isPending}>
              {joinMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>参加</ThemedText>
              )}
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <ThemedText style={{ color: colors.textSecondary, marginBottom: 16 }}>
              共有相手から受け取った8文字の招待コードを入力してください
            </ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, styles.codeInput, { color: colors.text }]}
                placeholder="招待コード"
                placeholderTextColor={colors.textDisabled}
                value={inviteCode}
                onChangeText={(text) => setInviteCode(text.toUpperCase())}
                maxLength={8}
                autoCapitalize="characters"
                autoFocus
              />
            </View>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  loading: {
    marginTop: 32,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  calendarCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  calendarInfo: {
    flex: 1,
    gap: 4,
  },
  copyButton: {
    padding: 8,
    marginRight: 8,
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
  modalContent: {
    padding: 16,
  },
  inputContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  input: {
    fontSize: 17,
    padding: 16,
  },
  codeInput: {
    textAlign: "center",
    letterSpacing: 4,
    fontSize: 20,
    fontWeight: "600",
  },
});
