import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
import { useLocale } from '../../context/LocaleContext';
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader, StatCard } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Invoice {
  id: number;
  invoiceNumber?: string | null;
  invoiceType: string;
  totalAmount?: number | null;
  paymentStatus?: string | null;
  dueDate?: string | null;
  issueDate?: string | null;
  currency?: string | null;
  notes?: string | null;
  driverName?: string | null;
  confirmedAt?: string | null;
  customer?: { id: number; name: string } | null;
  createdBy?: { id: number; fullName: string } | null;
  createdAt: string;
}

type Tab = 'ALL' | 'SHIPMENT' | 'RECEIPT' | 'REGULAR';
const TABS: Tab[] = ['ALL', 'SHIPMENT', 'RECEIPT', 'REGULAR'];
const TAB_AR: Record<Tab, string> = { ALL: 'الكل', SHIPMENT: 'شحن', RECEIPT: 'استلام', REGULAR: 'عادي' };
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'OVERDUE'] as const;

interface RegularForm { customerName: string; invoiceNumber: string; totalAmount: string; dueDate: string; currency: string; }
interface EditForm { invoiceNumber: string; customerName: string; totalAmount: string; dueDate: string; issueDate: string; currency: string; notes: string; driverName: string; }

const EMPTY_REG: RegularForm = { customerName: '', invoiceNumber: '', totalAmount: '', dueDate: '', currency: 'USD' };
const EMPTY_EDIT: EditForm   = { invoiceNumber: '', customerName: '', totalAmount: '', dueDate: '', issueDate: '', currency: 'USD', notes: '', driverName: '' };
const CURRENCIES = ['USD', 'ILS', 'EUR', 'GBP', 'SAR', 'AED', 'JOD', 'EGP'];

const paymentColor = (s: string | null | undefined, colors: any) => {
  if (s === 'PAID')    return { bg: colors.successLight, fg: colors.success };
  if (s === 'OVERDUE') return { bg: `${colors.danger}20`,  fg: colors.danger };
  return                      { bg: colors.warningLight,   fg: colors.warning };
};

const typeColor = (t: string, colors: any) => {
  if (t === 'SHIPMENT') return colors.info;
  if (t === 'RECEIPT')  return colors.accent;
  return colors.primary;
};

