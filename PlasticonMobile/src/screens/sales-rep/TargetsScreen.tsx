import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ScreenHeader } from '../../components';
import { radius, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

type Target = {
  id: number; month: number; year: number;
  targetAmount: number; achievedAmount: number; notes: string | null;
  rep?: { id: number; fullName: string };
};

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const now = new Date();

export function TargetsScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const { user }   = useAuth();
  const isSalesRep = user?.role === 'SALES_REP';

  const [targets, setTargets]       = useState<Target[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(false);

  // achieved-amount edit map: targetId → string value
  const [achievedInputs, setAchievedInputs] = useState<Record<number, string>>({});
  const [savingAchieved, setSavingAchieved] = useState<number | null>(null);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [month, setMonth]           = useState(String(now.getMonth() + 1));
  const [year, setYear]             = useState(String(now.getFullYear()));
  const [targetAmt, setTargetAmt]   = useState('');
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get<Target[]>('/sales-rep/targets');
      const list = Array.isArray(res) ? res : [];
      setTargets(list);
      // init achieved inputs
      const map: Record<number, string> = {};
      list.forEach((t) => { map[t.id] = String(t.achievedAmount); });
      setAchievedInputs(map);
    } catch { setTargets([]); setError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!targetAmt || Number(targetAmt) <= 0) {
      Alert.alert(isAr ? 'أدخل المبلغ المستهدف' : 'Enter target amount');
      return;
    }
    setSaving(true);
    try {
      await api.post('/sales-rep/targets', {
        month: Number(month),
        year:  Number(year),
        targetAmount: Number(targetAmt),
        notes: notes.trim() || undefined,
      });
      setShowCreate(false);
      setTargetAmt(''); setNotes('');
      setMonth(String(now.getMonth() + 1));
      setYear(String(now.getFullYear()));
      void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAchieved = async (id: number) => {
    const val = Number(achievedInputs[id] ?? '0');
    setSavingAchieved(id);
    try {
      await api.patch(`/sales-rep/targets/${id}/achieved`, { achievedAmount: val });
      void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e?.message ?? 'Error');
    } finally {
      setSavingAchieved(null);
    }
  };

  const renderItem = ({ item }: { item: Target }) => {
    const rawPct   = item.targetAmount > 0 ? Math.round((item.achievedAmount / item.targetAmount) * 100) : 0;
    const pct      = Math.min(100, rawPct);
    const done     = rawPct >= 100;
    const barColor = done ? '#10b981' : pct >= 60 ? colors.accent : '#f59e0b';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderTopColor: barColor, borderTopWidth: 3 }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.monthYear, { color: colors.text }]}>
                {isAr ? MONTHS_AR[item.month - 1] : MONTHS_EN[item.month - 1]} {item.year}
              </Text>
              {done && (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                  <Text style={styles.doneBadgeText}>{isAr ? 'مكتمل' : 'Achieved'}</Text>
                </View>
              )}
              {item.rep && (
                <Text style={[styles.repName, { color: colors.textSecondary }]}>{item.rep.fullName}</Text>
              )}
            </View>
            <Text style={[styles.amounts, { color: colors.textSecondary }]}>
              ₪{Math.round(item.achievedAmount).toLocaleString()} / ₪{Math.round(item.targetAmount).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.pctCircle, { backgroundColor: barColor + '18', borderColor: barColor + '55' }]}>
            <Text style={[styles.pctNum, { color: barColor }]}>{rawPct}</Text>
            <Text style={[styles.pctSymbol, { color: barColor }]}>%</Text>
          </View>
        </View>

        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        </View>

        {item.notes ? (
          <Text style={[styles.notes, { color: colors.textSecondary }]}>{item.notes}</Text>
        ) : null}

        {/* Update achieved — SALES_REP only */}
        {isSalesRep && (
          <View style={[styles.updateRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.updateLabel, { color: colors.textSecondary }]}>
              {isAr ? 'الإنجاز الفعلي:' : 'Update achieved:'}
            </Text>
            <TextInput
              style={[styles.updateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              keyboardType="decimal-pad"
              value={achievedInputs[item.id] ?? String(item.achievedAmount)}
              onChangeText={(v) => setAchievedInputs((prev) => ({ ...prev, [item.id]: v }))}
            />
            <TouchableOpacity
              style={[styles.updateBtn, { backgroundColor: colors.accent }]}
              onPress={() => handleUpdateAchieved(item.id)}
              disabled={savingAchieved === item.id}
            >
              {savingAchieved === item.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.updateBtnText}>{isAr ? 'تحديث' : 'Update'}</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title={isAr ? 'أهداف المبيعات' : 'Sales Targets'} />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.emptyBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.empty, { color: colors.text, fontWeight: '700' }]}>{isAr ? 'تعذّر الاتصال' : 'Connection failed'}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>{isAr ? 'إعادة المحاولة' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={targets}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="flag-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                {isAr ? 'لا توجد أهداف بعد' : 'No targets set yet'}
              </Text>
              {isSalesRep && (
                <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={() => setShowCreate(true)}>
                  <Text style={styles.retryText}>{isAr ? 'تعيين هدف' : 'Set Target'}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* FAB — SALES_REP only */}
      {isSalesRep && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Target Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'تعيين هدف جديد' : 'Set New Target'}</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md }}>
              {/* Month picker */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'الشهر' : 'Month'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthChip, { borderColor: month === m ? colors.accent : colors.border, backgroundColor: month === m ? colors.accent + '22' : 'transparent' }]}
                      onPress={() => setMonth(m)}
                    >
                      <Text style={{ color: month === m ? colors.accent : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                        {isAr ? MONTHS_AR[Number(m) - 1] : MONTHS_EN[Number(m) - 1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Year */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'السنة' : 'Year'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                keyboardType="number-pad"
                value={year}
                onChangeText={setYear}
              />

              {/* Target Amount */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'المبلغ المستهدف (₪) *' : 'Target Amount (₪) *'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={targetAmt}
                onChangeText={setTargetAmt}
              />

              {/* Notes */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'ملاحظات' : 'Notes'}</Text>
              <TextInput
                style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={isAr ? 'ملاحظات اختيارية...' : 'Optional notes...'}
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowCreate(false)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: saving ? colors.textSecondary : colors.accent }]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  <Ionicons name="flag" size={15} color="#fff" />
                  <Text style={styles.submitText}>{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ الهدف' : 'Save Target')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  list:          { padding: spacing.md, gap: spacing.sm, paddingBottom: 90 },
  card:          { borderRadius: radius.md, padding: spacing.md, gap: 10, overflow: 'hidden' },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  monthYear:     { ...typography.body, fontWeight: '700' },
  doneBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10b98118', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  doneBadgeText: { color: '#10b981', fontSize: 11, fontWeight: '700' },
  repName:       { fontSize: 11, fontWeight: '600' },
  amounts:       { ...typography.caption, marginTop: 2 },
  pctCircle:     { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pctNum:        { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  pctSymbol:     { fontSize: 10, fontWeight: '700' },
  progressBg:    { height: 8, borderRadius: 4 },
  progressFill:  { height: 8, borderRadius: 4 },
  notes:         { ...typography.caption, fontStyle: 'italic' },
  updateRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, flexWrap: 'wrap' },
  updateLabel:   { ...typography.caption, fontWeight: '600', flexShrink: 0 },
  updateInput:   { flex: 1, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, minWidth: 80 },
  updateBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.sm },
  updateBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyBox:      { alignItems: 'center', marginTop: 60, gap: 12 },
  empty:         { ...typography.body },
  retryBtn:      { marginTop: 4, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 },
  retryText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  fab:           { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sheetTitle:    { ...typography.h3 },
  label:         { ...typography.caption, fontWeight: '600', marginBottom: 6, marginTop: spacing.sm },
  input:         { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  textarea:      { minHeight: 70, textAlignVertical: 'top' },
  monthChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  modalActions:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  cancelBtn:     { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  submitBtn:     { flex: 2, flexDirection: 'row', paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 6 },
  submitText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
