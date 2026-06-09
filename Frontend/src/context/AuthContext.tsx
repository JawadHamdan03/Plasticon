import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL, readApiError } from "../lib/api";

// Helpers — ADMIN sessions live in sessionStorage (clears on browser close)
function readToken(): string | null {
  return window.sessionStorage.getItem("plasticon_token") ?? window.localStorage.getItem("plasticon_token");
}
function readUser(): string | null {
  return window.sessionStorage.getItem("plasticon_user") ?? window.localStorage.getItem("plasticon_user");
}
function writeSession(token: string, user: UserProfile) {
  const store = user.role === "ADMIN" ? window.sessionStorage : window.localStorage;
  const other = user.role === "ADMIN" ? window.localStorage   : window.sessionStorage;
  other.removeItem("plasticon_token");
  other.removeItem("plasticon_user");
  store.setItem("plasticon_token", token);
  store.setItem("plasticon_user", JSON.stringify(user));
}
function clearSession() {
  window.sessionStorage.removeItem("plasticon_token");
  window.sessionStorage.removeItem("plasticon_user");
  window.localStorage.removeItem("plasticon_token");
  window.localStorage.removeItem("plasticon_user");
}

// Global fetch interceptor — ensures credentials and Bearer token are always sent
const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const isFormData = init?.body instanceof FormData;
  const token = readToken();

  const modifiedInit: RequestInit = {
    ...(init ?? {}),
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  };

  return originalFetch(input, modifiedInit);
};

export type UserDocument = {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  title: string;
  createdAt: string;
};

export type UserProfile = {
  id?: number;
  name: string;
  email: string;
  role?: string | null;
  profileImage?: string | null;
  username?: string | null;
  createdAt?: string | null;
  phone?: string | null;
  // Extended profile fields
  bio?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  linkedIn?: string | null;
  skills?: string | null;
  profileCompleted?: boolean;
  userDocuments?: UserDocument[];
  isActive?: boolean;
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
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [user, setUserState] = useState<UserProfile | null>(() => {
    try {
      const stored = readUser();
      return stored ? (JSON.parse(stored) as UserProfile) : null;
    } catch {
      clearSession();
      return null;
    }
  });
  const [loading] = useState(false);

  const persistSession = useCallback(
    (nextToken: string, nextUser: UserProfile) => {
      writeSession(nextToken, nextUser);
      setToken(nextToken);
      setUserState(nextUser);
    },
    [],
  );

  const setUser = useCallback((nextUser: UserProfile) => {
    setUserState(nextUser);
    const store = nextUser.role === "ADMIN" ? window.sessionStorage : window.localStorage;
    store.setItem("plasticon_user", JSON.stringify(nextUser));
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = readToken();
    if (!storedToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/profile/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as any;
      const next: UserProfile = {
        id: data.id,
        name: data.fullName ?? "",
        email: data.email ?? "",
        role: data.role ?? null,
        profileImage: data.profileImage ?? null,
        username: data.username ?? null,
        createdAt: data.createdAt ?? null,
        phone: data.phone ?? null,
        bio: data.bio ?? null,
        jobTitle: data.jobTitle ?? null,
        department: data.department ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        address: data.address ?? null,
        linkedIn: data.linkedIn ?? null,
        skills: data.skills ?? null,
        profileCompleted: data.profileCompleted ?? false,
        userDocuments: data.userDocuments ?? [],
        isActive: data.isActive ?? true,
      };
      setUser(next);
    } catch {
      // silent
    }
  }, [setUser]);

  const signIn = useCallback(
    async (values: LoginValues) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        id?: number;
        username?: string;
        profileCompleted?: boolean;
      };

      if (!data.token || !data.email) {
        throw new Error("Invalid login response.");
      }

      persistSession(data.token, {
        id: data.id,
        name: data.name ?? values.email,
        email: data.email,
        role: data.role ?? "WORKER",
        profileImage: data.profileImage ?? null,
        username: data.username ?? null,
        profileCompleted: data.profileCompleted ?? false,
      });

      // Pull full profile in background after login
      setTimeout(() => void refreshUser(), 300);
    },
    [persistSession, refreshUser],
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

    if (values.phone) formData.append("phone", values.phone);
    if (values.shiftId) formData.append("shiftId", values.shiftId);
    if (values.profileImage) formData.append("profileImage", values.profileImage);

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
    setUserState(null);
    clearSession();
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
      refreshUser,
      setUser,
    }),
    [loading, token, user, signIn, signOut, register, refreshUser, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
