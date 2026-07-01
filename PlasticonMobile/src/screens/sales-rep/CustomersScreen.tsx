import React, { useCallback, useEffect, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
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

type Customer = { id: number; name: string; phone: string | null; email: string | null; address: string | null };

const AVATAR_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function getAvatarColor(name: string): string {
  const idx = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const BLANK = { name: '', phone: '', email: '', address: '' };

export function CustomersScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const { user }   = useAuth();
  const isSalesRep = user?.role === 'SALES_REP';

  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(false);
  const [search, setSearch]         = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(BLANK);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get<Customer[]>('/sales-rep/customers');
      setCustomers(Array.isArray(res) ? res : []);
    } catch { setCustomers([]); setError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert('الاسم مطلوب');
      return;
    }
    setSaving(true);
    try {
      await api.post('/sales-rep/customers', {
        name:    form.name.trim(),
        phone:   form.phone.trim()   || undefined,
        email:   form.email.trim()   || undefined,
        address: form.address.trim() || undefined,
      });
      setShowCreate(false);
      setForm(BLANK);
      void load();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const renderItem = ({ item }: { item: Customer }) => {
    const color = getAvatarColor(item.name);
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: color, borderLeftWidth: 3 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[styles.avatarText, { color }]}>{getInitials(item.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            {item.address ? (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
                <Text style={[styles.detail, { color: colors.textSecondary }]}>{item.address}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.contactGrid}>
          {item.phone ? (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={12} color={color} />
              <Text style={[styles.detail, { color: colors.textSecondary }]}>{item.phone}</Text>
            </View>
          ) : null}
          {item.email ? (
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={12} color={color} />
              <Text style={[styles.detail, { color: colors.textSecondary }]}>{item.email}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title={'عملائي'} />

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={'بحث...'}
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.emptyBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.empty, { color: colors.text, fontWeight: '700' }]}>{'تعذّر الاتصال'}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>{'إعادة المحاولة'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                {search ? ('لا توجد نتائج') : ('لا يوجد عملاء بعد')}
              </Text>
              {isSalesRep && !search && (
                <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={() => setShowCreate(true)}>
                  <Text style={styles.retryText}>{'إضافة عميل'}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* FAB — SALES_REP only */}
      {isSalesRep && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => { setForm(BLANK); setShowCreate(true); }}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Customer Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{'إضافة عميل جديد'}</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{'الاسم *'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={'اسم العميل...'}
                placeholderTextColor={colors.textSecondary}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>{'الهاتف'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="05X-XXXXXXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>{'البريد الإلكتروني'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="example@email.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>{'العنوان'}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={'المدينة، الشارع...'}
                placeholderTextColor={colors.textSecondary}
                value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
              />

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowCreate(false)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{'إلغاء'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: saving ? colors.textSecondary : colors.accent }]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.submitText}>{saving ? ('جارٍ الحفظ...') : ('إضافة')}</Text>
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
  safe:        { flex: 1 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, margin: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, height: 42 },
  searchInput: { flex: 1, ...typography.body },
  list:        { padding: spacing.md, gap: spacing.sm, paddingBottom: 90 },
  card:        { borderRadius: radius.md, padding: spacing.md, gap: 8 },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatar:      { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 14, fontWeight: '800' },
  name:        { ...typography.body, fontWeight: '700' },
  contactGrid: { gap: 4, paddingLeft: 2 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detail:      { ...typography.caption },
  emptyBox:    { alignItems: 'center', marginTop: 60, gap: 12 },
  empty:       { ...typography.body },
  retryBtn:    { marginTop: 4, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  fab:         { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sheetTitle:  { ...typography.h3 },
  label:       { ...typography.caption, fontWeight: '600', marginBottom: 6, marginTop: spacing.sm },
  input:       { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  actions:     { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  cancelBtn:   { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  submitBtn:   { flex: 2, flexDirection: 'row', paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 6 },
  submitText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
