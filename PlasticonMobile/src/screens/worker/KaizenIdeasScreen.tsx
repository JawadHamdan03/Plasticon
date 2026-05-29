import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface KaizenIdea {
  id:          number;
  title:       string;
  description: string;
  category?:   string;
  status?:     string;
  createdAt:   string;
}

const STATUS_COLOR: Record<string, string> = {
  pending:  colors.warning,
  approved: colors.success,
  rejected: colors.danger,
  implemented: colors.primary,
};

export function KaizenIdeasScreen() {
  const [ideas,      setIdeas]      = useState<KaizenIdea[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [title,      setTitle]      = useState('');
  const [desc,       setDesc]       = useState('');
  const [category,   setCategory]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<KaizenIdea[] | { data: KaizenIdea[] }>('/worker-tools/kaizen/mine');
      setIdeas(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setIdeas([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Enter an idea title.'); return; }
    if (!desc.trim())  { Alert.alert('Required', 'Describe your idea.'); return; }
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
      Alert.alert('Error', e.message ?? 'Failed to submit idea.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Kaizen Ideas" subtitle={`${ideas.length} submitted`} showBack />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.success} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.success} />}
        >
          <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Ionicons name="bulb" size={20} color="#fff" />
            <Text style={styles.addText}>Submit Improvement Idea</Text>
          </TouchableOpacity>

          {ideas.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bulb-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No ideas submitted yet</Text>
              <Text style={styles.emptyHint}>Share improvement ideas for the factory</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {ideas.map((idea) => {
                const statusColor = STATUS_COLOR[idea.status?.toLowerCase() ?? ''] ?? colors.textMuted;
                return (
                  <View key={idea.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{idea.title}</Text>
                      {idea.status && (
                        <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
                          <Text style={[styles.badgeText, { color: statusColor }]}>{idea.status}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardDesc} numberOfLines={3}>{idea.description}</Text>
                    <View style={styles.cardFooter}>
                      {idea.category && <Text style={styles.category}>{idea.category}</Text>}
                      <Text style={styles.dateText}>{new Date(idea.createdAt).toLocaleDateString()}</Text>
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
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>New Kaizen Idea</Text>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} placeholder="Brief idea title" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
            <Text style={styles.label}>Description *</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Describe the improvement and expected benefit…" placeholderTextColor={colors.textMuted} value={desc} onChangeText={setDesc} multiline numberOfLines={4} />
            <Text style={styles.label}>Category (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. Safety, Quality, Efficiency" placeholderTextColor={colors.textMuted} value={category} onChangeText={setCategory} />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:    { padding: spacing.md, paddingBottom: 40 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.success, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: spacing.xs },
  emptyText:  { ...typography.h4 },
  emptyHint:  { ...typography.bodySmall, color: colors.textMuted },
  list:       { gap: spacing.sm },
  card:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: spacing.sm },
  cardTitle:  { ...typography.h4, flex: 1 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  badgeText:  { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardDesc:   { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  category:   { ...typography.caption, color: colors.primary, fontWeight: '600' },
  dateText:   { ...typography.caption, color: colors.textMuted },
  overlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  label:      { ...typography.caption, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt, marginBottom: spacing.md },
  inputMulti: { height: 96, textAlignVertical: 'top' },
  actions:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  cancelText: { fontWeight: '700', color: colors.textMuted },
  submitBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.success },
  submitText: { fontWeight: '700', color: '#fff' },
});
