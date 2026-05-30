import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface Reading {
  id:        number;
  value:     number;
  unit?:     string;
  notes?:    string;
  createdAt: string;
  user?:     { fullName: string };
}

export function ReadingsScreen() {
  const [readings,   setReadings]   = useState<Reading[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [value,      setValue]      = useState('');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [showForm,   setShowForm]   = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Reading[] | { data: Reading[] }>('/electricity/readings');
      setReadings(Array.isArray(res) ? res : (res.data ?? []));
    } catch { setReadings([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!value.trim() || isNaN(Number(value))) {
      Alert.alert('Required', 'Please enter a valid reading value.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/electricity/readings', {
        value:  parseFloat(value),
        notes:  notes.trim() || undefined,
      });
      setValue(''); setNotes(''); setShowForm(false);
      setLoading(true); void load();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save reading.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Readings" subtitle="Electricity meter readings" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
      >
        {/* Log form */}
        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Log New Reading</Text>
            <TextInput style={styles.input} placeholder="Meter value (kWh)" placeholderTextColor={colors.textMuted} value={value} onChangeText={setValue} keyboardType="numeric" />
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Notes (optional)" placeholderTextColor={colors.textMuted} value={notes} onChangeText={setNotes} multiline numberOfLines={2} />
            <View style={styles.formRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addText}>Log Reading</Text>
          </TouchableOpacity>
        )}

        {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : (
          readings.length === 0 ? (
            <View style={styles.empty}><Ionicons name="flash-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No readings logged</Text></View>
          ) : (
            <View style={styles.list}>
              {readings.map((r, idx) => (
                <View key={`${r.id}-${idx}`} style={styles.card}>
                  <View style={styles.cardIcon}><Ionicons name="flash" size={20} color={colors.warning} /></View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardValue}>{r.value} {r.unit ?? 'kWh'}</Text>
                    {r.notes ? <Text style={styles.cardNotes}>{r.notes}</Text> : null}
                    <Text style={styles.cardDate}>{new Date(r.createdAt).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  content:    { padding: spacing.md, paddingBottom: 40 },
  form:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  formTitle:  { ...typography.h4, marginBottom: spacing.sm },
  input:      { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt, marginBottom: spacing.sm },
  inputMulti: { height: 64, textAlignVertical: 'top' },
  formRow:    { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  cancelText: { ...typography.bodySmall, fontWeight: '700', color: colors.textMuted },
  saveBtn:    { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.warning },
  saveText:   { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.warning, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md },
  addText:    { ...typography.bodySmall, fontWeight: '700', color: '#fff' },
  empty:      { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted },
  list:       { gap: spacing.sm },
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardIcon:   { width: 40, height: 40, borderRadius: radius.md, backgroundColor: `${colors.warning}15`, alignItems: 'center', justifyContent: 'center' },
  cardBody:   { flex: 1 },
  cardValue:  { ...typography.h4 },
  cardNotes:  { ...typography.caption, color: colors.textMuted },
  cardDate:   { ...typography.caption, color: colors.textMuted },
});
