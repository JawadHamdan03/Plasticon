import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, RefreshControl, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, uploadForm } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

// ─── Types ──────────────────────────────────────────────────────────────────

type ProductType = 'CAPS' | 'PREFORM';
type AuditFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type Delivery = 'ADMIN_ONLY' | 'ADMIN_AND_SHIFT';
type NotifKey = 'PRODUCTION_CREATED' | 'PURCHASE_CREATED' | 'SALE_CREATED' | 'INVENTORY_TRANSACTION_CREATED';
type Tab = 'overview' | 'production' | 'system' | 'users';

interface ProductionSetting { id: number; productType: ProductType; piecesPerCarton: number; updatedAt?: string }
interface SystemSetting {
  id: number;
  qualityCheckIntervalMinutes: number; qualityCheckReminderMinutes: number;
  inventoryAuditFrequency: AuditFreq; shiftEndReminderMinutes: number;
  weeklyReportDayOfWeek: number; weeklyReportTime: string;
  monthlyReportDayOfMonth: number; monthlyReportTime: string;
  updatedAt?: string;
}
interface SettingsOverview {
  productionSettingsCount: number; hasSystemSetting: boolean;
  productionSettings: ProductionSetting[]; latestSystemSetting: SystemSetting | null;
  summary: { missingProductTypes: ProductType[] };
}
interface NotifRules { rules: Record<NotifKey, { enabled: boolean; delivery: Delivery }>; updatedAt?: string }
interface AdminUser {
  id: number; fullName: string; username: string; email: string; role: string;
  phone: string | null; nationalId: string | null; isActive: boolean; createdAt: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SYSTEM: SystemSetting = {
  id: 0,
  qualityCheckIntervalMinutes: 120, qualityCheckReminderMinutes: 60,
  inventoryAuditFrequency: 'DAILY', shiftEndReminderMinutes: 20,
  weeklyReportDayOfWeek: 1, weeklyReportTime: '09:00',
  monthlyReportDayOfMonth: 1, monthlyReportTime: '09:00',
};
const DEFAULT_NOTIF: NotifRules = {
  rules: {
    PRODUCTION_CREATED: { enabled: true, delivery: 'ADMIN_AND_SHIFT' },
    PURCHASE_CREATED: { enabled: true, delivery: 'ADMIN_ONLY' },
    SALE_CREATED: { enabled: true, delivery: 'ADMIN_ONLY' },
    INVENTORY_TRANSACTION_CREATED: { enabled: true, delivery: 'ADMIN_ONLY' },
  },
};
const PRODUCT_TYPES: ProductType[] = ['CAPS', 'PREFORM'];
const ROLES = ['ADMIN', 'WORKER', 'ENGINEER', 'ACCOUNTANT'];

// ─── Small reusable components ───────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <View style={[kpiStyles.card, { backgroundColor: color }]}>
      <Text style={kpiStyles.label}>{label}</Text>
      <Text style={kpiStyles.value}>{String(value)}</Text>
      <Text style={kpiStyles.sub}>{sub}</Text>
    </View>
  );
}
const kpiStyles = StyleSheet.create({
  card:  { flex: 1, minWidth: 140, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  label: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 32 },
  sub:   { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
});

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[scStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[scStyles.title, { color: colors.accent }]}>{title}</Text>
      {children}
    </View>
  );
}
const scStyles = StyleSheet.create({
  card:  { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm, ...shadow.sm as object },
  title: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
});

function FieldInput({ label, value, onChange, keyboardType = 'default', placeholder }:
  { label: string; value: string; onChange: (v: string) => void; keyboardType?: 'default' | 'numeric'; placeholder?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder ?? ''}
        placeholderTextColor={colors.textMuted}
        style={[fiStyles.input, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      />
    </View>
  );
}
const fiStyles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
});

