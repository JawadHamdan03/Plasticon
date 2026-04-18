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
    // Only restore user from localStorage, not token
    // Token is now stored in HTTP-only cookie by backend
    const storedUser = window.localStorage.getItem(USER_KEY);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as UserProfile);
        // Set token to a placeholder to indicate user is logged in
        // Real token is in HTTP-only cookie
        setToken("authenticated");
      } catch {
        window.localStorage.removeItem(USER_KEY);
      }
    }

    setLoading(false);
  }, []);

  const persistSession = useCallback(
    (_nextToken: string, nextUser: UserProfile) => {
      // Token is stored in HTTP-only cookie by backend, not in localStorage
      // Set a placeholder token to indicate user is authenticated
      setToken("authenticated");
      setUser(nextUser);
      // Only store user profile in localStorage (for UX, not security)
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
    // Only clear user from localStorage (token is in HTTP-only cookie)
    window.localStorage.removeItem(USER_KEY);
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