export function InvoicesScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<Tab>('ALL');
  const [search,     setSearch]     = useState('');

  // create modal
  const [createModal, setCreateModal] = useState(false);
  const [createType,  setCreateType]  = useState<'REGULAR' | 'SHIPMENT' | 'RECEIPT'>('REGULAR');
  const [regForm,     setRegForm]     = useState<RegularForm>(EMPTY_REG);
  const [srCustomer,  setSrCustomer]  = useState('');
  const [srInvNum,    setSrInvNum]    = useState('');
  const [srDriver,    setSrDriver]    = useState('');
  const [srNotes,     setSrNotes]     = useState('');
  const [srCurrency,  setSrCurrency]  = useState('USD');
  const [saving,      setSaving]      = useState(false);

  // edit modal
  const [editModal,  setEditModal]   = useState(false);
  const [editing,    setEditing]     = useState<Invoice | null>(null);
  const [editForm,   setEditForm]    = useState<EditForm>(EMPTY_EDIT);
  const [editSaving, setEditSaving]  = useState(false);

  // payment modal
  const [payModal,   setPayModal]    = useState(false);
  const [payTarget,  setPayTarget]   = useState<Invoice | null>(null);
  const [payStatus,  setPayStatus]   = useState<string>('PAID');
  const [payLoading, setPayLoading]  = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Invoice[] | { data: Invoice[] }>('/invoices?limit=50');
      setInvoices(Array.isArray(res) ? res : ((res as any).data ?? []));
    } catch { setInvoices([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = (inv: Invoice) => {
    Alert.alert('حذف', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/invoices/${inv.id}`);
          setInvoices((p) => p.filter((x) => x.id !== inv.id));
        } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
      }},
    ]);
  };

  const handleConfirm = async (inv: Invoice) => {
    try {
      const up = await api.patch<Invoice>(`/invoices/${inv.id}/confirm`, {});
      setInvoices((p) => p.map((x) => x.id === inv.id ? up : x));
    } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
  };

  const openCreate = () => {
    setRegForm(EMPTY_REG); setSrCustomer(''); setSrInvNum(''); setSrDriver(''); setSrNotes(''); setSrCurrency('USD');
    setCreateType('REGULAR'); setCreateModal(true);
  };

  const submitCreate = async () => {
    setSaving(true);
    try {
      let body: Record<string, unknown>;
      if (createType === 'REGULAR') {
        if (!regForm.customerName.trim() || !regForm.totalAmount) {
          Alert.alert('مطلوب', 'أدخل اسم العميل والمبلغ');
          setSaving(false); return;
        }
        body = {
          invoiceType: 'REGULAR', customerName: regForm.customerName.trim(),
          invoiceNumber: regForm.invoiceNumber.trim() || undefined,
          totalAmount: parseFloat(regForm.totalAmount), dueDate: regForm.dueDate || undefined,
          currency: regForm.currency,
        };
      } else {
        if (!srCustomer.trim()) {
          Alert.alert('مطلوب', 'أدخل اسم العميل');
          setSaving(false); return;
        }
        body = {
          invoiceType: createType, customerName: srCustomer.trim(),
          invoiceNumber: srInvNum.trim() || undefined, currency: srCurrency,
          driverName: srDriver.trim() || undefined, notes: srNotes.trim() || undefined,
        };
      }
      const cr = await api.post<Invoice>('/invoices', body);
      setInvoices((p) => [cr, ...p]);
      setCreateModal(false);
    } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
    finally { setSaving(false); }
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setEditForm({
      invoiceNumber: inv.invoiceNumber ?? '',
      customerName:  inv.customer?.name ?? '',
      totalAmount:   String(inv.totalAmount ?? ''),
      dueDate:       inv.dueDate?.slice(0, 10) ?? '',
      issueDate:     inv.issueDate?.slice(0, 10) ?? '',
      currency:      inv.currency ?? 'USD',
      notes:         inv.notes ?? '',
      driverName:    inv.driverName ?? '',
    });
    setEditModal(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        invoiceNumber: editForm.invoiceNumber.trim() || undefined,
        customerName:  editForm.customerName.trim() || undefined,
        totalAmount:   editForm.totalAmount ? parseFloat(editForm.totalAmount) : undefined,
        dueDate:       editForm.dueDate || undefined,
        issueDate:     editForm.issueDate || undefined,
        currency:      editForm.currency,
        notes:         editForm.notes.trim() || undefined,
        driverName:    editForm.driverName.trim() || undefined,
      };
      const up = await api.put<Invoice>(`/invoices/${editing.id}`, body);
      setInvoices((p) => p.map((x) => x.id === editing.id ? up : x));
      setEditModal(false);
    } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
    finally { setEditSaving(false); }
  };

  const openPayment = (inv: Invoice) => { setPayTarget(inv); setPayStatus('PAID'); setPayModal(true); };
  const submitPayment = async () => {
    if (!payTarget) return;
    setPayLoading(true);
    try {
      const up = await api.patch<Invoice>(`/invoices/${payTarget.id}/payment`, { paymentStatus: payStatus });
      setInvoices((p) => p.map((x) => x.id === payTarget.id ? up : x));
      setPayModal(false);
    } catch (e: any) { Alert.alert('خطأ', e.message ?? 'فشلت العملية'); }
    finally { setPayLoading(false); }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (tab !== 'ALL' && i.invoiceType !== tab) return false;
      if (!q) return true;
      return (
        (i.invoiceNumber ?? '').toLowerCase().includes(q) ||
        (i.customer?.name ?? '').toLowerCase().includes(q) ||
        (i.driverName ?? '').toLowerCase().includes(q) ||
        (i.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [invoices, tab, search]);
  const totalValue = invoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
  const shipments  = invoices.filter((i) => i.invoiceType === 'SHIPMENT').length;
  const pending    = invoices.filter((i) => i.paymentStatus === 'PENDING').length;
  const confirmed  = invoices.filter((i) => i.confirmedAt).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={'الفواتير'} showBack />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              <View style={styles.kpiRow}>
                <StatCard label={'الإجمالي'} value={`$${fmt(totalValue)}`} icon="cash" color={colors.primary} style={styles.kpi} />
                <StatCard label={'شحنات'} value={String(shipments)} icon="car" color={colors.info} style={styles.kpi} />
              </View>
              <View style={[styles.kpiRow, { marginBottom: spacing.md }]}>
                <StatCard label={'معلق'} value={String(pending)} icon="time" color={colors.warning} style={styles.kpi} />
                <StatCard label={'مؤكد'} value={String(confirmed)} icon="checkmark-circle" color={colors.success} style={styles.kpi} />
              </View>

              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={'بحث برقم الفاتورة، العميل، السائق…'}
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={styles.tabRow}>
                  {TABS.map((t) => (
                    <TouchableOpacity key={t}
                      style={[styles.tabChip, tab === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setTab(t)}>
                      <Text style={[styles.tabText, { color: tab === t ? '#fff' : colors.textMuted }]}>
                        {isAr ? TAB_AR[t] : t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addText}>{'إضافة فاتورة'}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: inv }) => {
            const pc = paymentColor(inv.paymentStatus, colors);
            const tc = typeColor(inv.invoiceType, colors);
            return (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeIcon, { backgroundColor: `${tc}15` }]}>
                    <Ionicons name={inv.invoiceType === 'SHIPMENT' ? 'car' : inv.invoiceType === 'RECEIPT' ? 'archive' : 'document-text'} size={18} color={tc} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {inv.customer?.name ?? inv.invoiceNumber ?? `#${inv.id}`}
                    </Text>
                    <Text style={[styles.cardAmt, { color: colors.primary }]}>
                      {inv.currency ?? 'USD'} {fmt(Number(inv.totalAmount) || 0)}
                    </Text>
                    {inv.dueDate ? (
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {'الاستحقاق: '}{new Date(inv.dueDate).toLocaleDateString()}
                      </Text>
                    ) : null}
                    {inv.driverName ? (
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {'السائق: '}{inv.driverName}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.typeBadge, { backgroundColor: `${tc}15` }]}>
                      <Text style={[styles.badgeText, { color: tc }]}>{inv.invoiceType}</Text>
                    </View>
                    {inv.paymentStatus && (
                      <View style={[styles.badge, { backgroundColor: pc.bg }]}>
                        <Text style={[styles.badgeText, { color: pc.fg }]}>{inv.paymentStatus}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  {inv.invoiceType === 'RECEIPT' && !inv.confirmedAt && (
                    <TouchableOpacity style={[styles.footerBtn, { borderColor: colors.success }]} onPress={() => handleConfirm(inv)}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={[styles.footerBtnText, { color: colors.success }]}>{'تأكيد'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.footerBtn, { borderColor: colors.info }]} onPress={() => openPayment(inv)}>
                    <Ionicons name="cash" size={14} color={colors.info} />
                    <Text style={[styles.footerBtnText, { color: colors.info }]}>{'دفع'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.footerBtn, { borderColor: colors.primary }]} onPress={() => openEdit(inv)}>
                    <Ionicons name="pencil" size={14} color={colors.primary} />
                    <Text style={[styles.footerBtnText, { color: colors.primary }]}>{'تعديل'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.footerBtn, { borderColor: colors.danger }]} onPress={() => handleDelete(inv)}>
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    <Text style={[styles.footerBtnText, { color: colors.danger }]}>{'حذف'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'لا توجد فواتير'}</Text>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlayBg} onPress={() => setCreateModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{'فاتورة جديدة'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textMuted }]}>{'نوع الفاتورة *'}</Text>
              <View style={styles.chipGroup}>
                {(['REGULAR', 'SHIPMENT', 'RECEIPT'] as const).map((t) => (
                  <TouchableOpacity key={t}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                      createType === t && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                    onPress={() => setCreateType(t)}>
                    <Text style={[styles.chipText, { color: createType === t ? colors.primary : colors.textSecondary }]}>
                      {isAr ? (t === 'REGULAR' ? 'عادي' : t === 'SHIPMENT' ? 'شحن' : 'استلام') : t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>{'اسم العميل *'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder={'اسم العميل أو الشركة'}
                placeholderTextColor={colors.textMuted}
                value={createType === 'REGULAR' ? regForm.customerName : srCustomer}
                onChangeText={(v) => createType === 'REGULAR' ? setRegForm((p) => ({ ...p, customerName: v })) : setSrCustomer(v)} />

              <Text style={[styles.label, { color: colors.textMuted }]}>{'رقم الفاتورة'}</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                placeholder="INV-001" placeholderTextColor={colors.textMuted}
                value={createType === 'REGULAR' ? regForm.invoiceNumber : srInvNum}
                onChangeText={(v) => createType === 'REGULAR' ? setRegForm((p) => ({ ...p, invoiceNumber: v })) : setSrInvNum(v)} />

              {createType === 'REGULAR' && (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{'المبلغ الإجمالي *'}</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
                    value={regForm.totalAmount} onChangeText={(v) => setRegForm((p) => ({ ...p, totalAmount: v }))} />

                  <Text style={[styles.label, { color: colors.textMuted }]}>{'تاريخ الاستحقاق'}</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                    value={regForm.dueDate} onChangeText={(v) => setRegForm((p) => ({ ...p, dueDate: v }))} />
                </>
              )}

              {(createType === 'SHIPMENT' || createType === 'RECEIPT') && (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{'اسم السائق'}</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    placeholder={'اسم السائق'} placeholderTextColor={colors.textMuted}
                    value={srDriver} onChangeText={setSrDriver} />

                  <Text style={[styles.label, { color: colors.textMuted }]}>{'ملاحظات'}</Text>
                  <TextInput style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    placeholder={'ملاحظات اختيارية…'}
                    placeholderTextColor={colors.textMuted} multiline numberOfLines={3}
                    value={srNotes} onChangeText={setSrNotes} />
                </>
              )}

              <Text style={[styles.label, { color: colors.textMuted }]}>{'العملة'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.sm }}>
                  {CURRENCIES.map((c) => {
                    const cur = createType === 'REGULAR' ? regForm.currency : srCurrency;
                    return (
                      <TouchableOpacity key={c}
                        style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                          cur === c && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                        onPress={() => createType === 'REGULAR' ? setRegForm((p) => ({ ...p, currency: c })) : setSrCurrency(c)}>
                        <Text style={[styles.chipText, { color: cur === c ? colors.primary : colors.textSecondary }]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setCreateModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={submitCreate} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'إنشاء'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlayBg} onPress={() => setEditModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{'تعديل الفاتورة'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                { key: 'invoiceNumber', labelEn: 'Invoice Number', labelAr: 'رقم الفاتورة', ph: 'INV-001' },
                { key: 'customerName',  labelEn: 'Customer Name',  labelAr: 'اسم العميل',  ph: '' },
                { key: 'totalAmount',   labelEn: 'Total Amount',   labelAr: 'المبلغ الإجمالي', ph: '0.00', kb: 'decimal-pad' as const },
                { key: 'dueDate',       labelEn: 'Due Date',       labelAr: 'تاريخ الاستحقاق', ph: 'YYYY-MM-DD' },
                { key: 'issueDate',     labelEn: 'Issue Date',     labelAr: 'تاريخ الإصدار',   ph: 'YYYY-MM-DD' },
                { key: 'driverName',    labelEn: 'Driver Name',    labelAr: 'اسم السائق',  ph: '' },
                { key: 'notes',         labelEn: 'Notes',          labelAr: 'ملاحظات',     ph: '' },
              ].map(({ key, labelEn, labelAr, ph, kb }) => (
                <View key={key}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{isAr ? labelAr : labelEn}</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                    placeholder={ph} placeholderTextColor={colors.textMuted}
                    keyboardType={kb ?? 'default'}
                    value={(editForm as any)[key]}
                    onChangeText={(v) => setEditForm((p) => ({ ...p, [key]: v }))}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setEditModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, editSaving && { opacity: 0.6 }]} onPress={submitEdit} disabled={editSaving}>
                {editSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'حفظ'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlayBg} onPress={() => setPayModal(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{'تسجيل الدفع'}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{'حالة الدفع *'}</Text>
            <View style={styles.chipGroup}>
              {PAYMENT_STATUSES.map((s) => (
                <TouchableOpacity key={s}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    payStatus === s && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]}
                  onPress={() => setPayStatus(s)}>
                  <Text style={[styles.chipText, { color: payStatus === s ? colors.primary : colors.textSecondary }]}>
                    {isAr ? (s === 'PAID' ? 'مدفوع' : s === 'PENDING' ? 'معلق' : 'متأخر') : s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setPayModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{'إلغاء'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, payLoading && { opacity: 0.6 }]} onPress={submitPayment} disabled={payLoading}>
                {payLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{'حفظ'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: spacing.sm, paddingVertical: 9, marginBottom: spacing.sm },
  searchInput:{ flex: 1, fontSize: 14, paddingVertical: 0 },
  kpiRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpi:        { flex: 1 },
  tabRow:     { flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.md },
  tabChip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#E2E8F0' },
  tabText:    { fontSize: 12, fontWeight: '700' as const },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing.md, marginTop: spacing.sm },
  addText:    { ...typography.bodySmall, fontWeight: '700' as const, color: '#fff' },
  card:       { borderRadius: radius.lg, marginBottom: spacing.sm, ...shadow.sm, overflow: 'hidden' },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md },
  typeIcon:   { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:  { ...typography.h4, marginBottom: 2 },
  cardAmt:    { fontSize: 16, fontWeight: '800' as const, marginBottom: 2 },
  cardSub:    { ...typography.caption, marginTop: 2 },
  cardRight:  { alignItems: 'flex-end', gap: spacing.xs },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:  { fontSize: 10, fontWeight: '700' as const },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, borderTopWidth: 1, padding: spacing.sm },
  footerBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, borderWidth: 1 },
  footerBtnText: { fontSize: 11, fontWeight: '700' as const },
  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:  { ...typography.bodySmall },
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  overlayBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '92%' },
  handle:     { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  label:      { ...typography.caption, marginBottom: 6, marginTop: spacing.sm },
  input:      { borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15, marginBottom: 4 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  chipGroup:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText:   { fontSize: 12, fontWeight: '600' as const },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontWeight: '600' as const },
  saveBtn:    { flex: 2, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveText:   { fontWeight: '700' as const, color: '#fff' },
});
