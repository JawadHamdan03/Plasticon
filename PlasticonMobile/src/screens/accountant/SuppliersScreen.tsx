import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
  totalOrders?: number;
  createdAt: string;
}

type SupplierCategory =
  | 'RAW_MATERIALS' | 'SPARE_PARTS' | 'PACKAGING' | 'EQUIPMENT'
  | 'CHEMICALS' | 'LOGISTICS' | 'IT_SERVICES' | 'UTILITIES' | 'OTHER';

const CATEGORIES: SupplierCategory[] = [
  'RAW_MATERIALS', 'SPARE_PARTS', 'PACKAGING', 'EQUIPMENT',
  'CHEMICALS', 'LOGISTICS', 'IT_SERVICES', 'UTILITIES', 'OTHER',
];

interface SupplierForm {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: SupplierCategory | '';
}

const EMPTY_FORM: SupplierForm = {
  name: '', contactPerson: '', phone: '', email: '', address: '', category: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  label, value, onChangeText, placeholder, multiline, keyboardType, required,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address'; required?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={{ color: colors.danger }}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

function CategoryPicker({
  value, onSelect,
}: { value: SupplierCategory | ''; onSelect: (c: SupplierCategory | '') => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>Category</Text>
      <Pressable
        style={styles.pickerBtn}
        onPress={() => setOpen(true)}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value ? value.replace(/_/g, ' ') : 'Select category…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Select Category</Text>
            {(['', ...CATEGORIES] as (SupplierCategory | '')[]).map((cat) => (
              <Pressable
                key={cat}
                style={[styles.pickerItem, cat === value && styles.pickerItemActive]}
                onPress={() => { onSelect(cat); setOpen(false); }}
              >
                <Text style={[styles.pickerItemText, cat === value && { color: colors.primary, fontWeight: '700' }]}>
                  {cat ? cat.replace(/_/g, ' ') : 'None'}
                </Text>
                {cat === value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function SupplierCard({
  item, onEdit, onDelete,
}: { item: Supplier; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name}</Text>
          {item.contactPerson && <Text style={styles.contact}>{item.contactPerson}</Text>}
        </View>
        {item.category && (
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.category.replace(/_/g, ' ')}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {item.email && (
          <View style={styles.footerItem}>
            <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
            <Text style={styles.footerText} numberOfLines={1}>{item.email}</Text>
          </View>
        )}
        {item.phone && (
          <View style={styles.footerItem}>
            <Ionicons name="call-outline" size={13} color={colors.textMuted} />
            <Text style={styles.footerText}>{item.phone}</Text>
          </View>
        )}
        {item.totalOrders != null && (
          <View style={styles.footerItem}>
            <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
            <Text style={styles.footerText}>{item.totalOrders} orders</Text>
          </View>
        )}
      </View>

      {/* Action row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={15} color={colors.primary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={15} color={colors.danger} />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function SuppliersScreen() {
  const [suppliers, setSuppliers]   = useState<Supplier[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Supplier | null>(null);
  const [form, setForm]             = useState<SupplierForm>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ suppliers: Supplier[] }>('/suppliers?limit=30');
      setSuppliers(res.suppliers ?? []);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load suppliers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: Supplier) => {
    setEditing(item);
    setForm({
      name:          item.name,
      contactPerson: item.contactPerson ?? '',
      phone:         item.phone         ?? '',
      email:         item.email         ?? '',
      address:       item.address       ?? '',
      category:      (item.category as SupplierCategory) ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Supplier name is required.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name:          form.name.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        phone:         form.phone.trim()         || undefined,
        email:         form.email.trim()         || undefined,
        address:       form.address.trim()       || undefined,
        category:      form.category             || undefined,
      };
      if (editing) {
        await api.patch(`/suppliers/${editing.id}`, body);
      } else {
        await api.post('/suppliers', body);
      }
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: Supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/suppliers/${item.id}`);
              await load();
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete supplier.');
            }
          },
        },
      ],
    );
  };

  const setField = (key: keyof SupplierForm) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers`}
        showBack
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <SupplierCard
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No suppliers yet</Text>
              <Text style={styles.emptyHint}>Tap + to add the first one</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setModalOpen(false)}
                style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {editing ? 'Edit Supplier' : 'New Supplier'}
              </Text>
              <Pressable
                onPress={() => void handleSave()}
                disabled={saving}
                style={({ pressed }) => [styles.modalSaveBtn, pressed && { opacity: 0.7 }]}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.modalSave}>Save</Text>
                }
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FormField label="Supplier Name"   value={form.name}          onChangeText={setField('name')}          required />
              <FormField label="Contact Person"  value={form.contactPerson} onChangeText={setField('contactPerson')} />
              <FormField label="Phone"           value={form.phone}         onChangeText={setField('phone')}         keyboardType="phone-pad" />
              <FormField label="Email"           value={form.email}         onChangeText={setField('email')}         keyboardType="email-address" />
              <FormField label="Address"         value={form.address}       onChangeText={setField('address')}       multiline />
              <CategoryPicker
                value={form.category}
                onSelect={(c) => setForm((f) => ({ ...f, category: c }))}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, paddingBottom: 100 },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardContent: { flex: 1 },
  name:        { ...typography.h4 },
  contact:     { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  catBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: `${colors.info}15` },
  catText:     { fontSize: 10, fontWeight: '700', color: colors.info },
  footer:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginBottom: 8 },
  footerItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText:  { ...typography.caption, maxWidth: 140 },

  // Action row
  actionRow:     { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  editBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.primaryLight },
  editBtnText:   { fontSize: 13, fontWeight: '600', color: colors.primary },
  deleteBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: `${colors.danger}12` },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: colors.danger },

  // Empty
  empty:     { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  emptyHint: { ...typography.caption, color: colors.textMuted },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.md,
  },

  // Modal
  modalSafe:    { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle:   { ...typography.h3 },
  modalClose:   { padding: 4, minWidth: 60 },
  modalCancel:  { ...typography.body, color: colors.textMuted },
  modalSaveBtn: { padding: 4, minWidth: 60, alignItems: 'flex-end' },
  modalSave:    { ...typography.body, color: colors.primary, fontWeight: '700' },
  modalContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Form fields
  fieldWrap:  { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    ...typography.body,
    color: colors.text,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },

  // Picker
  pickerBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerValue:       { ...typography.body, color: colors.text },
  pickerPlaceholder: { ...typography.body, color: colors.textMuted },
  pickerOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 36,
  },
  pickerSheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.sm },
  pickerItem:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerItemActive:  { backgroundColor: colors.primaryLight, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  pickerItemText:   { ...typography.body },
});