function ChipSelect<T extends string>({ label, options, value, onChange, labelMap }:
  { label: string; options: T[]; value: T; onChange: (v: T) => void; labelMap?: Partial<Record<T, string>> }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={[chipStyles.chip, { backgroundColor: active ? colors.accent : colors.surfaceAlt, borderColor: active ? colors.accent : colors.border }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? colors.tabBar : colors.textSecondary }}>
                {labelMap?.[opt] ?? opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function SettingsAdminScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const t = {
    overview:    isAr ? 'نظرة عامة'     : 'Overview',
    production:  isAr ? 'الإنتاج'       : 'Production',
    system:      isAr ? 'النظام'        : 'System',
    users:       isAr ? 'المستخدمون'    : 'Users',
    configured:  isAr ? 'مضبوط'         : 'Configured',
    notConf:     isAr ? 'غير مضبوط'     : 'Not configured',
    missing:     isAr ? 'أنواع ناقصة'   : 'Missing types',
    lastUpd:     isAr ? 'آخر تحديث'     : 'Last updated',
    save:        isAr ? 'حفظ'           : 'Save',
    saving:      isAr ? 'جارٍ الحفظ...' : 'Saving...',
    reset:       isAr ? 'إعادة تعيين'   : 'Reset',
    noChanges:   isAr ? 'لا تغييرات'    : 'No changes',
    piecesCarton: isAr ? 'قطع لكل كرتونة' : 'Pieces per carton',
    qualityGroup: isAr ? 'الجودة والتنبيهات' : 'Quality & Alerts',
    reportGroup:  isAr ? 'التقارير الدورية' : 'Scheduled Reports',
    notifRules:   isAr ? 'قواعد الإشعارات' : 'Notification Rules',
    qualInterval: isAr ? 'فترة فحص الجودة (دق)' : 'Quality check interval (min)',
    qualReminder: isAr ? 'تذكير فحص الجودة (دق)' : 'Quality reminder (min)',
    shiftReminder: isAr ? 'تذكير نهاية الوردية (دق)' : 'Shift end reminder (min)',
    auditFreq:    isAr ? 'تردد مراجعة المخزون' : 'Inventory audit frequency',
    weeklyDay:    isAr ? 'يوم التقرير الأسبوعي (1-7)' : 'Weekly report day (1-7)',
    weeklyTime:   isAr ? 'وقت التقرير الأسبوعي (HH:MM)' : 'Weekly report time (HH:MM)',
    monthlyDay:   isAr ? 'يوم التقرير الشهري (1-31)' : 'Monthly report day (1-31)',
    monthlyTime:  isAr ? 'وقت التقرير الشهري (HH:MM)' : 'Monthly report time (HH:MM)',
    addUser:     isAr ? 'إضافة مستخدم'  : 'Add User',
    editUser:    isAr ? 'تعديل المستخدم' : 'Edit User',
    deleteUser:  isAr ? 'حذف المستخدم؟' : 'Delete User?',
    deleteMsg:   isAr ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.',
    cancel:      isAr ? 'إلغاء'         : 'Cancel',
    delete:      isAr ? 'نعم، احذف'     : 'Yes, Delete',
    search:      isAr ? 'بحث بالاسم...' : 'Search by name...',
    allRoles:    isAr ? 'جميع الأدوار'  : 'All Roles',
    fullName:    isAr ? 'الاسم الكامل *' : 'Full Name *',
    username:    isAr ? 'اسم المستخدم'  : 'Username',
    email:       isAr ? 'البريد الإلكتروني *' : 'Email *',
    phone:       isAr ? 'الهاتف'        : 'Phone',
    role:        isAr ? 'الدور'         : 'Role',
    password:    isAr ? 'كلمة المرور *' : 'Password *',
    newPassword: isAr ? 'كلمة المرور الجديدة (اختياري)' : 'New Password (optional)',
    nationalId:  isAr ? 'رقم الهوية'   : 'National ID',
    noUsers:     isAr ? 'لا توجد نتائج' : 'No users found',
    saveNotif:   isAr ? 'حفظ قواعد الإشعارات' : 'Save notification rules',
    adminOnly:   isAr ? 'الأدمن فقط'   : 'Admin only',
    adminShift:  isAr ? 'الأدمن + الشفت' : 'Admin + shift',
    enabled:     isAr ? 'مفعلة'         : 'Enabled',
    productionHealth: isAr ? 'جاهزية الإنتاج' : 'Production readiness',
    systemHealth:     isAr ? 'جاهزية النظام'  : 'System readiness',
  };

  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Overview / Production / System
  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [systemForm, setSystemForm] = useState<SystemSetting>(DEFAULT_SYSTEM);
  const [savedSystem, setSavedSystem] = useState<SystemSetting | null>(null);
  const [prodDrafts, setProdDrafts] = useState<Record<ProductType, string>>({ CAPS: '', PREFORM: '' });
  const [notifRules, setNotifRules] = useState<NotifRules>(DEFAULT_NOTIF);
  const [savedNotif, setSavedNotif] = useState<NotifRules>(DEFAULT_NOTIF);
  const [savingProd, setSavingProd] = useState<ProductType | null>(null);
  const [savingSystem, setSavingSystem] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusOk, setStatusOk] = useState(true);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [userModal, setUserModal] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState({ fullName: '', username: '', email: '', phone: '', role: 'WORKER', password: '', nationalId: '' });
  const [userFormErr, setUserFormErr] = useState('');
  const [userFormSaving, setUserFormSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ── Load settings ──────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      const ov = await api.get<SettingsOverview>('/settings/admin/overview');
      setOverview(ov);
      setProdDrafts({
        CAPS:    String(ov.productionSettings.find(p => p.productType === 'CAPS')?.piecesPerCarton ?? ''),
        PREFORM: String(ov.productionSettings.find(p => p.productType === 'PREFORM')?.piecesPerCarton ?? ''),
      });
      if (ov.latestSystemSetting) {
        setSystemForm(ov.latestSystemSetting);
        setSavedSystem(ov.latestSystemSetting);
      }
      const nr = await api.get<NotifRules>('/settings/notification-rules');
      setNotifRules(nr);
      setSavedNotif(nr);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await api.get<AdminUser[]>('/users/all');
      setUsers(data);
    } catch {
      // silent
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { if (tab === 'users') void loadUsers(); }, [tab, loadUsers]);

  // ── Production save ────────────────────────────────────────────────────────
  const saveProd = async (type: ProductType) => {
    const val = Number(prodDrafts[type]);
    if (!Number.isInteger(val) || val <= 0) {
      setStatusOk(false);
      setStatusMsg(isAr ? 'أدخل عددًا صحيحًا موجبًا' : 'Enter a positive integer');
      return;
    }
    setSavingProd(type);
    setStatusMsg('');
    try {
      await api.put(`/settings/production/${type}`, { piecesPerCarton: val });
      await loadSettings();
      setStatusOk(true);
      setStatusMsg(isAr ? 'تم حفظ إعدادات الإنتاج' : 'Production settings saved');
    } catch (e: any) {
      setStatusOk(false);
      setStatusMsg(e?.message ?? 'Error');
    } finally {
      setSavingProd(null);
    }
  };

  // ── System save ────────────────────────────────────────────────────────────
  const saveSystem = async () => {
    setSavingSystem(true);
    setStatusMsg('');
    try {
      await api.put('/settings/system', {
        qualityCheckIntervalMinutes: Number(systemForm.qualityCheckIntervalMinutes),
        qualityCheckReminderMinutes: Number(systemForm.qualityCheckReminderMinutes),
        inventoryAuditFrequency: systemForm.inventoryAuditFrequency,
        shiftEndReminderMinutes: Number(systemForm.shiftEndReminderMinutes),
        weeklyReportDayOfWeek: Number(systemForm.weeklyReportDayOfWeek),
        weeklyReportTime: systemForm.weeklyReportTime,
        monthlyReportDayOfMonth: Number(systemForm.monthlyReportDayOfMonth),
        monthlyReportTime: systemForm.monthlyReportTime,
      });
      await loadSettings();
      setStatusOk(true);
      setStatusMsg(isAr ? 'تم حفظ إعدادات النظام' : 'System settings saved');
    } catch (e: any) {
      setStatusOk(false);
      setStatusMsg(e?.message ?? 'Error');
    } finally {
      setSavingSystem(false);
    }
  };

  const saveNotifRules = async () => {
    setSavingNotif(true);
    setStatusMsg('');
    try {
      const saved = await api.put<NotifRules>('/settings/notification-rules', { rules: notifRules.rules });
      setNotifRules(saved);
      setSavedNotif(saved);
      setStatusOk(true);
      setStatusMsg(isAr ? 'تم حفظ قواعد الإشعارات' : 'Notification rules saved');
    } catch (e: any) {
      setStatusOk(false);
      setStatusMsg(e?.message ?? 'Error');
    } finally {
      setSavingNotif(false);
    }
  };

  // ── User CRUD ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setUserForm({ fullName: '', username: '', email: '', phone: '', role: 'WORKER', password: '', nationalId: '' });
    setUserFormErr('');
    setEditingUser(null);
    setUserModal('add');
  };
  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setUserForm({ fullName: u.fullName, username: u.username, email: u.email, phone: u.phone ?? '', role: u.role, password: '', nationalId: u.nationalId ?? '' });
    setUserFormErr('');
    setUserModal('edit');
  };

  const saveUser = async () => {
    if (!userForm.fullName.trim() || !userForm.email.trim()) {
      setUserFormErr(isAr ? 'الاسم والبريد الإلكتروني مطلوبان' : 'Name and email are required');
      return;
    }
    if (userModal === 'add' && !userForm.password.trim()) {
      setUserFormErr(isAr ? 'كلمة المرور مطلوبة' : 'Password is required');
      return;
    }
    setUserFormSaving(true);
    setUserFormErr('');
    try {
      if (userModal === 'add') {
        const fd = new FormData();
        fd.append('fullName', userForm.fullName.trim());
        fd.append('username', userForm.username.trim() || userForm.email.split('@')[0]);
        fd.append('email', userForm.email.trim());
        fd.append('password', userForm.password);
        fd.append('role', userForm.role);
        fd.append('nationalId', userForm.nationalId.trim() || '0000000000');
        if (userForm.phone.trim()) fd.append('phone', userForm.phone.trim());
        await uploadForm('/auth/register', fd);
      } else if (editingUser) {
        const body: Record<string, unknown> = {
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim(),
          phone: userForm.phone.trim() || null,
        };
        if (userForm.password.trim()) body.password = userForm.password;
        await api.put(`/users/${editingUser.id}`, body);
        if (userForm.role !== editingUser.role) {
          await api.put(`/users/${editingUser.id}/role`, { role: userForm.role });
        }
      }
      setUserModal(null);
      await loadUsers();
    } catch (e: any) {
      setUserFormErr(e?.message ?? 'Failed to save');
    } finally {
      setUserFormSaving(false);
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      setDeleteId(null);
      await loadUsers();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Failed to delete');
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const prodLookup = new Map(overview?.productionSettings.map(p => [p.productType, p]) ?? []);
  const prodHealth = Math.round(((overview?.productionSettingsCount ?? 0) / PRODUCT_TYPES.length) * 100);
  const sysHealth = overview?.hasSystemSetting ? 100 : 0;
  const systemChanged = JSON.stringify(systemForm) !== JSON.stringify(savedSystem ?? DEFAULT_SYSTEM);
  const notifChanged = JSON.stringify(notifRules.rules) !== JSON.stringify(savedNotif.rules);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleColors: Record<string, string> = {
    ADMIN: '#7C3AED', WORKER: '#6366F1', ENGINEER: '#0EA5E9', ACCOUNTANT: '#F59E0B',
  };

  const NOTIF_LABELS: Record<NotifKey, string> = {
    PRODUCTION_CREATED: isAr ? 'عند إضافة إنتاج' : 'On production create',
    PURCHASE_CREATED: isAr ? 'عند إضافة شراء' : 'On purchase create',
    SALE_CREATED: isAr ? 'عند إضافة بيع' : 'On sale create',
    INVENTORY_TRANSACTION_CREATED: isAr ? 'عند حركة مخزون' : 'On inventory transaction',
  };

  const AUDIT_LABELS: Partial<Record<AuditFreq, string>> = {
    DAILY: isAr ? 'يومي' : 'Daily',
    WEEKLY: isAr ? 'أسبوعي' : 'Weekly',
    MONTHLY: isAr ? 'شهري' : 'Monthly',
  };
  const DELIVERY_LABELS: Partial<Record<Delivery, string>> = {
    ADMIN_ONLY: t.adminOnly,
    ADMIN_AND_SHIFT: t.adminShift,
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',   label: t.overview,   icon: 'grid' },
    { id: 'production', label: t.production, icon: 'layers' },
    { id: 'system',     label: t.system,     icon: 'settings' },
    { id: 'users',      label: t.users,      icon: 'people' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScreenHeader title={isAr ? 'الإعدادات' : 'Settings'} showBack />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'الإعدادات' : 'Settings'} showBack />

      {/* ── Tab bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(({ id, label, icon }) => {
          const active = tab === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setTab(id)}
              style={[styles.tabBtn, active && { backgroundColor: colors.accent }]}
              activeOpacity={0.75}
            >
              <Ionicons name={icon as any} size={14} color={active ? colors.tabBar : colors.textMuted} />
              <Text style={[styles.tabLabel, { color: active ? colors.tabBar : colors.textMuted }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadSettings(); }} tintColor={colors.primary} />}
      >

        {/* ── Status message ── */}
        {statusMsg !== '' && (
          <View style={[styles.statusBar, { backgroundColor: statusOk ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)' }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: statusOk ? '#16A34A' : '#DC2626' }}>{statusOk ? '✓ ' : '✕ '}{statusMsg}</Text>
          </View>
        )}

        {/* ════ OVERVIEW TAB ════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Health badges */}
            <View style={styles.healthRow}>
              <View style={[styles.healthBadge, { backgroundColor: prodHealth === 100 ? 'rgba(22,163,74,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: prodHealth === 100 ? '#16A34A' : '#D97706' }}>
                  {t.productionHealth}: {prodHealth}%
                </Text>
              </View>
              <View style={[styles.healthBadge, { backgroundColor: sysHealth === 100 ? 'rgba(22,163,74,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: sysHealth === 100 ? '#16A34A' : '#D97706' }}>
                  {t.systemHealth}: {sysHealth}%
                </Text>
              </View>
            </View>

            {/* KPI cards */}
            <View style={styles.kpiGrid}>
              <KpiCard
                label={isAr ? 'إعدادات الإنتاج' : 'Production settings'}
                value={overview?.productionSettingsCount ?? 0}
                sub={overview?.productionSettingsCount ? t.configured : t.notConf}
                color="#2563EB"
              />
              <KpiCard
                label={t.missing}
                value={overview?.summary.missingProductTypes.length ?? 0}
                sub={overview?.summary.missingProductTypes.join(', ') || t.configured}
                color={(overview?.summary.missingProductTypes.length ?? 0) > 0 ? '#D97706' : '#16A34A'}
              />
            </View>
            <View style={styles.kpiGrid}>
              <KpiCard
                label={isAr ? 'إعدادات النظام' : 'System settings'}
                value={overview?.hasSystemSetting ? '✓' : '—'}
                sub={overview?.latestSystemSetting ? `ID ${overview.latestSystemSetting.id}` : t.notConf}
                color={overview?.hasSystemSetting ? '#7C3AED' : '#64748B'}
              />
              <KpiCard
                label={t.lastUpd}
                value={overview?.latestSystemSetting?.updatedAt
                  ? new Date(overview.latestSystemSetting.updatedAt).toLocaleDateString()
                  : '—'}
                sub={isAr ? 'آخر تحديث للنظام' : 'Latest system update'}
                color="#F59E0B"
              />
            </View>
          </View>
        )}

        {/* ════ PRODUCTION TAB ══════════════════════════════════════════════ */}
        {tab === 'production' && (
          <View style={styles.tabContent}>
            {PRODUCT_TYPES.map(type => {
              const existing = prodLookup.get(type);
              const draftVal = prodDrafts[type];
              const changed = existing
                ? draftVal !== '' && Number(draftVal) !== existing.piecesPerCarton
                : draftVal.trim() !== '';
              return (
                <SectionCard key={type} title={type}>
                  <View style={[styles.badge, { backgroundColor: existing ? 'rgba(22,163,74,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: existing ? '#16A34A' : '#D97706' }}>
                      {existing ? `${t.configured} — ${existing.piecesPerCarton} ${isAr ? 'قطعة' : 'pcs'}` : t.notConf}
                    </Text>
                  </View>
                  <FieldInput
                    label={t.piecesCarton}
                    value={draftVal}
                    onChange={v => setProdDrafts(p => ({ ...p, [type]: v }))}
                    keyboardType="numeric"
                    placeholder="e.g. 48"
                  />
                  <TouchableOpacity
                    onPress={() => void saveProd(type)}
                    disabled={savingProd === type || !changed}
                    style={[styles.saveBtn, { backgroundColor: changed ? colors.accent : colors.surfaceAlt }]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: changed ? colors.tabBar : colors.textMuted }}>
                      {savingProd === type ? t.saving : t.save}
                    </Text>
                  </TouchableOpacity>
                </SectionCard>
              );
            })}
          </View>
        )}

        {/* ════ SYSTEM TAB ══════════════════════════════════════════════════ */}
        {tab === 'system' && (
          <View style={styles.tabContent}>
            {/* Quality & Alerts */}
            <SectionCard title={t.qualityGroup}>
              <FieldInput label={t.qualInterval} value={String(systemForm.qualityCheckIntervalMinutes)} onChange={v => setSystemForm(p => ({ ...p, qualityCheckIntervalMinutes: Number(v) || 0 }))} keyboardType="numeric" />
              <FieldInput label={t.qualReminder} value={String(systemForm.qualityCheckReminderMinutes)} onChange={v => setSystemForm(p => ({ ...p, qualityCheckReminderMinutes: Number(v) || 0 }))} keyboardType="numeric" />
              <FieldInput label={t.shiftReminder} value={String(systemForm.shiftEndReminderMinutes)} onChange={v => setSystemForm(p => ({ ...p, shiftEndReminderMinutes: Number(v) || 0 }))} keyboardType="numeric" />
              <ChipSelect<AuditFreq>
                label={t.auditFreq}
                options={['DAILY', 'WEEKLY', 'MONTHLY']}
                value={systemForm.inventoryAuditFrequency}
                onChange={v => setSystemForm(p => ({ ...p, inventoryAuditFrequency: v }))}
                labelMap={AUDIT_LABELS}
              />
            </SectionCard>

            {/* Scheduled Reports */}
            <SectionCard title={t.reportGroup}>
              <FieldInput label={t.weeklyDay} value={String(systemForm.weeklyReportDayOfWeek)} onChange={v => setSystemForm(p => ({ ...p, weeklyReportDayOfWeek: Number(v) || 1 }))} keyboardType="numeric" />
              <FieldInput label={t.weeklyTime} value={systemForm.weeklyReportTime} onChange={v => setSystemForm(p => ({ ...p, weeklyReportTime: v }))} placeholder="09:00" />
              <FieldInput label={t.monthlyDay} value={String(systemForm.monthlyReportDayOfMonth)} onChange={v => setSystemForm(p => ({ ...p, monthlyReportDayOfMonth: Number(v) || 1 }))} keyboardType="numeric" />
              <FieldInput label={t.monthlyTime} value={systemForm.monthlyReportTime} onChange={v => setSystemForm(p => ({ ...p, monthlyReportTime: v }))} placeholder="09:00" />
            </SectionCard>

            {/* System save / reset */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={() => void saveSystem()}
                disabled={savingSystem || !systemChanged}
                style={[styles.saveBtn, { flex: 1, backgroundColor: systemChanged ? colors.accent : colors.surfaceAlt }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: systemChanged ? colors.tabBar : colors.textMuted }}>
                  {savingSystem ? t.saving : t.save}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSystemForm(savedSystem ?? DEFAULT_SYSTEM)}
                style={[styles.ghostBtn, { borderColor: colors.border }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{t.reset}</Text>
              </TouchableOpacity>
            </View>

            {/* Notification Rules */}
            <SectionCard title={t.notifRules}>
              {(Object.keys(notifRules.rules) as NotifKey[]).map(key => {
                const rule = notifRules.rules[key];
                return (
                  <View key={key} style={[styles.notifRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{NOTIF_LABELS[key]}</Text>
                      {rule.enabled && (
                        <ChipSelect<Delivery>
                          label={isAr ? 'الوصول' : 'Delivery'}
                          options={['ADMIN_ONLY', 'ADMIN_AND_SHIFT']}
                          value={rule.delivery}
                          onChange={v => setNotifRules(p => ({ ...p, rules: { ...p.rules, [key]: { ...p.rules[key], delivery: v } } }))}
                          labelMap={DELIVERY_LABELS}
                        />
                      )}
                    </View>
                    <Switch
                      value={rule.enabled}
                      onValueChange={v => setNotifRules(p => ({ ...p, rules: { ...p.rules, [key]: { ...p.rules[key], enabled: v } } }))}
                      trackColor={{ false: colors.border, true: colors.accent + '80' }}
                      thumbColor={rule.enabled ? colors.accent : colors.textMuted}
                    />
                  </View>
                );
              })}
            </SectionCard>

            <TouchableOpacity
              onPress={() => void saveNotifRules()}
              disabled={savingNotif || !notifChanged}
              style={[styles.saveBtn, { backgroundColor: notifChanged ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: notifChanged ? '#fff' : colors.textMuted }}>
                {savingNotif ? t.saving : t.saveNotif}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════ USERS TAB ═══════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <View style={styles.tabContent}>
            {/* Role KPI row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {ROLES.map(r => (
                <View key={r} style={[styles.roleKpi, { backgroundColor: roleColors[r] ?? '#64748B' }]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{r}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff' }}>{users.filter(u => u.role === r).length}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Search + filter row */}
            <View style={styles.searchRow}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t.search}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />
              <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="add" size={20} color={colors.tabBar} />
              </TouchableOpacity>
            </View>

            {/* Role filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
              {(['ALL', ...ROLES]).map(r => {
                const active = roleFilter === r;
                return (
                  <TouchableOpacity key={r} onPress={() => setRoleFilter(r)} style={[chipStyles.chip, { backgroundColor: active ? colors.primary : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
                      {r === 'ALL' ? t.allRoles : r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingUsers ? (
              <View style={styles.center}><ActivityIndicator size="small" color={colors.primary} /></View>
            ) : filteredUsers.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 24, fontSize: 14 }}>{t.noUsers}</Text>
            ) : (
              filteredUsers.map(u => (
                <View key={u.id} style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.userAvatar, { backgroundColor: roleColors[u.role] ?? '#64748B' }]}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{u.fullName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{u.fullName}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{u.email}</Text>
                    <View style={[styles.rolePill, { backgroundColor: (roleColors[u.role] ?? '#64748B') + '20' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: roleColors[u.role] ?? '#64748B' }}>{u.role}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity onPress={() => openEdit(u)} style={[styles.iconAction, { borderColor: colors.border }]}>
                      <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeleteId(u.id)} style={[styles.iconAction, { borderColor: 'rgba(220,38,38,0.3)', backgroundColor: 'rgba(220,38,38,0.06)' }]}>
                      <Ionicons name="trash" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Add / Edit User Modal ── */}
      <Modal visible={userModal !== null} transparent animationType="slide" onRequestClose={() => setUserModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setUserModal(null)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <ScrollView style={[styles.modalSheet, { backgroundColor: colors.surface }]} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
                <Text style={[typography.h3, { color: colors.text }]}>
                  {userModal === 'add' ? t.addUser : t.editUser}
                </Text>

                <FieldInput label={t.fullName} value={userForm.fullName} onChange={v => setUserForm(p => ({ ...p, fullName: v }))} placeholder="John Doe" />
                {userModal === 'add' && (
                  <FieldInput label={t.username} value={userForm.username} onChange={v => setUserForm(p => ({ ...p, username: v }))} placeholder="johndoe" />
                )}
                <FieldInput label={t.email} value={userForm.email} onChange={v => setUserForm(p => ({ ...p, email: v }))} placeholder="user@company.com" />
                <FieldInput label={t.phone} value={userForm.phone} onChange={v => setUserForm(p => ({ ...p, phone: v }))} placeholder="+966..." />
                {userModal === 'add' && (
                  <FieldInput label={t.nationalId} value={userForm.nationalId} onChange={v => setUserForm(p => ({ ...p, nationalId: v }))} placeholder="1234567890" />
                )}
                <FieldInput label={userModal === 'add' ? t.password : t.newPassword} value={userForm.password} onChange={v => setUserForm(p => ({ ...p, password: v }))} placeholder="••••••••" />

                <ChipSelect<string>
                  label={t.role}
                  options={ROLES}
                  value={userForm.role}
                  onChange={v => setUserForm(p => ({ ...p, role: v }))}
                />

                {userFormErr !== '' && (
                  <View style={[styles.statusBar, { backgroundColor: 'rgba(220,38,38,0.1)' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#DC2626' }}>{userFormErr}</Text>
                  </View>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={() => setUserModal(null)} style={[styles.ghostBtn, { flex: 1, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => void saveUser()} disabled={userFormSaving} style={[styles.saveBtn, { flex: 1, backgroundColor: colors.accent }]}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.tabBar }}>{userFormSaving ? t.saving : t.save}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal visible={deleteId !== null} transparent animationType="fade" onRequestClose={() => setDeleteId(null)}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'center' }]} activeOpacity={1} onPress={() => setDeleteId(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.deleteSheet, { backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 32, textAlign: 'center' }}>🗑️</Text>
              <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>{t.deleteUser}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>{t.deleteMsg}</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity onPress={() => setDeleteId(null)} style={[styles.ghostBtn, { flex: 1, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteId !== null && void deleteUser(deleteId)} style={[styles.saveBtn, { flex: 1, backgroundColor: '#DC2626' }]}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{t.delete}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content:  { padding: spacing.md, paddingBottom: 48 },

  tabBar:        { borderBottomWidth: 1, maxHeight: 52 },
  tabBarContent: { paddingHorizontal: spacing.md, paddingVertical: 8, gap: 6, alignItems: 'center' },
  tabBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  tabLabel:      { fontSize: 13, fontWeight: '700' },

  tabContent: { gap: spacing.md },
  statusBar:  { padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm },

  healthRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  healthBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },

  kpiGrid: { flexDirection: 'row', gap: spacing.sm },

  badge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  saveBtn: { borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  ghostBtn: { borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  btnRow:  { flexDirection: 'row', gap: spacing.sm },

  notifRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },

  searchRow:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  addBtn:      { width: 42, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },

  roleKpi: { borderRadius: radius.sm, padding: 10, alignItems: 'center', minWidth: 80, gap: 2 },

  userCard:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm as object },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rolePill:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  iconAction: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  deleteSheet:  { margin: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
});
