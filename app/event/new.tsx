import DateTimePicker from "@react-native-community/datetimepicker";
import { WebDateTimePicker } from "@/components/web-datetime-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";

const REMINDER_OPTIONS = [
  { value: 5, label: "5分前" },
  { value: 15, label: "15分前" },
  { value: 30, label: "30分前" },
  { value: 60, label: "1時間前" },
  { value: 1440, label: "1日前" },
];

const REPEAT_OPTIONS = [
  { value: "none", label: "繰り返しなし" },
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "monthly", label: "毎月" },
  { value: "yearly", label: "毎年" },
];

export default function NewEventScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  
  // Responsive breakpoints
  const isTablet = windowWidth >= 768;
  const isDesktop = windowWidth >= 1024;
  const maxContentWidth = isDesktop ? 800 : isTablet ? 600 : windowWidth;

  const initialDate = date ? new Date(date) : new Date();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(new Date(initialDate.getTime() + 60 * 60 * 1000));
  const allDay = false; // 終日オプションは無効化
  const [repeatType, setRepeatType] = useState<"none" | "daily" | "weekly" | "monthly" | "yearly">("none");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedReminders, setSelectedReminders] = useState<number[]>([15]);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const { data: tags } = trpc.tags.list.useQuery();
  const { data: friends } = trpc.friends.list.useQuery();
  const { data: departments } = trpc.departments.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      // Invalidate events cache to refresh the calendar
      utils.events.list.invalidate();
      router.back();
    },
    onError: (error) => {
      Alert.alert("エラー", error.message);
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("エラー", "タイトルを入力してください");
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTime: formatLocalDateTime(startDate),
      endTime: formatLocalDateTime(endDate),
      allDay,
      repeatType,
      tagIds: selectedTags,
      reminderMinutes: selectedReminders,
      friendIds: selectedFriends,
      customMessage: customMessage.trim() || undefined,
      departmentIds: selectedDepartments,
    });
  };

  const formatDate = (d: Date) => {
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  };

  const formatTime = (d: Date) => {
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  // Format date as local ISO string (without timezone conversion)
  const formatLocalDateTime = (d: Date) => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const seconds = d.getSeconds().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleReminder = (minutes: number) => {
    setSelectedReminders((prev) =>
      prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes]
    );
  };

  const toggleFriend = (friendId: number) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const toggleDepartment = (departmentId: number) => {
    setSelectedDepartments((prev) =>
      prev.includes(departmentId) ? prev.filter((id) => id !== departmentId) : [...prev, departmentId]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
        </Pressable>
        <ThemedText type="defaultSemiBold">新規予定</ThemedText>
        <Pressable
          onPress={handleSave}
          style={styles.headerButton}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>保存</ThemedText>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, isDesktop && { alignItems: 'center' }]}>
        {/* Title */}
        <View style={[styles.inputSection, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            placeholder="タイトル"
            placeholderTextColor={colors.textDisabled}
            value={title}
            onChangeText={setTitle}
          />
        </View>



        {/* Date & Time */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <Pressable
            style={styles.dateTimeRow}
            onPress={() => setShowStartDatePicker(true)}
          >
            <ThemedText>開始日</ThemedText>
            <ThemedText style={{ color: colors.tint }}>{formatDate(startDate)}</ThemedText>
          </Pressable>
          <Pressable
            style={styles.dateTimeRow}
            onPress={() => setShowStartTimePicker(true)}
          >
            <ThemedText>開始時刻</ThemedText>
            <ThemedText style={{ color: colors.tint }}>{formatTime(startDate)}</ThemedText>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            style={styles.dateTimeRow}
            onPress={() => setShowEndDatePicker(true)}
          >
            <ThemedText>終了日</ThemedText>
            <ThemedText style={{ color: colors.tint }}>{formatDate(endDate)}</ThemedText>
          </Pressable>
          <Pressable
            style={styles.dateTimeRow}
            onPress={() => setShowEndTimePicker(true)}
          >
            <ThemedText>終了時刻</ThemedText>
            <ThemedText style={{ color: colors.tint }}>{formatTime(endDate)}</ThemedText>
          </Pressable>
        </View>

        {/* Date/Time Pickers */}
        {/* Date/Time Pickers - Web */}
        {Platform.OS === "web" && showStartDatePicker && (
          <WebDateTimePicker
            value={startDate}
            mode="date"
            onChange={(date) => {
              const newDate = new Date(startDate);
              newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
              setStartDate(newDate);
              if (newDate > endDate) {
                setEndDate(new Date(newDate.getTime() + 60 * 60 * 1000));
              }
            }}
            onClose={() => setShowStartDatePicker(false)}
          />
        )}
        {Platform.OS === "web" && showStartTimePicker && (
          <WebDateTimePicker
            value={startDate}
            mode="time"
            onChange={(date) => {
              setStartDate(date);
              if (date > endDate) {
                setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
              }
            }}
            onClose={() => setShowStartTimePicker(false)}
          />
        )}
        {Platform.OS === "web" && showEndDatePicker && (
          <WebDateTimePicker
            value={endDate}
            mode="date"
            minimumDate={startDate}
            onChange={(date) => {
              const newDate = new Date(endDate);
              newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
              setEndDate(newDate);
            }}
            onClose={() => setShowEndDatePicker(false)}
          />
        )}
        {Platform.OS === "web" && showEndTimePicker && (
          <WebDateTimePicker
            value={endDate}
            mode="time"
            onChange={(date) => setEndDate(date)}
            onClose={() => setShowEndTimePicker(false)}
          />
        )}

        {/* Date/Time Pickers - Native */}
        {Platform.OS !== "web" && showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event: any, date?: Date) => {
              setShowStartDatePicker(false);
              if (date) {
                const newDate = new Date(startDate);
                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setStartDate(newDate);
                if (newDate > endDate) {
                  setEndDate(new Date(newDate.getTime() + 60 * 60 * 1000));
                }
              }
            }}
          />
        )}
        {Platform.OS !== "web" && showStartTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event: any, date?: Date) => {
              setShowStartTimePicker(false);
              if (date) {
                setStartDate(date);
                if (date > endDate) {
                  setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
                }
              }
            }}
          />
        )}
        {Platform.OS !== "web" && showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={startDate}
            onChange={(event: any, date?: Date) => {
              setShowEndDatePicker(false);
              if (date) {
                const newDate = new Date(endDate);
                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setEndDate(newDate);
              }
            }}
          />
        )}
        {Platform.OS !== "web" && showEndTimePicker && (
          <DateTimePicker
            value={endDate}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event: any, date?: Date) => {
              setShowEndTimePicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        {/* Location */}
        <View style={[styles.inputSection, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <View style={styles.inputRow}>
            <IconSymbol name="location.fill" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="場所"
              placeholderTextColor={colors.textDisabled}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* Tags */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="tag.fill" size={20} color={colors.textSecondary} />
            <ThemedText type="defaultSemiBold">タグ</ThemedText>
          </View>
          <View style={styles.tagsContainer}>
            {tags?.map((tag) => (
              <Pressable
                key={tag.id}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: selectedTags.includes(tag.id)
                      ? tag.color + "30"
                      : colors.background,
                    borderColor: tag.color,
                  },
                ]}
                onPress={() => toggleTag(tag.id)}
              >
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <ThemedText style={{ color: selectedTags.includes(tag.id) ? tag.color : colors.text }}>
                  {tag.name}
                </ThemedText>
                {selectedTags.includes(tag.id) && (
                  <IconSymbol name="checkmark" size={16} color={tag.color} />
                )}
              </Pressable>
            ))}
            {(!tags || tags.length === 0) && (
              <ThemedText style={{ color: colors.textSecondary }}>
                タグがありません。設定から作成できます。
              </ThemedText>
            )}
          </View>
        </View>

        {/* Friends */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="person.fill" size={20} color={colors.textSecondary} />
            <ThemedText type="defaultSemiBold">友達</ThemedText>
          </View>
          <View style={styles.tagsContainer}>
            {friends?.map((friend: { id: number; name: string; color: string; telegramUsername?: string | null }) => (
              <Pressable
                key={friend.id}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: selectedFriends.includes(friend.id)
                      ? friend.color + "30"
                      : colors.background,
                    borderColor: friend.color,
                  },
                ]}
                onPress={() => toggleFriend(friend.id)}
              >
                <View style={[styles.tagDot, { backgroundColor: friend.color }]} />
                <ThemedText style={{ color: selectedFriends.includes(friend.id) ? friend.color : colors.text }}>
                  {friend.name}{friend.telegramUsername ? ` @${friend.telegramUsername}` : ""}
                </ThemedText>
                {selectedFriends.includes(friend.id) && (
                  <IconSymbol name="checkmark" size={16} color={friend.color} />
                )}
              </Pressable>
            ))}
            {(!friends || friends.length === 0) && (
              <ThemedText style={{ color: colors.textSecondary }}>
                友達がいません。設定から追加できます。
              </ThemedText>
            )}
          </View>
        </View>

        {/* Custom Message */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="bell.fill" size={20} color={colors.textSecondary} />
            <ThemedText type="defaultSemiBold">カスタムメッセージ</ThemedText>
          </View>
          <TextInput
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            placeholder="通知時に送信するカスタムメッセージ（任意）"
            placeholderTextColor={colors.textDisabled}
            value={customMessage}
            onChangeText={setCustomMessage}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Departments */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="building.2.fill" size={20} color={colors.textSecondary} />
            <ThemedText type="defaultSemiBold">部署</ThemedText>
          </View>
          <View style={styles.tagsContainer}>
            {departments?.map((dept) => (
              <Pressable
                key={dept.id}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: selectedDepartments.includes(dept.id)
                      ? dept.color + "30"
                      : colors.background,
                    borderColor: dept.color,
                  },
                ]}
                onPress={() => toggleDepartment(dept.id)}
              >
                <View style={[styles.tagDot, { backgroundColor: dept.color }]} />
                <ThemedText style={{ color: selectedDepartments.includes(dept.id) ? dept.color : colors.text }}>
                  {dept.name}
                </ThemedText>
                {selectedDepartments.includes(dept.id) && (
                  <IconSymbol name="checkmark" size={16} color={dept.color} />
                )}
              </Pressable>
            ))}
            {(!departments || departments.length === 0) && (
              <ThemedText style={{ color: colors.textSecondary }}>
                部署がありません。設定から追加できます。
              </ThemedText>
            )}
          </View>
        </View>

        {/* Repeat */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <Pressable
            style={styles.dateTimeRow}
            onPress={() => setShowRepeatPicker(!showRepeatPicker)}
          >
            <View style={styles.sectionHeader}>
              <IconSymbol name="repeat" size={20} color={colors.textSecondary} />
              <ThemedText>繰り返し</ThemedText>
            </View>
            <ThemedText style={{ color: colors.tint }}>
              {REPEAT_OPTIONS.find((o) => o.value === repeatType)?.label}
            </ThemedText>
          </Pressable>
          {showRepeatPicker && (
            <View style={styles.optionsContainer}>
              {REPEAT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionItem,
                    repeatType === option.value && { backgroundColor: colors.tint + "20" },
                  ]}
                  onPress={() => {
                    setRepeatType(option.value as any);
                    setShowRepeatPicker(false);
                  }}
                >
                  <ThemedText>{option.label}</ThemedText>
                  {repeatType === option.value && (
                    <IconSymbol name="checkmark" size={18} color={colors.tint} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Reminders */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="bell.fill" size={20} color={colors.textSecondary} />
            <ThemedText type="defaultSemiBold">リマインダー</ThemedText>
          </View>
          <View style={styles.optionsContainer}>
            {REMINDER_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.optionItem,
                  selectedReminders.includes(option.value) && { backgroundColor: colors.tint + "20" },
                ]}
                onPress={() => toggleReminder(option.value)}
              >
                <ThemedText>{option.label}</ThemedText>
                {selectedReminders.includes(option.value) && (
                  <IconSymbol name="checkmark" size={18} color={colors.tint} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={[styles.inputSection, { backgroundColor: colors.backgroundSecondary, maxWidth: maxContentWidth, width: '100%' }]}>
          <TextInput
            style={[styles.textArea, { color: colors.text }]}
            placeholder="メモ"
            placeholderTextColor={colors.textDisabled}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    minWidth: 70,
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  inputSection: {
    borderRadius: 12,
    overflow: "hidden",
  },
  section: {
    borderRadius: 12,
    padding: 16,
  },
  titleInput: {
    fontSize: 17,
    padding: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  textArea: {
    fontSize: 16,
    padding: 16,
    minHeight: 100,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionsContainer: {
    marginTop: 12,
    gap: 4,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
