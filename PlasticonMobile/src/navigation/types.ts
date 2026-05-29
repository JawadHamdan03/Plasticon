import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp }    from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp }    from '@react-navigation/native';

// ─── Auth stack ───────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
};

// ─── Worker tabs ──────────────────────────────────────────────────────────────
export type WorkerTabParamList = {
  Hub:        undefined;
  Production: undefined;
  Attendance: undefined;
  Assistant:  undefined;
  Profile:    undefined;
};

// ─── Engineer tabs ────────────────────────────────────────────────────────────
export type EngineerTabParamList = {
  Dashboard:   undefined;
  Maintenance: undefined;
  Machines:    undefined;
  Assistant:   undefined;
  Profile:     undefined;
};

// ─── Accountant tabs ──────────────────────────────────────────────────────────
export type AccountantTabParamList = {
  Finance:   undefined;
  Invoices:  undefined;
  Expenses:  undefined;
  Assistant: undefined;
  Profile:   undefined;
};

// ─── Admin tabs ───────────────────────────────────────────────────────────────
export type AdminTabParamList = {
  Dashboard:  undefined;
  Operations: undefined;
  Users:      undefined;
  Assistant:  undefined;
  Profile:    undefined;
};

// ─── Navigation prop helpers ──────────────────────────────────────────────────
export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

export type WorkerNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<WorkerTabParamList>,
  NativeStackNavigationProp<AuthStackParamList>
>;
