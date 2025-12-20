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
  Switch,
  useWindowDimensions,
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
  const { width: windowWidth } = useWindowDimensions();
  
  // Responsive breakpoints
  const isTablet = windowWidth >= 768;
  const isDesktop = windowWidth >= 1024;
  const maxContentWidth = isDesktop ? 800 : isTablet ? 600 : windowWidth;

  const [showTagModal, setShowTagModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TagColors[0]);
  const [editingTag, setEditingTag] = useState<{ id: number; name: string; color: string } | null>(null);

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [threadId, setThreadId] = useState("");
  
  // Personal Telegram notification state
  const [showPersonalTelegramModal, setShowPersonalTelegramModal] = useState(false);
  const [myTelegramChatId, setMyTelegramChatId] = useState("");

  // Friends management state
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendTelegramChatId, setNewFriendTelegramChatId] = useState("");
  const [newFriendTelegramUsername, setNewFriendTelegramUsername] = useState("");
  const [newFriendColor, setNewFriendColor] = useState(TagColors[0]);
  const [editingFriend, setEditingFriend] = useState<{ id: number; name: string; telegramChatId?: string | null; telegramUsername?: string | null; color: string } | null>(null);

  // Department management state (Admin only)
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentColor, setNewDepartmentColor] = useState(TagColors[2]);
  const [editingDepartment, setEditingDepartment] = useState<{ id: number; name: string; color: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);

  // User department selection state
  const [showMyDepartmentsModal, setShowMyDepartmentsModal] = useState(false);
  const [selectedMyDepartments, setSelectedMyDepartments] = useState<number[]>([]);

  const { data: tags, refetch: refetchTags } = trpc.tags.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: telegramSettings, refetch: refetchTelegram } = trpc.telegram.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: friends, refetch: refetchFriends } = trpc.friends.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: departments, refetch: refetchDepartments } = trpc.departments.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: myDepartments, refetch: refetchMyDepartments } = trpc.departments.myDepartments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Update local state when telegram settings are loaded
  useEffect(() => {
    if (telegramSettings) {
      setBotToken(telegramSettings.botToken || "");
      setChatId(telegramSettings.chatId || "");
      setThreadId(telegramSettings.threadId || "");
    }
  }, [telegramSettings]);

  // Update personal telegram chat id when user is loaded
  useEffect(() => {
    if (user?.telegramChatId) {
      setMyTelegramChatId(user.telegramChatId);
    }
  }, [user]);

  // Update selected departments when myDepartments is loaded
  useEffect(() => {
    if (myDepartments) {
      setSelectedMyDepartments(myDepartments.map((d: { id: number }) => d.id));
    }
  }, [myDepartments]);

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

  // Personal Telegram notification mutation
  const updateMyTelegramChatIdMutation = trpc.auth.updateMyTelegramChatId.useMutation({
    onSuccess: () => {
      setShowPersonalTelegramModal(false);
      Alert.alert("保存しました", "個人Telegram通知設定を保存しました");
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  // Friends mutations
  const createFriendMutation = trpc.friends.create.useMutation({
    onSuccess: () => {
      setShowFriendModal(false);
      setNewFriendName("");
      setNewFriendTelegramChatId("");
      setNewFriendTelegramUsername("");
      setNewFriendColor(TagColors[0]);
      refetchFriends();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const updateFriendMutation = trpc.friends.update.useMutation({
    onSuccess: () => {
      setShowFriendModal(false);
      setEditingFriend(null);
      setNewFriendName("");
      setNewFriendTelegramChatId("");
      setNewFriendTelegramUsername("");
      setNewFriendColor(TagColors[0]);
      refetchFriends();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const deleteFriendMutation = trpc.friends.delete.useMutation({
    onSuccess: () => refetchFriends(),
    onError: (error) => Alert.alert("エラー", error.message),
  });

  // Department mutations (Admin only)
  const createDepartmentMutation = trpc.departments.create.useMutation({
    onSuccess: () => {
      setShowDepartmentModal(false);
      setNewDepartmentName("");
      setNewDepartmentColor(TagColors[2]);
      setAdminPassword("");
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
      setAdminPassword("");
      refetchDepartments();
    },
    onError: (error) => Alert.alert("エラー", error.message),
  });

  const deleteDepartmentMutation = trpc.departments.delete.useMutation({
    onSuccess: () => refetchDepartments(),
    onError: (error) => Alert.alert("エラー", error.message),
  });

  // User department selection mutation
  const setMyDepartmentsMutation = trpc.departments.setMyDepartments.useMutation({
    onSuccess: () => {
      setShowMyDepartmentsModal(false);
      refetchMyDepartments();
      Alert.alert("保存しました", "所属部署を更新しました");
    },
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
      threadId: threadId.trim() || null,
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

  // Friend handlers
  const handleSaveFriend = () => {
    if (!newFriendName.trim()) {
      Alert.alert("エラー", "名前を入力してください");
      return;
    }
    if (editingFriend) {
      updateFriendMutation.mutate({
        id: editingFriend.id,
        name: newFriendName.trim(),
        telegramChatId: newFriendTelegramChatId.trim() || null,
        telegramUsername: newFriendTelegramUsername.trim() || null,
        color: newFriendColor,
      });
    } else {
      createFriendMutation.mutate({
        name: newFriendName.trim(),
        telegramChatId: newFriendTelegramChatId.trim() || undefined,
        telegramUsername: newFriendTelegramUsername.trim() || undefined,
        color: newFriendColor,
      });
    }
  };

  const handleDeleteFriend = (id: number, name: string) => {
    Alert.alert(
      "友達を削除",
      `「${name}」を削除してもよろしいですか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteFriendMutation.mutate({ id }),
        },
      ]
    );
  };

  const handleEditFriend = (friend: { id: number; name: string; telegramChatId?: string | null; telegramUsername?: string | null; color: string }) => {
    setEditingFriend(friend);
    setNewFriendName(friend.name);
    setNewFriendTelegramChatId(friend.telegramChatId || "");
    setNewFriendTelegramUsername(friend.telegramUsername || "");
    setNewFriendColor(friend.color);
    setShowFriendModal(true);
  };

  // Department handlers (Admin only)
  const handleAdminLogin = () => {
    if (adminPassword === "Sloten1234") {
      setIsAdminMode(true);
      Alert.alert("成功", "管理者モードでログインしました");
    } else {
      Alert.alert("エラー", "パスワードが正しくありません");
    }
    setAdminPassword("");
  };

  const handleSaveDepartment = () => {
    if (!newDepartmentName.trim()) {
      Alert.alert("エラー", "部署名を入力してください");
      return;
    }
    if (!adminPassword.trim()) {
      Alert.alert("エラー", "管理者パスワードを入力してください");
      return;
    }
    if (editingDepartment) {
      updateDepartmentMutation.mutate({
        id: editingDepartment.id,
        name: newDepartmentName.trim(),
        color: newDepartmentColor,
        adminPassword: adminPassword,
      });
    } else {
      createDepartmentMutation.mutate({
        name: newDepartmentName.trim(),
        color: newDepartmentColor,
        adminPassword: adminPassword,
      });
    }
  };

  const handleDeleteDepartment = (id: number, name: string) => {
    Alert.prompt(
      "部署を削除",
      `「${name}」を削除するには管理者パスワードを入力してください`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: (password?: string) => {
            if (password) {
              deleteDepartmentMutation.mutate({ id, adminPassword: password });
            }
          },
        },
      ],
      "secure-text"
    );
  };

  const handleEditDepartment = (dept: { id: number; name: string; color: string }) => {
    setEditingDepartment(dept);
    setNewDepartmentName(dept.name);
    setNewDepartmentColor(dept.color);
    setAdminPassword("");
    setShowDepartmentModal(true);
  };

  // My departments handlers
  const toggleMyDepartment = (deptId: number) => {
    setSelectedMyDepartments((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSaveMyDepartments = () => {
    setMyDepartmentsMutation.mutate({ departmentIds: selectedMyDepartments });
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
      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && { alignItems: 'center' }]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">設定</ThemedText>
        </View>

        {/* Account Section */}
        <View style={[styles.section, { maxWidth: maxContentWidth, width: '100%' }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            アカウント
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.accountInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.avatarText}>
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </ThemedText>
              </View>
              <View style={styles.accountDetails}>
                <ThemedText type="defaultSemiBold">{user?.name || "ユーザー"}</ThemedText>
                <ThemedText style={{ color: colors.textSecondary }}>{user?.email || ""}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Tags Section */}
        <View style={[styles.section, { maxWidth: maxContentWidth, width: '100%' }]}>
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
              tags.map((tag: { id: number; name: string; color: string }, index: number) => (
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

        {/* Personal Telegram Notification Section */}
        <View style={[styles.section, { maxWidth: maxContentWidth, width: '100%' }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            個人Telegram通知
          </ThemedText>
          <Pressable
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => setShowPersonalTelegramModal(true)}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <IconSymbol name="bell.fill" size={24} color={colors.tint} />
                <View>
                  <ThemedText type="defaultSemiBold">個人通知設定</ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {user?.telegramChatId ? "設定済み" : "未設定"}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8, paddingHorizontal: 4 }}>
            自分のTelegramに直接通知を受け取るための設定です
          </ThemedText>
        </View>

        {/* Group Telegram Section */}
        <View style={[styles.section, { maxWidth: maxContentWidth, width: '100%' }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            グループTelegram通知
          </ThemedText>
          <Pressable
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => setShowTelegramModal(true)}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <IconSymbol name="paperplane.fill" size={24} color={colors.tint} />
                <View>
                  <ThemedText type="defaultSemiBold">Bot設定（グループ/チャンネル）</ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {telegramSettings?.enabled ? "有効" : "未設定"}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {/* Friends Section */}
        <View style={[styles.section, { maxWidth: maxContentWidth, width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">友達管理</ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                setEditingFriend(null);
                setNewFriendName("");
                setNewFriendTelegramChatId("");
                setNewFriendTelegramUsername("");
                setNewFriendColor(TagColors[0]);
                setShowFriendModal(true);
              }}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontSize: 14 }}>追加</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {friends && friends.length > 0 ? (
              friends.map((friend: { id: number; name: string; telegramChatId?: string | null; telegramUsername?: string | null; color: string }, index: number) => (
                <View key={friend.id}>
                  <View style={styles.tagRow}>
                    <View style={styles.tagInfo}>
                      <View style={[styles.tagDot, { backgroundColor: friend.color }]} />
                      <View>
                        <ThemedText>{friend.name}</ThemedText>
                        {friend.telegramUsername && (
                          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                            @{friend.telegramUsername}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                    <View style={styles.tagActions}>
                      <Pressable
                        style={styles.tagActionButton}
                        onPress={() => handleEditFriend(friend)}
                      >
                        <IconSymbol name="pencil" size={18} color={colors.tint} />
                      </Pressable>
                      <Pressable
                        style={styles.tagActionButton}
                        onPress={() => handleDeleteFriend(friend.id, friend.name)}
                      >
                        <IconSymbol name="trash.fill" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  {index < friends.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))
            ) : (
              <ThemedText style={{ color: colors.textSecondary, padding: 16 }}>
                友達がいません
              </ThemedText>
            )}
          </View>
        </View>

        {/* My Departments Section */}
        <View style={[styles.section, { maxWidth: maxContentWidth, width: '100%' }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            所属部署
          </ThemedText>
          <Pressable
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => setShowMyDepartmentsModal(true)}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <IconSymbol name="building.2.fill" size={24} color={colors.tint} />
                <View>
                  <ThemedText type="defaultSemiBold">所属部署を選択</ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {myDepartments && myDepartments.length > 0
                      ? myDepartments.map((d: { name: string }) => d.name).join(", ")
                      : "未選択"}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {/* Departments Admin Section */}
        <View style={[styles.section, { maxWidth: maxContentWidth, width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">部署管理（Admin）</ThemedText>
            {isAdminMode && (
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  setEditingDepartment(null);
                  setNewDepartmentName("");
                  setNewDepartmentColor(TagColors[2]);
                  setAdminPassword("");
                  setShowDepartmentModal(true);
                }}
              >
                <IconSymbol name="plus" size={16} color="#FFFFFF" />
                <ThemedText style={{ color: "#FFFFFF", fontSize: 14 }}>追加</ThemedText>
              </Pressable>
            )}
          </View>
          {!isAdminMode ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <ThemedText style={{ color: colors.textSecondary, padding: 16, marginBottom: 8 }}>
                部署の追加・編集・削除には管理者パスワードが必要です
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary, marginHorizontal: 16 }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="管理者パスワード"
                  placeholderTextColor={colors.textDisabled}
                  value={adminPassword}
                  onChangeText={setAdminPassword}
                  secureTextEntry
                />
              </View>
              <Pressable
                style={[styles.adminLoginButton, { backgroundColor: colors.tint, margin: 16 }]}
                onPress={handleAdminLogin}
              >
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>管理者ログイン</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {departments && departments.length > 0 ? (
                departments.map((dept: { id: number; name: string; color: string }, index: number) => (
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
          )}
        </View>

        {/* Logout Button */}
        <View style={[styles.section, { maxWidth: maxContentWidth, width: '100%' }]}>
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

            <ThemedText style={{ marginTop: 16, marginBottom: 8, fontWeight: "600" }}>Chat ID</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="-1001234567890"
                placeholderTextColor={colors.textDisabled}
                value={chatId}
                onChangeText={setChatId}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <ThemedText style={{ marginTop: 16, marginBottom: 8, fontWeight: "600" }}>スレッドID（トピックID）- 任意</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="123"
                placeholderTextColor={colors.textDisabled}
                value={threadId}
                onChangeText={setThreadId}
                keyboardType="number-pad"
              />
            </View>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
              トピックが有効なグループに通知を送る場合に入力してください
            </ThemedText>

            <Pressable
              style={[styles.testButton, { backgroundColor: colors.tint }]}
              onPress={() => testTelegramMutation.mutate({
                botToken: botToken.trim(),
                chatId: chatId.trim(),
                threadId: threadId.trim() || undefined,
              })}
              disabled={testTelegramMutation.isPending || !botToken.trim() || !chatId.trim()}
            >
              {testTelegramMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
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

      {/* Personal Telegram Modal */}
      <Modal
        visible={showPersonalTelegramModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPersonalTelegramModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPersonalTelegramModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">個人Telegram通知</ThemedText>
            <Pressable
              onPress={() => {
                updateMyTelegramChatIdMutation.mutate({
                  telegramChatId: myTelegramChatId.trim() || null,
                });
              }}
              disabled={updateMyTelegramChatIdMutation.isPending}
            >
              {updateMyTelegramChatIdMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>保存</ThemedText>
              )}
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            <ThemedText style={{ color: colors.textSecondary, marginBottom: 16, lineHeight: 22 }}>
              あなたの個人Chat IDを入力すると、予定にタグ付けされたときに直接通知を受け取れます。
            </ThemedText>

            <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>あなたのChat ID</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="123456789"
                placeholderTextColor={colors.textDisabled}
                value={myTelegramChatId}
                onChangeText={setMyTelegramChatId}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={[styles.helpBox, { backgroundColor: colors.backgroundSecondary, marginTop: 24 }]}>
              <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
                Chat IDの取得方法
              </ThemedText>
              <ThemedText style={{ color: colors.textSecondary, lineHeight: 22 }}>
                1. Telegramで @userinfobot を検索{"\n"}
                2. ボットとのチャットを開始{"\n"}
                3. 表示された「Id」の数字をコピー
              </ThemedText>
            </View>

            {myTelegramChatId.trim() && (
              <Pressable
                style={[styles.deleteButton, { marginTop: 24 }]}
                onPress={() => {
                  Alert.alert(
                    "確認",
                    "個人Telegram通知設定を削除しますか？",
                    [
                      { text: "キャンセル", style: "cancel" },
                      {
                        text: "削除",
                        style: "destructive",
                        onPress: () => {
                          setMyTelegramChatId("");
                          updateMyTelegramChatIdMutation.mutate({ telegramChatId: null });
                        },
                      },
                    ]
                  );
                }}
              >
                <ThemedText style={{ color: colors.error, fontWeight: "600" }}>
                  設定を削除
                </ThemedText>
              </Pressable>
            )}
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Friend Modal */}
      <Modal
        visible={showFriendModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFriendModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowFriendModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">
              {editingFriend ? "友達を編集" : "新規友達"}
            </ThemedText>
            <Pressable
              onPress={handleSaveFriend}
              disabled={createFriendMutation.isPending || updateFriendMutation.isPending}
            >
              {createFriendMutation.isPending || updateFriendMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>保存</ThemedText>
              )}
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>名前</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="名前"
                placeholderTextColor={colors.textDisabled}
                value={newFriendName}
                onChangeText={setNewFriendName}
                autoFocus
              />
            </View>

            <ThemedText style={{ marginTop: 16, marginBottom: 8, fontWeight: "600" }}>Telegram Chat ID（任意）</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="123456789"
                placeholderTextColor={colors.textDisabled}
                value={newFriendTelegramChatId}
                onChangeText={setNewFriendTelegramChatId}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
              友達のTelegram Chat IDを入力すると、予定のリマインダーが友達にも届きます
            </ThemedText>

            <ThemedText style={{ marginTop: 16, marginBottom: 8, fontWeight: "600" }}>Telegramユーザー名（任意）</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="username"
                placeholderTextColor={colors.textDisabled}
                value={newFriendTelegramUsername}
                onChangeText={setNewFriendTelegramUsername}
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
                    newFriendColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewFriendColor(color)}
                >
                  {newFriendColor === color && (
                    <IconSymbol name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Department Modal (Admin) */}
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
            <ThemedText style={{ marginBottom: 8, fontWeight: "600" }}>部署名</ThemedText>
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

            <ThemedText style={{ marginTop: 16, marginBottom: 8, fontWeight: "600" }}>管理者パスワード</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="管理者パスワード"
                placeholderTextColor={colors.textDisabled}
                value={adminPassword}
                onChangeText={setAdminPassword}
                secureTextEntry
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

      {/* My Departments Modal */}
      <Modal
        visible={showMyDepartmentsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMyDepartmentsModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowMyDepartmentsModal(false)}>
              <ThemedText style={{ color: colors.tint }}>キャンセル</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">所属部署を選択</ThemedText>
            <Pressable
              onPress={handleSaveMyDepartments}
              disabled={setMyDepartmentsMutation.isPending}
            >
              {setMyDepartmentsMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>保存</ThemedText>
              )}
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <ThemedText style={{ color: colors.textSecondary, marginBottom: 16 }}>
              所属する部署を選択してください（複数選択可）
            </ThemedText>
            {departments && departments.length > 0 ? (
              departments.map((dept: { id: number; name: string; color: string }) => (
                <Pressable
                  key={dept.id}
                  style={[
                    styles.departmentOption,
                    {
                      backgroundColor: selectedMyDepartments.includes(dept.id)
                        ? dept.color + "20"
                        : colors.backgroundSecondary,
                      borderColor: selectedMyDepartments.includes(dept.id) ? dept.color : colors.border,
                    },
                  ]}
                  onPress={() => toggleMyDepartment(dept.id)}
                >
                  <View style={styles.tagInfo}>
                    <View style={[styles.tagDot, { backgroundColor: dept.color }]} />
                    <ThemedText>{dept.name}</ThemedText>
                  </View>
                  {selectedMyDepartments.includes(dept.id) && (
                    <IconSymbol name="checkmark" size={20} color={dept.color} />
                  )}
                </Pressable>
              ))
            ) : (
              <ThemedText style={{ color: colors.textSecondary }}>
                部署がありません。管理者に連絡してください。
              </ThemedText>
            )}
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
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingBottom: 8,
  },
  section: {
    paddingHorizontal: 20,
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
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  tagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  tagInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
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
    marginLeft: 44,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  loginPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
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
    paddingVertical: 14,
    borderRadius: 24,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
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
    padding: 20,
  },
  inputContainer: {
    borderRadius: 10,
    overflow: "hidden",
  },
  input: {
    padding: 14,
    fontSize: 16,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  helpBox: {
    padding: 16,
    borderRadius: 10,
  },
  adminLoginButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  departmentOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  deleteButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
  },
});
