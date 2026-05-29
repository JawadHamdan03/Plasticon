import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { Button, ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface ProductionRecord {
  id: number;
  productName: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  status?: string;
}

function ProductionItem({ item }: { item: ProductionRecord }) {
  const date = new Date(item.createdAt);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <View style={styles.itemIconBg}>
          <Ionicons name="cube" size={18} color={colors.primary} />
        </View>
        <View style={styles.itemMeta}>
          <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
          {item.notes ? <Text style={styles.itemNotes} numberOfLines={1}>{item.notes}</Text> : null}
          <Text style={styles.itemTime}>{dateStr} · {timeStr}</Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemQty}>{item.quantity}</Text>
        <Text style={styles.itemUnit}>units</Text>
      </View>
    </View>
  );
}

interface LogForm { productName: string; quantity: string; notes: string; }

function LogModal({
  visible, onClose, onSuccess,
}: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm]     = useState<LogForm>({ productName: '', quantity: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({ productName: '', quantity: '', notes: '' });

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!form.productName.trim()) { Alert.alert('Required', 'Product name is required.'); return; }
    const qty = parseInt(form.quantity, 10);
    if (!qty || qty <= 0)         { Alert.alert('Required', 'Enter a valid quantity.'); return; }

    setSaving(true);
    try {
      await api.post('/production', {
        productName: form.productName.trim(),
        quantity:    qty,
        notes:       form.notes.trim() || undefined,
      });
      reset();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.modalTitle}>Log Production</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. PVC Pipe 50mm"
              placeholderTextColor={colors.textMuted}
              value={form.productName}
              onChangeText={(t) => setForm((p) => ({ ...p, productName: t }))}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Quantity (units) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 120"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={form.quantity}
              onChangeText={(t) => setForm((p) => ({ ...p, quantity: t }))}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Any remarks..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={form.notes}
              onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
            />
          </View>

          <View style={styles.modalActions}>
            <Button variant="ghost" onPress={handleClose} style={styles.actionBtn}>Cancel</Button>
            <Button onPress={handleSubmit} loading={saving} style={styles.actionBtn}>Save Log</Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ProductionScreen() {
  const [records, setRecords]   = useState<ProductionRecord[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ records: ProductionRecord[]; total: number }>('/production/my?limit=30');
      setRecords(res.records ?? []);
      setTotal(res.total ?? 0);
    } catch {
      // keep last state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); void load(); };

  const handleSuccess = () => {
    setModalOpen(false);
    setLoading(true);
    void load();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Production" subtitle={`${total} total records`} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <ProductionItem item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No production logs yet</Text>
              <Text style={styles.emptyText}>Tap the button below to log your first entry.</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <LogModal visible={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleSuccess} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  itemLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  itemIconBg: {
    width: 38, height: 38, borderRadius: radius.sm,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  itemMeta:  { flex: 1 },
  itemName:  { ...typography.h4 },
  itemNotes: { ...typography.caption, marginTop: 1 },
  itemTime:  { ...typography.caption, marginTop: 2, color: colors.textMuted },
  itemRight: { alignItems: 'flex-end' },
  itemQty:   { fontSize: 20, fontWeight: '800', color: colors.primary },
  itemUnit:  { ...typography.caption },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptyText:  { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.lg,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h2, marginBottom: spacing.md },

  field:       { marginBottom: spacing.md },
  fieldLabel:  { ...typography.caption, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 11,
    fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn:    { flex: 1 },
});
