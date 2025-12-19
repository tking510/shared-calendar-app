import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      setError("ユーザー名とパスワードを入力してください");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/simple-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ログインに失敗しました");
        return;
      }

      // Save session token
      await Auth.setSessionToken(data.sessionToken);
      await Auth.setUserInfo({
        id: data.user.id,
        openId: data.user.openId,
        name: data.user.name,
        email: data.user.email,
        loginMethod: data.user.loginMethod,
        lastSignedIn: new Date(data.user.lastSignedIn),
      });

      // Navigate to home
      router.replace("/");
    } catch (err) {
      console.error("[Login] Error:", err);
      setError("ネットワークエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      setError("ユーザー名とパスワードを入力してください");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/simple-auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name: name || username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "登録に失敗しました");
        return;
      }

      // Save session token
      await Auth.setSessionToken(data.sessionToken);
      await Auth.setUserInfo({
        id: data.user.id,
        openId: data.user.openId,
        name: data.user.name,
        email: data.user.email,
        loginMethod: data.user.loginMethod,
        lastSignedIn: new Date(data.user.lastSignedIn),
      });

      // Navigate to home
      router.replace("/");
    } catch (err) {
      console.error("[Register] Error:", err);
      setError("ネットワークエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: colors.tint + "20" }]}>
              <IconSymbol name="calendar" size={80} color={colors.tint} />
            </View>

            <ThemedText type="title" style={styles.title}>
              共有カレンダー
            </ThemedText>

            <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
              {isRegisterMode
                ? "アカウントを作成して予定を管理しましょう"
                : "ログインして予定を管理しましょう"}
            </ThemedText>

            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + "20" }]}>
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>ユーザー名</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="ユーザー名を入力"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {isRegisterMode && (
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.label}>表示名（任意）</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={name}
                    onChangeText={setName}
                    placeholder="表示名を入力"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>パスワード</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="パスワードを入力"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>

              <Pressable
                style={[styles.submitButton, { backgroundColor: colors.tint }]}
                onPress={isRegisterMode ? handleRegister : handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    {isRegisterMode ? "アカウント作成" : "ログイン"}
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                style={styles.switchButton}
                onPress={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError("");
                }}
              >
                <ThemedText style={[styles.switchButtonText, { color: colors.tint }]}>
                  {isRegisterMode
                    ? "既にアカウントをお持ちの方はこちら"
                    : "新規アカウント作成"}
                </ThemedText>
              </Pressable>
            </View>

            {!isRegisterMode && (
              <View style={styles.adminHint}>
                <ThemedText style={[styles.hintText, { color: colors.textSecondary }]}>
                  管理者: admin / Sloten1234
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    marginBottom: 24,
  },
  errorContainer: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    textAlign: "center",
    fontSize: 14,
  },
  form: {
    width: "100%",
    maxWidth: 400,
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  switchButtonText: {
    fontSize: 15,
  },
  adminHint: {
    marginTop: 32,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  hintText: {
    fontSize: 13,
    textAlign: "center",
  },
});
