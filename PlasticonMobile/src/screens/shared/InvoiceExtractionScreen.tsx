import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadForm } from '../../api/client';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface InvoiceItem {
  description: string;
  quantity:    number;
  unitPrice:   number;
  total:       number;
}

interface Party {
  name?:    string | null;
  address?: string | null;
  phone?:   string | null;
  email?:   string | null;
  taxId?:   string | null;
}

interface ExtractedInvoice {
  invoiceNumber?:  string | null;
  date?:           string | null;
  dueDate?:        string | null;
  currency?:       string | null;
  vendor?:         Party | null;
  customer?:       Party | null;
  items?:          InvoiceItem[];
  subtotal?:       number | null;
  tax?:            number | null;
  taxRate?:        number | null;
  totalAmount?:    number | null;
  notes?:          string | null;
  paymentTerms?:   string | null;
  _totalMismatch?: boolean;
}

interface ApiResponse {
  success:    boolean;
  data:       ExtractedInvoice;
  confidence: Record<string, string>;
}

function ConfDot({ level }: { level?: string }) {
  const colors: Record<string, string> = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' };
  const c = colors[level ?? 'low'] ?? '#94a3b8';
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginLeft: 6 }} />;
}

function Field({ label, value, conf }: { label: string; value?: string | number | null; conf?: string }) {
  const { colors } = useAppTheme();
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.fieldValueRow}>
        <Text style={[styles.fieldValue, { color: colors.text }]}>{String(value)}</Text>
        {conf && <ConfDot level={conf} />}
      </View>
    </View>
  );
}

function PartyCard({ title, party, icon }: { title: string; party?: Party | null; icon: string }) {
  const { colors } = useAppTheme();
  if (!party?.name) return null;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {party.name    && <Field label="Name"    value={party.name}    />}
      {party.address && <Field label="Address" value={party.address} />}
      {party.phone   && <Field label="Phone"   value={party.phone}   />}
      {party.email   && <Field label="Email"   value={party.email}   />}
      {party.taxId   && <Field label="Tax ID"  value={party.taxId}   />}
    </View>
  );
}

