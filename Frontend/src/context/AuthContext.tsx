import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL, readApiError } from "../lib/api";

// Global fetch interceptor to add Authorization header
const originalFetch = window.fetch;
window.fetch = function (...args: any[]) {
  const [url, options] = args;
  const token = localStorage.getItem("plasticon_token");

  const modifiedOptions = {
    ...(options || {}),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  };

  if (token) {
    modifiedOptions.headers["Authorization"] = `Bearer ${token}`;
  }

  return originalFetch.call(this, url, modifiedOptions);
} as any;

type UserProfile = {
  name: string;
  email: string;
  role?: string | null;
  profileImage?: string | null;
  username?: string | null;
  createdAt?: string | null;
};

type LoginValues = {
  email: string;
  password: string;
};

type RegisterValues = {
  nationalId: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  shiftId?: string;
  password: string;
  confirmPassword: string;
  profileImage?: File | null;
};

type AuthContextValue = {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (values: LoginValues) => Promise<void>;
  signOut: () => void;
  register: (values: RegisterValues) => Promise<void>;
};

const USER_KEY = "plasticon_user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore token and user from localStorage on app startup
    const storedUser = window.localStorage.getItem(USER_KEY);
    const storedToken = window.localStorage.getItem("plasticon_token");

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser) as UserProfile);
        setToken(storedToken);
      } catch {
        window.localStorage.removeItem(USER_KEY);
        window.localStorage.removeItem("plasticon_token");
      }
    }

    setLoading(false);
  }, []);

  const persistSession = useCallback(
    (nextToken: string, nextUser: UserProfile) => {
      // Store actual token in localStorage for Authorization header
      window.localStorage.setItem("plasticon_token", nextToken);
      setToken(nextToken);
      setUser(nextUser);
      // Store user profile in localStorage (for UX, not security)
      window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    },
    [],
  );

  const signIn = useCallback(
    async (values: LoginValues) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as {
        name?: string;
        email?: string;
        token?: string;
        role?: string;
        profileImage?: string | null;
      };

      if (!data.token || !data.email) {
        throw new Error("Invalid login response.");
      }

      persistSession(data.token, {
        name: data.name ?? values.email,
        email: data.email,
        role: data.role ?? "WORKER",
        profileImage: data.profileImage ?? null,
      });
    },
    [persistSession],
  );

  const register = useCallback(async (values: RegisterValues) => {
    if (values.password !== values.confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const formData = new FormData();
    formData.append("nationalId", values.nationalId);
    formData.append("fullName", values.fullName);
    formData.append("username", values.username);
    formData.append("email", values.email);
    formData.append("password", values.password);
    formData.append("role", values.role);

    if (values.phone) {
      formData.append("phone", values.phone);
    }

    if (values.shiftId) {
      formData.append("shiftId", values.shiftId);
    }

    if (values.profileImage) {
      formData.append("profileImage", values.profileImage);
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    // Clear both user and token from localStorage
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem("plasticon_token");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      signIn,
      signOut,
      register,
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
