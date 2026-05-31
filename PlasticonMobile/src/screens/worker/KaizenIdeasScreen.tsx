import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface KaizenIdea {
  id:          number;
  title:       string;
  description: string;
  category?:   string;
  status?:     string;
  createdAt:   string;
}

export function KaizenIdeasScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [ideas,      setIdeas]      = useState<KaizenIdea[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [title,      setTitle]      = useState('');
  const [desc,       setDesc]       = useState('');
  const [category,   setCategory]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const STATUS_COLOR: Record<string, string> = {
    pending:  colors.warning,
    approved: colors.success,
    rejected: colors.danger,
    implemented: colors.primary,
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get<KaizenIdea[] | { data: KaizenIdea[] }>('/worker-tools/kaizen/mine');
      setIdeas(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setIdeas([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!title.trim()) { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'أدخل عنوان الفكرة.' : 'Enter an idea title.'); return; }
    if (!desc.trim())  { Alert.alert(isAr ? 'مطلوب' : 'Required', isAr ? 'اشرح فكرتك.' : 'Describe your idea.'); return; }
    setSaving(true);
    try {
      await api.post('/worker-tools/kaizen', {
        title:       title.trim(),
        description: desc.trim(),
        category:    category.trim() || undefined,
      });
      setModal(false); setTitle(''); setDesc(''); setCategory('');
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert(isAr ? 'خطأ' : 'Error', e.message ?? (isAr ? 'فشل إرسال الفكرة.' : 'Failed to submit idea.'));
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'أفكار كايزن' : 'Kaizen Ideas'} subtitle={`${ideas.length} ${isAr ? 'مقدمة' : 'submitted'}`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.success} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.success} />}
        >
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.success }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="bulb" size={20} color="#fff" />
            <Text style={styles.addText}>{isAr ? 'تقديم فكرة تحسين' : 'Submit Improvement Idea'}</Text>
          </TouchableOpacity>

          {ideas.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bulb-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.text }]}>{isAr ? 'لم يتم تقديم أفكار بعد' : 'No ideas submitted yet'}</Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{isAr ? 'شارك أفكار التحسين للمصنع' : 'Share improvement ideas for the factory'}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {ideas.map((idea, idx) => {
                const statusColor = STATUS_COLOR[idea.status?.toLowerCase() ?? ''] ?? colors.textMuted;
                return (
                  <View key={`${idea.id}-${idx}`} style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{idea.title}</Text>
                      {idea.status && (
                        <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
                          <Text style={[styles.badgeText, { color: statusColor }]}>{idea.status}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={3}>{idea.description}</Text>
                    <View style={styles.cardFooter}>
                      {idea.category && <Text style={[styles.category, { color: colors.primary }]}>{idea.category}</Text>}
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>{new Date(idea.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{isAr ? 'فكرة كايزن جديدة' : 'New Kaizen Idea'}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'العنوان *' : 'Title *'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'عنوان الفكرة' : 'Brief idea title'} placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الوصف *' : 'Description *'}</Text>
            <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'اشرح التحسين والفائدة المتوقعة…' : 'Describe the improvement and expected benefit…'} placeholderTextColor={colors.textMuted} value={desc} onChangeText={setDesc} multiline numberOfLines={4} />
            <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? 'الفئة (اختياري)' : 'Category (optional)'}</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]} placeholder={isAr ? 'مثال: السلامة، الجودة، الكفاءة' : 'e.g. Safety, Quality, Efficiency'} placeholderTextColor={colors.textMuted} value={category} onChangeText={setCategory} />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.success }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{isAr ? 'إرسال' : 'Submit'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:    { padding: spacing.md, paddingBottom: 40 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: spacing.xs },
  emptyText:  { ...typography.h4 },
  emptyHint:  { ...typography.bodySmall },
  list:       { gap: spacing.sm },
  card:       { borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: spacing.sm },
  cardTitle:  { ...typography.h4, flex: 1 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText:  { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardDesc:   { ...typography.bodySmall, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  category:   { ...typography.caption, fontWeight: '600' },
  dateText:   { ...typography.caption },
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  label:      { ...typography.caption, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.md },
  inputMulti: { height: 96, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  cancelText: { fontWeight: '700' },
  submitBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  submitText: { fontWeight: '700', color: '#fff' },
});
