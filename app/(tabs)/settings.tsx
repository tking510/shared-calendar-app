import React from "react";
import { useRouter } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TagColors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const [showTagModal, setShowTagModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TagColors[0]);
  const [editingTag, setEditingTag] = useState<{ id: number; name: string; color: string } | null>(null);

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");

  // People management state
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonColor, setNewPersonColor] = useState(TagColors[0]);
  const [editingPerson, setEditingPerson] = useState<{ id: number; name: string; email?: string | null; color: string } | null>(null);

  // Department management state
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentColor, setNewDepartmentColor] = useState(TagColors[2]);
  const [editingDepartment, setEditingDepartment] = useState<{ id: number; name: string; color: string } | null>(null);

  const { data: tags, refetch: refetchTags } = trpc.tags.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: telegramSettings, refetch: refetchTelegram } = trpc.telegram.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: people, refetch: refetchPeople } = trpc.people.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: departments, refetch: refetchDepartments } = trpc.departments.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Update local state when telegram settings are loaded
  useEffect(() => {
    if (telegramSettings) {
      setBotToken(telegramSettings.botToken || "");
      setChatId(telegramSettings.chatId || "");
    }
  }, [telegramSettings]);

  const createTagMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      setShowTagModal(false);
      setNewTagName("");
      setNewTagColor(TagColors[0]);
      refetchTags();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const updateTagMutation = trpc.tags.update.useMutation({
    onSuccess: () => {
      setShowTagModal(false);
      setEditingTag(null);
      setNewTagName("");
      setNewTagColor(TagColors[0]);
      refetchTags();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const deleteTagMutation = trpc.tags.delete.useMutation({
    onSuccess: () => refetchTags(),
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const updateTelegramMutation = trpc.telegram.update.useMutation({
    onSuccess: () => {
      setShowTelegramModal(false);
      refetchTelegram();
      Alert.alert("保存しました", "Telegram設定を保存しました");
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const testTelegramMutation = trpc.telegram.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        Alert.alert("成功", "テスト通知を送信しました");
      } else {
        Alert.alert("失敗", "通知の送信に失敗しました。設定を確認してください。");
      }
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  // People mutations
  const createPersonMutation = trpc.people.create.useMutation({
    onSuccess: () => {
      setShowPersonModal(false);
      setNewPersonName("");
      setNewPersonEmail("");
      setNewPersonColor(TagColors[0]);
      refetchPeople();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const updatePersonMutation = trpc.people.update.useMutation({
    onSuccess: () => {
      setShowPersonModal(false);
      setEditingPerson(null);
      setNewPersonName("");
      setNewPersonEmail("");
      setNewPersonColor(TagColors[0]);
      refetchPeople();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const deletePersonMutation = trpc.people.delete.useMutation({
    onSuccess: () => refetchPeople(),
    onError: (error) => Alert.alert("エラー", error.message),
  });

  // Department mutations
  const createDepartmentMutation = trpc.departments.create.useMutation({
    onSuccess: () => {
      setShowDepartmentModal(false);
      setNewDepartmentName("");
      setNewDepartmentColor(TagColors[2]);
      refetchDepartments();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const updateDepartmentMutation = trpc.departments.update.useMutation({
    onSuccess: () => {
      setShowDepartmentModal(false);
      setEditingDepartment(null);
      setNewDepartmentName("");
      setNewDepartmentColor(TagColors[2]);
      refetchDepartments();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const deleteDepartmentMutation = trpc.departments.delete.useMutation({
    onSuccess: () => refetchDepartments(),
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const handleSaveTag = () => {
    if (!newTagName.trim()) {
      Alert.alert("エラー", "タグ名を入力してください");
      return;
    }
    if (editingTag) {
      updateTagMutation.mutate({
        id: editingTag.id,
        name: newTagName.trim(),
        color: newTagColor,
      });
    } else {
      createTagMutation.mutate({
        name: newTagName.trim(),
        color: newTagColor,
      });
    }
  };

  const handleDeleteTag = (id: number, name: string) => {
    Alert.alert(
      "タグを削除",
      `「${name}」を削除してもよろしいですか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteTagMutation.mutate({ id }),
        },
      ]
    );
  };

  const handleEditTag = (tag: { id: number; name: string; color: string }) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
    setShowTagModal(true);
  };

  const handleSaveTelegram = () => {
    updateTelegramMutation.mutate({
      botToken: botToken.trim() || undefined,
      chatId: chatId.trim() || undefined,
      enabled: !!(botToken.trim() && chatId.trim()),
    });
  };

  const handleLogout = () => {
    Alert.alert(
      "ログアウト",
      "ログアウトしてもよろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "ログアウト", style: "destructive", onPress: logout },
      ]
    );
  };

  // Person handlers
  const handleSavePerson = () => {
    if (!newPersonName.trim()) {
      Alert.alert("エラー", "名前を入力してください");
      return;
    }
    if (editingPerson) {
      updatePersonMutation.mutate({
        id: editingPerson.id,
        name: newPersonName.trim(),
        email: newPersonEmail.trim() || undefined,
        color: newPersonColor,
      });
    } else {
      createPersonMutation.mutate({
        name: newPersonName.trim(),
        email: newPersonEmail.trim() || undefined,
        color: newPersonColor,
      });
    }
  };

  const handleDeletePerson = (id: number, name: string) => {
    Alert.alert(
      "参加者を削除",
      `「${name}」を削除してもよろしいですか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deletePersonMutation.mutate({ id }),
        },
      ]
    );
  };

  const handleEditPerson = (person: { id: number; name: string; email?: string | null; color: string }) => {
    setEditingPerson(person);
    setNewPersonName(person.name);
    setNewPersonEmail(person.email || "");
    setNewPersonColor(person.color);
    setShowPersonModal(true);
  };

  // Department handlers
  const handleSaveDepartment = () => {
    if (!newDepartmentName.trim()) {
      Alert.alert("エラー", "部署名を入力してください");
      return;
    }
    if (editingDepartment) {
      updateDepartmentMutation.mutate({
        id: editingDepartment.id,
        name: newDepartmentName.trim(),
        color: newDepartmentColor,
      });
    } else {
      createDepartmentMutation.mutate({
        name: newDepartmentName.trim(),
        color: newDepartmentColor,
      });
    }
  };

  const handleDeleteDepartment = (id: number, name: string) => {
    Alert.alert(
      "部署を削除",
      `「${name}」を削除してもよろしいですか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteDepartmentMutation.mutate({ id }),
        },
      ]
    );
  };

  const handleEditDepartment = (dept: { id: number; name: string; color: string }) => {
    setEditingDepartment(dept);
    setNewDepartmentName(dept.name);
    setNewDepartmentColor(dept.color);
    setShowDepartmentModal(true);
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
          <IconSymbol name="gearshape.fill" size={64} color={colors.tint} />
          <ThemedText type="title" style={styles.loginTitle}>
            設定
          </ThemedText>
          <ThemedText style={[styles.loginText, { color: colors.textSecondary }]}>
            ログインして設定を管理しましょう
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">設定</ThemedText>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            アカウント
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.accountInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.avatarText}>
                  {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.accountDetails}>
                <ThemedText type="defaultSemiBold">
                  {user?.name || "ユーザー"}
                </ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
                  {user?.email || ""}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Tags Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">タグ管理</ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                setEditingTag(null);
                setNewTagName("");
                setNewTagColor(TagColors[0]);
                setShowTagModal(true);
              }}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontSize: 14 }}>追加</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {tags && tags.length > 0 ? (
              tags.map((tag, index) => (
                <View key={tag.id}>
                  <View style={styles.tagRow}>
                    <View style={styles.tagInfo}>
                      <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                      <ThemedText>{tag.name}</ThemedText>
                    </View>
                    <View style={styles.tagActions}>
                      <Pressable
                        style={styles.tagActionButton}
                        onPress={() => handleEditTag(tag)}
                      >
                        <IconSymbol name="pencil" size={18} color={colors.tint} />
                      </Pressable>
                      <Pressable
                        style={styles.tagActionButton}
                        onPress={() => handleDeleteTag(tag.id, tag.name)}
                      >
                        <IconSymbol name="trash.fill" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  {index < tags.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))
            ) : (
              <ThemedText style={{ color: colors.textSecondary, padding: 16 }}>
                タグがありません
              </ThemedText>
            )}
          </View>
        </View>

        {/* Telegram Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Telegram通知
          </ThemedText>
          <Pressable
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => setShowTelegramModal(true)}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <IconSymbol name="bell.fill" size={24} color={colors.tint} />
                <View>
                  <ThemedText type="defaultSemiBold">Telegram連携</ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
                    {telegramSettings?.enabled ? "有効" : "未設定"}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {/* People Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">参加者管理</ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                setEditingPerson(null);
                setNewPersonName("");
                setNewPersonEmail("");
                setNewPersonColor(TagColors[0]);
                setShowPersonModal(true);
              }}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontSize: 14 }}>追加</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {people && people.length > 0 ? (
              people.map((person, index) => (
                <View key={person.id}>
                  <View style={styles.tagRow}>
                    <View style={styles.tagInfo}>
                      <View style={[styles.tagDot, { backgroundColor: person.color }]} />
                      <View>
                        <ThemedText>{person.name}</ThemedText>
                        {person.email && (
                          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                            {person.email}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                    <View style={styles.tagActions}>
                      <Pressable
                        style={styles.tagActionButton}
                        onPress={() => handleEditPerson(person)}
                      >
                        <IconSymbol name="pencil" size={18} color={colors.tint} />
                      </Pressable>
                      <Pressable
                        style={styles.tagActionButton}
                        onPress={() => handleDeletePerson(person.id, person.name)}
                      >
                        <IconSymbol name="trash.fill" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  {index < people.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))
            ) : (
              <ThemedText style={{ color: colors.textSecondary, padding: 16 }}>
                参加者がいません
              </ThemedText>
            )}
          </View>
        </View>

        {/* Departments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">部署管理</ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                setEditingDepartment(null);
                setNewDepartmentName("");
                setNewDepartmentColor(TagColors[2]);
                setShowDepartmentModal(true);
              }}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontSize: 14 }}>追加</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {departments && departments.length > 0 ? (
              departments.map((dept, index) => (
                <View key={dept.id}>
                  <View style={styles.tagRow}>
                    <View style={styles.tagInfo}>
                      <View style={[styles.tagDot, { backgroundColor: dept.color }]} />
                      <ThemedText>{dept.name}</ThemedText>
                    </View>
                    <View style={styles.tagActions}>
                      <Pressable
                        style={styles.tagActionButton}
                        onPress={() => handleEditDepartment(dept)}
                      >
                        <IconSymbol name="pencil" size={18} color={colors.tint} />
                      </Pressable>
                      <Pressable
                        style={styles.tagActionButton}
                        onPress={() => handleDeleteDepartment(dept.id, dept.name)}
                      >
                        <IconSymbol name="trash.fill" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  {index < departments.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))
            ) : (
              <ThemedText style={{ color: colors.textSecondary, padding: 16 }}>
                部署がありません
              </ThemedText>
            )}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <Pressable
            style={[styles.logoutButton, { backgroundColor: colors.error + "15" }]}
            onPress={handleLogout}
          >
            <ThemedText style={{ color: colors.error, fontWeight: "600" }}>
              ログアウト
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* Tag Modal */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTagModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowTagModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">
              {editingTag ? "タグを編集" : "新規タグ"}
            </ThemedText>
            <Pressable
              onPress={handleSaveTag}
              disabled={createTagMutation.isPending || updateTagMutation.isPending}
            >
              {createTagMutation.isPending || updateTagMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>保存</ThemedText>
              )}
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="タグ名"
                placeholderTextColor={colors.textDisabled}
                value={newTagName}
                onChangeText={setNewTagName}
                autoFocus
              />
            </View>
            <ThemedText style={{ marginTop: 16, marginBottom: 8 }}>カラー</ThemedText>
            <View style={styles.colorPicker}>
              {TagColors.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newTagColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewTagColor(color)}
                >
                  {newTagColor === color && (
                    <IconSymbol name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </ThemedView>
      </Modal>

      {/* Telegram Modal */}
      <Modal
        visible={showTelegramModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTelegramModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowTelegramModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">Telegram設定</ThemedText>
            <Pressable
              onPress={handleSaveTelegram}
              disabled={updateTelegramMutation.isPending}
            >
              {updateTelegramMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>保存</ThemedText>
              )}
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            <ThemedText style={{ color: colors.textSecondary, marginBottom: 16, lineHeight: 22 }}>
              Telegram Botを作成し、Bot TokenとChat IDを入力してください。
              リマインダー通知がTelegramに届くようになります。
            </ThemedText>

            <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>Bot Token</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                placeholderTextColor={colors.textDisabled}
                value={botToken}
                onChangeText={setBotToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <ThemedText style={{ marginTop: 16, marginBottom: 8, fontWeight: "600" }}>
              Chat ID
            </ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="123456789"
                placeholderTextColor={colors.textDisabled}
                value={chatId}
                onChangeText={setChatId}
                keyboardType="numeric"
              />
            </View>

            <Pressable
              style={[
                styles.testButton,
                { backgroundColor: colors.tint, marginTop: 24 },
                (!botToken || !chatId) && { opacity: 0.5 },
              ]}
              onPress={() => testTelegramMutation.mutate()}
              disabled={!botToken || !chatId || testTelegramMutation.isPending}
            >
              {testTelegramMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  テスト通知を送信
                </ThemedText>
              )}
            </Pressable>

            <View style={[styles.helpBox, { backgroundColor: colors.backgroundSecondary }]}>
              <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
                設定方法
              </ThemedText>
              <ThemedText style={{ color: colors.textSecondary, lineHeight: 22 }}>
                1. Telegramで @BotFather を検索{"\n"}
                2. /newbot コマンドでBotを作成{"\n"}
                3. 発行されたBot Tokenをコピー{"\n"}
                4. 作成したBotにメッセージを送信{"\n"}
                5. @userinfobot でChat IDを取得
              </ThemedText>
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Person Modal */}
      <Modal
        visible={showPersonModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPersonModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPersonModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">
              {editingPerson ? "参加者を編集" : "新規参加者"}
            </ThemedText>
            <Pressable
              onPress={handleSavePerson}
              disabled={createPersonMutation.isPending || updatePersonMutation.isPending}
            >
              {createPersonMutation.isPending || updatePersonMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>保存</ThemedText>
              )}
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>名前</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="名前"
                placeholderTextColor={colors.textDisabled}
                value={newPersonName}
                onChangeText={setNewPersonName}
                autoFocus
              />
            </View>
            <ThemedText style={{ marginTop: 16, marginBottom: 8, fontWeight: "600" }}>メール（任意）</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="email@example.com"
                placeholderTextColor={colors.textDisabled}
                value={newPersonEmail}
                onChangeText={setNewPersonEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <ThemedText style={{ marginTop: 16, marginBottom: 8 }}>カラー</ThemedText>
            <View style={styles.colorPicker}>
              {TagColors.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newPersonColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewPersonColor(color)}
                >
                  {newPersonColor === color && (
                    <IconSymbol name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </ThemedView>
      </Modal>

      {/* Department Modal */}
      <Modal
        visible={showDepartmentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDepartmentModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDepartmentModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">
              {editingDepartment ? "部署を編集" : "新規部署"}
            </ThemedText>
            <Pressable
              onPress={handleSaveDepartment}
              disabled={createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
            >
              {createDepartmentMutation.isPending || updateDepartmentMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>保存</ThemedText>
              )}
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="部署名"
                placeholderTextColor={colors.textDisabled}
                value={newDepartmentName}
                onChangeText={setNewDepartmentName}
                autoFocus
              />
            </View>
            <ThemedText style={{ marginTop: 16, marginBottom: 8 }}>カラー</ThemedText>
            <View style={styles.colorPicker}>
              {TagColors.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newDepartmentColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewDepartmentColor(color)}
                >
                  {newDepartmentColor === color && (
                    <IconSymbol name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              ))}
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
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  accountDetails: {
    flex: 1,
    gap: 2,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  tagInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tagDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tagActions: {
    flexDirection: "row",
    gap: 8,
  },
  tagActionButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
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
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  testButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  helpBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
});
