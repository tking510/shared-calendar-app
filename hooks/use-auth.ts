import * as Auth from "@/lib/auth";
import { getApiBaseUrl } from "@/constants/oauth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // First check for cached user info
      const cachedUser = await Auth.getUserInfo();
      const sessionToken = await Auth.getSessionToken();
      
      console.log("[useAuth] Cached user:", cachedUser);
      console.log("[useAuth] Session token:", sessionToken ? "present" : "missing");

      if (!sessionToken) {
        console.log("[useAuth] No session token, setting user to null");
        setUser(null);
        await Auth.clearUserInfo();
        return;
      }

      // Verify session with server using simple auth
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/simple-auth/me`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            const userInfo: Auth.User = {
              id: data.user.id,
              openId: data.user.openId,
              name: data.user.name,
              email: data.user.email,
              loginMethod: data.user.loginMethod,
              lastSignedIn: new Date(data.user.lastSignedIn),
            };
            setUser(userInfo);
            await Auth.setUserInfo(userInfo);
            console.log("[useAuth] User verified from API:", userInfo);
            return;
          }
        }
      } catch (apiError) {
        console.log("[useAuth] API verification failed, using cached user:", apiError);
      }

      // Fall back to cached user if API fails
      if (cachedUser) {
        console.log("[useAuth] Using cached user info");
        setUser(cachedUser);
      } else {
        console.log("[useAuth] No cached user, clearing session");
        await Auth.removeSessionToken();
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[useAuth] fetchUser completed, loading:", false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const sessionToken = await Auth.getSessionToken();
      if (sessionToken) {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/simple-auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      }
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
      // Continue with logout even if API call fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    console.log("[useAuth] useEffect triggered, autoFetch:", autoFetch, "platform:", Platform.OS);
    if (autoFetch) {
      // Check for cached user info first for faster initial load
      Auth.getUserInfo().then((cachedUser) => {
        console.log("[useAuth] Cached user check:", cachedUser);
        if (cachedUser) {
          console.log("[useAuth] Setting cached user immediately");
          setUser(cachedUser);
          setLoading(false);
          // Still verify with server in background
          fetchUser();
        } else {
          // No cached user, fetch from server
          fetchUser();
        }
      });
    } else {
      console.log("[useAuth] autoFetch disabled, setting loading to false");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[useAuth] State updated:", {
      hasUser: !!user,
      loading,
      isAuthenticated,
      error: error?.message,
    });
  }, [user, loading, isAuthenticated, error]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
