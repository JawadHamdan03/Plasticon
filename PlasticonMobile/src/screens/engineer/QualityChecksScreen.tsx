import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QCheck {
  id: number;
  machine?: { id: number; name: string } | null;
  issueType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  engineer?: { fullName: string } | null;
}

type FilterKey = 'all' | 'open' | 'resolved';

const ISSUE_TYPES = ['DIMENSIONAL','SURFACE_DEFECT','MATERIAL_FAULT','WEIGHT_ISSUE','COLOR_ISSUE','OTHER'] as const;
type IssueType = typeof ISSUE_TYPES[number];

const SEVERITIES = ['LOW','MEDIUM','HIGH','CRITICAL'] as const;
type Severity = typeof SEVERITIES[number];

const ISSUE_LABEL: Record<string, string> = {
  DIMENSIONAL:'Dimensional', SURFACE_DEFECT:'Surface Defect', MATERIAL_FAULT:'Material Fault',
  WEIGHT_ISSUE:'Weight Issue', COLOR_ISSUE:'Color Issue', OTHER:'Other',
};
const ISSUE_LABEL_AR: Record<string, string> = {
  DIMENSIONAL:'أبعاد', SURFACE_DEFECT:'عيب سطحي', MATERIAL_FAULT:'خلل مادة',
  WEIGHT_ISSUE:'مشكلة وزن', COLOR_ISSUE:'مشكلة لون', OTHER:'أخرى',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityMeta(sev: Severity, colors: any) {
  return {
    LOW:      { color: colors.info,    icon: 'information-circle' as const },
    MEDIUM:   { color: colors.warning, icon: 'alert-circle' as const },
    HIGH:     { color: colors.danger,  icon: 'warning' as const },
    CRITICAL: { color: '#7C3AED',      icon: 'nuclear' as const },
  }[sev] ?? { color: colors.textMuted, icon: 'help-circle' as const };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CheckCard({ item, onResolve, onDelete, resolving }: {
  item: QCheck;
  onResolve: (id: number) => void;
  onDelete: (id: number) => void;
  resolving: boolean;
}) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const meta = severityMeta(item.severity, colors);
  const resolved = !!item.resolvedAt;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, resolved && styles.cardResolved]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.issueType, { color: colors.text }]} numberOfLines={1}>
            {isAr ? ISSUE_LABEL_AR[item.issueType] ?? item.issueType : ISSUE_LABEL[item.issueType] ?? item.issueType}
          </Text>
          <Text style={[styles.machine, { color: colors.textMuted }]}>{item.machine?.name ?? '—'}</Text>
        </View>
        <View style={styles.badgesCol}>
          <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.badgeText, { color: meta.color }]}>{item.severity}</Text>
          </View>
          {resolved ? (
            <View style={[styles.badge, { backgroundColor: `${colors.success}18` }]}>
              <Ionicons name="checkmark-circle" size={11} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>{'محلول'}</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: `${colors.danger}12` }]}>
              <Text style={[styles.badgeText, { color: colors.danger }]}>{'مفتوح'}</Text>
            </View>
          )}
        </View>
      </View>

      {item.description ? (
        <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={[styles.date, { color: colors.textMuted }]}>{fmt(item.createdAt)}</Text>
        {item.engineer && (
          <Text style={[styles.eng, { color: colors.textMuted }]}>
            {'بواسطة'} {item.engineer.fullName}
          </Text>
        )}
        {!resolved && (
          <TouchableOpacity
            onPress={() => onResolve(item.id)}
            disabled={resolving}
            style={[styles.resolveBtn, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}40` }]}
            activeOpacity={0.75}
          >
            {resolving
              ? <ActivityIndicator size="small" color={colors.success} />
              : <>
                  <Ionicons name="checkmark" size={12} color={colors.success} />
                  <Text style={[styles.resolveBtnText, { color: colors.success }]}>{'حل'}</Text>
                </>
            }
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={[styles.resolveBtn, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}30`, marginLeft: 4 }]}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={12} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [machines, setMachines]     = useState<{ id: number; name: string }[]>([]);
  const [machineId, setMachineId]   = useState('');
  const [issueType, setIssueType]   = useState<IssueType>('OTHER');
  const [severity, setSeverity]     = useState<Severity>('MEDIUM');
  const [description, setDescription] = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (visible) {
      api.get<any>('/machines')
        .then((r) => setMachines(Array.isArray(r) ? r : (r.machines ?? [])))
        .catch(() => {});
    }
  }, [visible]);

  const reset = () => { setMachineId(''); setIssueType('OTHER'); setSeverity('MEDIUM'); setDescription(''); };

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/quality-checks', {
        machineId:   machineId ? parseInt(machineId, 10) : undefined,
        issueType,
        severity,
        description: description.trim() || undefined,
      });
      reset();
      onSuccess();
    } catch (err: any) {
      Alert.alert('خطأ', err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{'تسجيل مشكلة جودة'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Machine */}
            {machines.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الآلة'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {machines.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                        machineId === String(m.id) && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setMachineId(String(m.id))}
                    >
                      <Text style={[styles.pillText, { color: colors.text }, machineId === String(m.id) && styles.pillTextActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Issue Type */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'نوع المشكلة *'}</Text>
            <View style={styles.chipGrid}>
              {ISSUE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.gridChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    issueType === t && { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                  onPress={() => setIssueType(t)}
                >
                  <Text style={[styles.gridChipText, { color: colors.textMuted }, issueType === t && { color: colors.primary }]}>
                    {isAr ? ISSUE_LABEL_AR[t] : ISSUE_LABEL[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Severity */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: spacing.sm }]}>{'الخطورة *'}</Text>
            <View style={styles.sevRow}>
              {SEVERITIES.map((s) => {
                const meta = severityMeta(s, colors);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sevBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      severity === s && { backgroundColor: meta.color, borderColor: meta.color }]}
                    onPress={() => setSeverity(s)}
                  >
                    <Text style={[styles.sevText, { color: colors.text }, severity === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description */}
            <View style={[styles.field, { marginTop: spacing.sm }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{'الوصف'}</Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                multiline numberOfLines={3}
                placeholder={'وصف المشكلة...'}
                placeholderTextColor={colors.textMuted}
                value={description} onChangeText={setDescription}
              />
            </View>

            <View style={styles.actions}>
              <Button variant="ghost" onPress={onClose} style={styles.actionBtn}>{'إلغاء'}</Button>
              <Button onPress={submit} loading={saving} style={styles.actionBtn}>{'حفظ'}</Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function QualityChecksScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [checks, setChecks]       = useState<QCheck[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]         = useState(false);
  const [filter, setFilter]       = useState<FilterKey>('all');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [deletingId, setDeletingId]   = useState<number | null>(null);

  const FILTER_TABS: { key: FilterKey; label: string; labelAr: string }[] = [
    { key: 'all',      label: 'All',      labelAr: 'الكل' },
    { key: 'open',     label: 'Open',     labelAr: 'مفتوح' },
    { key: 'resolved', label: 'Resolved', labelAr: 'محلول' },
  ];

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/quality-checks?limit=100');
      const data: QCheck[] = Array.isArray(res) ? res : (res.checks ?? res.data ?? res.items ?? []);
      setChecks(data);
    } catch {
      setChecks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await api.patch(`/quality-checks/${id}/resolve`, {});
      setChecks(prev => prev.map(c => c.id === id ? { ...c, resolvedAt: new Date().toISOString() } : c));
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'Failed to resolve.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'حذف الفحص',
      'هل أنت متأكد؟ لا يمكن التراجع.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await api.delete(`/quality-checks/${id}`);
              setChecks(prev => prev.filter(c => c.id !== id));
            } catch (e: any) {
              Alert.alert('خطأ', e.message ?? 'Failed to delete.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const filtered = checks.filter(c => {
    if (filter === 'open')     return !c.resolvedAt;
    if (filter === 'resolved') return !!c.resolvedAt;
    return true;
  });

  const totalOpen     = checks.filter(c => !c.resolvedAt).length;
  const criticalOpen  = checks.filter(c => !c.resolvedAt && c.severity === 'CRITICAL').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'فحوصات الجودة'} showBack />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statVal, { color: colors.danger }]}>{criticalOpen}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'حرجة مفتوحة'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statVal, { color: colors.warning }]}>{totalOpen}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'مفتوحة'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statVal, { color: colors.success }]}>{checks.length - totalOpen}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{'محلولة'}</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surfaceAlt }]}>
        {FILTER_TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setFilter(t.key)}
            style={[styles.tab, filter === t.key && { backgroundColor: colors.surface, ...shadow.sm }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: filter === t.key ? colors.text : colors.textMuted }]}>
              {isAr ? t.labelAr : t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <CheckCard
              item={item}
              onResolve={handleResolve}
              onDelete={handleDelete}
              resolving={resolvingId === item.id || deletingId === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد فحوصات'}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.success }]} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <CreateModal visible={modal} onClose={() => setModal(false)} onSuccess={() => { setModal(false); void load(); }} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  statsRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', ...shadow.sm },
  statVal:  { fontSize: 22, fontWeight: '800' },
  statLabel:{ ...typography.caption, marginTop: 2, textAlign: 'center' },

  tabs: { flexDirection: 'row', margin: spacing.md, marginBottom: 0, borderRadius: radius.md, padding: 3 },
  tab:  { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: radius.sm - 2 },
  tabText: { fontSize: 12, fontWeight: '600' },

  card:    { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  cardResolved: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft: { flex: 1, marginRight: spacing.sm },
  issueType: { ...typography.h4 },
  machine:   { ...typography.caption, marginTop: 2 },
  badgesCol: { alignItems: 'flex-end', gap: 3 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  desc:      { ...typography.bodySmall, marginBottom: 6 },
  footer:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  date:      { ...typography.caption },
  eng:       { ...typography.caption, flex: 1 },
  resolveBtn:{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, marginLeft: 'auto' },
  resolveBtnText: { fontSize: 11, fontWeight: '700' },

  empty:    { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:{ ...typography.bodySmall },
  fab:      { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, maxHeight: '92%' },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  field:   { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 6 },
  input:   { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  pill:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, marginRight: spacing.sm },
  pillText: { fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  gridChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1.5 },
  gridChipText: { fontSize: 12, fontWeight: '600' },
  sevRow:  { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sevBtn:  { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1.5 },
  sevText: { fontWeight: '700', fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});