export function InvoiceExtractionScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const [imageUri,    setImageUri]    = useState<string | null>(null);
  const [imageMime,   setImageMime]   = useState<string>('image/jpeg');
  const [imageName,   setImageName]   = useState<string>('invoice.jpg');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<ApiResponse | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  const requestAndPick = async (fromCamera: boolean) => {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(isAr ? 'إذن مطلوب' : 'Permission required', isAr ? 'يجب السماح بالوصول إلى الكاميرا.' : 'Camera access is required.');
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(isAr ? 'إذن مطلوب' : 'Permission required', isAr ? 'يجب السماح بالوصول إلى مكتبة الصور.' : 'Media library access is required.');
        return;
      }
    }

    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });

    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setImageUri(asset.uri);
    setImageMime(asset.mimeType ?? 'image/jpeg');
    setImageName(asset.fileName ?? (fromCamera ? 'invoice_capture.jpg' : 'invoice.jpg'));
    setResult(null);
    setErrorMsg(null);
  };

  const extract = async () => {
    if (!imageUri) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const form = new FormData();
      form.append('file', { uri: imageUri, name: imageName, type: imageMime } as any);
      const res = await uploadForm<ApiResponse>('/ai/invoice-extract', form);
      setResult(res);
    } catch (e: any) {
      setErrorMsg(e.message ?? (isAr ? 'فشل استخراج البيانات.' : 'Extraction failed.'));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setImageUri(null); setResult(null); setErrorMsg(null); };

  const d = result?.data;
  const conf = result?.confidence ?? {};
  const fmt = (n?: number | null, cur?: string | null) =>
    n != null ? `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur ?? ''}`.trim() : '—';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={[styles.banner, { backgroundColor: colors.surface, borderLeftColor: colors.success }]}>
          <View style={[styles.bannerIcon, { backgroundColor: `${colors.success}15` }]}>
            <Ionicons name="document-text" size={26} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>{isAr ? 'استخراج الفواتير بالذكاء الاصطناعي' : 'AI Invoice Extraction'}</Text>
            <Text style={[styles.bannerSub, { color: colors.textMuted }]}>{isAr ? 'التقط صورة أو اختر صورة لاستخراج البيانات' : 'Capture or pick an invoice image to extract data'}</Text>
          </View>
        </View>

        {/* Pick buttons */}
        {!imageUri && (
          <View style={styles.pickRow}>
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: colors.primary }]} onPress={() => requestAndPick(true)} activeOpacity={0.8}>
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.pickBtnText}>{isAr ? 'التقاط صورة' : 'Take Photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]} onPress={() => requestAndPick(false)} activeOpacity={0.8}>
              <Ionicons name="images" size={22} color={colors.primary} />
              <Text style={[styles.pickBtnText, { color: colors.primary }]}>{isAr ? 'من المعرض' : 'From Gallery'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Preview */}
        {imageUri && (
          <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <View style={styles.previewActions}>
              <TouchableOpacity style={[styles.previewBtn, { borderColor: colors.border }]} onPress={reset}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.previewBtnText, { color: colors.danger }]}>{isAr ? 'إزالة' : 'Remove'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: colors.success }, loading && { opacity: 0.6 }]}
                onPress={extract}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="flash" size={16} color="#fff" />}
                <Text style={[styles.previewBtnText, { color: '#fff' }]}>{loading ? (isAr ? 'جارٍ الاستخراج…' : 'Extracting…') : (isAr ? 'استخراج' : 'Extract')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error */}
        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
          </View>
        )}

        {/* Results */}
        {d && (
          <>
            {/* Invoice header card */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="receipt" size={16} color={colors.success} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'بيانات الفاتورة' : 'Invoice Details'}</Text>
                {result?.data._totalMismatch && (
                  <View style={[styles.mismatchBadge, { backgroundColor: `${colors.warning}20` }]}>
                    <Text style={[styles.mismatchText, { color: colors.warning }]}>{isAr ? 'تحقق من الإجمالي' : 'Total mismatch'}</Text>
                  </View>
                )}
              </View>
              <Field label={isAr ? 'رقم الفاتورة' : 'Invoice #'}    value={d.invoiceNumber}  conf={conf.invoiceNumber}  />
              <Field label={isAr ? 'التاريخ' : 'Date'}               value={d.date}            conf={conf.date}           />
              <Field label={isAr ? 'تاريخ الاستحقاق' : 'Due Date'}   value={d.dueDate}         conf={conf.dueDate}        />
              <Field label={isAr ? 'العملة' : 'Currency'}             value={d.currency}        conf={conf.currency}       />
              <Field label={isAr ? 'شروط الدفع' : 'Payment Terms'}    value={d.paymentTerms}                               />
              <Field label={isAr ? 'ملاحظات' : 'Notes'}               value={d.notes}                                      />
            </View>

            <PartyCard title={isAr ? 'المورد' : 'Vendor'}   party={d.vendor}   icon="business"  />
            <PartyCard title={isAr ? 'العميل' : 'Customer'} party={d.customer} icon="person"    />

            {/* Items */}
            {(d.items?.length ?? 0) > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="list" size={16} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'بنود الفاتورة' : 'Line Items'}</Text>
                </View>
                <View style={[styles.itemHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.itemCol, styles.itemDesc, { color: colors.textMuted }]}>{isAr ? 'الوصف' : 'Description'}</Text>
                  <Text style={[styles.itemColR, { color: colors.textMuted }]}>{isAr ? 'الكمية' : 'Qty'}</Text>
                  <Text style={[styles.itemColR, { color: colors.textMuted }]}>{isAr ? 'السعر' : 'Price'}</Text>
                  <Text style={[styles.itemColR, { color: colors.textMuted }]}>{isAr ? 'الإجمالي' : 'Total'}</Text>
                </View>
                {d.items!.map((item, i) => (
                  <View key={i} style={[styles.itemRow, i % 2 === 1 && { backgroundColor: `${colors.primary}07` }]}>
                    <Text style={[styles.itemCol, styles.itemDesc, { color: colors.text }]} numberOfLines={2}>{item.description}</Text>
                    <Text style={[styles.itemColR, { color: colors.text }]}>{item.quantity}</Text>
                    <Text style={[styles.itemColR, { color: colors.text }]}>{item.unitPrice.toLocaleString()}</Text>
                    <Text style={[styles.itemColR, { color: colors.text, fontWeight: '600' }]}>{item.total.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Totals */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="calculator" size={16} color={colors.roleAccountant} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'الإجماليات' : 'Totals'}</Text>
              </View>
              <Field label={isAr ? 'المجموع الفرعي' : 'Subtotal'}    value={fmt(d.subtotal,    d.currency)} conf={conf.subtotal}    />
              <Field label={isAr ? 'الضريبة' : 'Tax'}                 value={fmt(d.tax,         d.currency)} conf={conf.tax}         />
              {d.taxRate != null && (
                <Field label={isAr ? 'نسبة الضريبة' : 'Tax Rate'} value={`${d.taxRate}%`} />
              )}
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>{isAr ? 'الإجمالي' : 'Total Amount'}</Text>
                <View style={styles.fieldValueRow}>
                  <Text style={[styles.totalAmount, { color: colors.success }]}>{fmt(d.totalAmount, d.currency)}</Text>
                  <ConfDot level={conf.totalAmount} />
                </View>
              </View>
            </View>

            {/* Confidence legend */}
            <View style={[styles.legend, { backgroundColor: colors.surface }]}>
              <Text style={[styles.legendTitle, { color: colors.textMuted }]}>{isAr ? 'مفتاح الثقة:' : 'Confidence:'}</Text>
              {[['#22c55e', isAr ? 'عالية' : 'High'], ['#f59e0b', isAr ? 'متوسطة' : 'Medium'], ['#ef4444', isAr ? 'منخفضة' : 'Low']].map(([c, l]) => (
                <View key={c} style={styles.legendItem}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>{l}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]} onPress={reset} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              <Text style={[styles.resetBtnText, { color: colors.primary }]}>{isAr ? 'استخراج فاتورة أخرى' : 'Extract Another Invoice'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  banner:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderLeftWidth: 4, ...shadow.sm },
  bannerIcon:  { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { ...typography.h3 },
  bannerSub:   { ...typography.caption, marginTop: 2 },

  pickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 14 },
  pickBtnText: { ...typography.h4, color: '#fff' },

  previewCard:    { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg, ...shadow.sm },
  preview:        { width: '100%', height: 220, backgroundColor: '#000' },
  previewActions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  previewBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 10, borderWidth: 1, borderColor: 'transparent' },
  previewBtnText: { ...typography.bodySmall, fontWeight: '700' },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, marginBottom: spacing.md },
  errorText: { ...typography.bodySmall, flex: 1 },

  card:       { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  cardTitle:  { ...typography.h4 },
  mismatchBadge: { marginLeft: 'auto', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  mismatchText:  { fontSize: 11, fontWeight: '700' },

  fieldRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  fieldLabel:    { ...typography.caption, flex: 0.45 },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', flex: 0.55, justifyContent: 'flex-end' },
  fieldValue:    { ...typography.bodySmall, textAlign: 'right', flexShrink: 1 },

  itemHeader: { flexDirection: 'row', paddingBottom: 6, marginBottom: 4, borderBottomWidth: 1 },
  itemRow:    { flexDirection: 'row', paddingVertical: 6, borderRadius: 6, paddingHorizontal: 4 },
  itemCol:    { flex: 1, fontSize: 13 },
  itemColR:   { width: 56, fontSize: 13, textAlign: 'right' },
  itemDesc:   { flex: 2 },

  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1 },
  totalLabel:  { ...typography.h4 },
  totalAmount: { ...typography.h3, fontWeight: '700' },

  legend:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  legendTitle: { ...typography.caption },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText:  { fontSize: 11 },

  resetBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, borderWidth: 1.5 },
  resetBtnText: { ...typography.h4 },
});
