import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { ActivityIndicator, StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";

export default function DeleteEventScreen() {
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

  const utils = trpc.useUtils();
  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      router.replace("/(tabs)");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ id: eventId });
  };

  if (isLoading) {
    return (
      <View style={{ ...styles.container, backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ ...styles.container, backgroundColor: colors.background }}>
        <ThemedText>予定が見つかりません</ThemedText>
      </View>
    );
  }

  return (
    <View
      style={{
        ...styles.container,
        backgroundColor: colors.background,
        paddingTop: Math.max(insets.top, 40),
        paddingBottom: Math.max(insets.bottom, 20),
      }}
    >
      <View style={styles.content}>
        <View style={{ ...styles.iconContainer, backgroundColor: colors.error + "20" }}>
          <IconSymbol name="trash.fill" size={48} color={colors.error} />
        </View>

        <ThemedText type="title" style={styles.title}>
          予定を削除
        </ThemedText>

        <ThemedText style={{ ...styles.message, color: colors.textSecondary }}>
          「{event.title}」を削除してもよろしいですか？
        </ThemedText>

        <ThemedText style={{ ...styles.warning, color: colors.textSecondary }}>
          この操作は取り消せません。
        </ThemedText>
      </View>

      <View style={styles.buttons}>
        <Link href={`/event/${eventId}` as any} asChild>
          <Pressable style={{ ...styles.button, ...styles.cancelButton, borderColor: colors.border }}>
            <ThemedText style={{ fontWeight: "600" }}>キャンセル</ThemedText>
          </Pressable>
        </Link>

        <Pressable
          onPress={handleDelete}
          style={{ ...styles.button, ...styles.deleteButton, backgroundColor: colors.error }}
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>削除する</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  warning: {
    textAlign: "center",
    fontSize: 14,
  },
  buttons: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteButton: {},
});
