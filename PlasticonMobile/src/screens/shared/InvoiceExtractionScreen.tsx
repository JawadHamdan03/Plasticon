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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { uploadForm } from '../../api/client';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

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

function isLikelyInvoice(data: ExtractedInvoice, conf: Record<string, string>): boolean {
  const hasTotal   = data.totalAmount != null;
  const hasNumber  = !!data.invoiceNumber;
  const hasVendor  = !!data.vendor?.name;
  const hasItems   = (data.items?.length ?? 0) > 0;
  const highFields = Object.values(conf).filter(v => v === 'high').length;
  return hasTotal || hasNumber || hasVendor || hasItems || highFields >= 2;
}

function buildPdfHtml(d: ExtractedInvoice, imageUri: string): string {
  const cur = d.currency ?? '';
  const fmt = (n?: number | null) =>
    n != null ? n.toLocaleString('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

  const partyBlock = (title: string, p?: Party | null) => {
    if (!p?.name) return '';
    return `
      <div class="party-block">
        <div class="party-title">${title}</div>
        ${p.name    ? `<div><strong>الاسم:</strong> ${p.name}</div>`       : ''}
        ${p.address ? `<div><strong>العنوان:</strong> ${p.address}</div>`  : ''}
        ${p.phone   ? `<div><strong>الهاتف:</strong> ${p.phone}</div>`    : ''}
        ${p.email   ? `<div><strong>البريد:</strong> ${p.email}</div>`    : ''}
        ${p.taxId   ? `<div><strong>الرقم الضريبي:</strong> ${p.taxId}</div>` : ''}
      </div>`;
  };

  const itemRows = (d.items ?? []).map((item, i) => `
    <tr class="${i % 2 === 0 ? 'even' : ''}">
      <td>${item.description}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${item.unitPrice.toLocaleString('ar')}</td>
      <td class="num bold">${item.total.toLocaleString('ar')} ${cur}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    direction: rtl;
    color: #1e293b;
    background: #fff;
    padding: 40px;
    font-size: 13px;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #0ea5e9;
    padding-bottom: 20px;
    margin-bottom: 24px;
  }
  .brand { font-size: 26px; font-weight: 900; color: #0ea5e9; letter-spacing: 2px; }
  .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .invoice-label { text-align: left; }
  .invoice-label h1 { font-size: 22px; font-weight: 800; color: #1e293b; }
  .invoice-label .inv-num { font-size: 14px; color: #0ea5e9; font-weight: 700; margin-top: 4px; }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    background: #f8fafc;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 20px;
    font-size: 12px;
  }
  .meta-item { display: flex; gap: 6px; }
  .meta-label { color: #64748b; min-width: 90px; }
  .meta-value { color: #1e293b; font-weight: 600; }
  .parties { display: flex; gap: 16px; margin-bottom: 20px; }
  .party-block {
    flex: 1;
    background: #f0f9ff;
    border-radius: 10px;
    padding: 14px;
    font-size: 12px;
    line-height: 1.8;
    border-right: 3px solid #0ea5e9;
  }
  .party-title { font-size: 11px; font-weight: 800; color: #0ea5e9; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead th {
    background: #0ea5e9;
    color: #fff;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
    text-align: right;
  }
  td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
  tr.even td { background: #f8fafc; }
  .num { text-align: left; direction: ltr; }
  .bold { font-weight: 700; }
  .totals { margin-top: 8px; margin-inline-start: auto; width: 260px; }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
    border-bottom: 1px solid #e2e8f0;
  }
  .totals-row.total-final {
    font-size: 16px;
    font-weight: 900;
    color: #0ea5e9;
    border-bottom: none;
    border-top: 2px solid #0ea5e9;
    padding-top: 10px;
    margin-top: 4px;
  }
  .notes-box {
    background: #fffbeb;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 12px;
    color: #78350f;
    margin-top: 16px;
    border-right: 3px solid #f59e0b;
  }
  .notes-box strong { display: block; margin-bottom: 4px; font-size: 11px; color: #92400e; }
  .scan-stamp {
    margin-top: 32px;
    border-top: 1px dashed #cbd5e1;
    padding-top: 12px;
    font-size: 10px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }
  .scan-image { max-height: 160px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .scan-image-wrap { text-align: center; margin-bottom: 20px; }
  .scan-image-label { font-size: 10px; color: #94a3b8; margin-top: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">PLASTICON</div>
      <div class="brand-sub">إدارة المصنع — نظام الفواتير</div>
    </div>
    <div class="invoice-label">
      <h1>فاتورة</h1>
      ${d.invoiceNumber ? `<div class="inv-num"># ${d.invoiceNumber}</div>` : ''}
    </div>
  </div>

  <div class="meta-grid">
    ${d.date          ? `<div class="meta-item"><span class="meta-label">التاريخ:</span><span class="meta-value">${d.date}</span></div>` : ''}
    ${d.dueDate       ? `<div class="meta-item"><span class="meta-label">تاريخ الاستحقاق:</span><span class="meta-value">${d.dueDate}</span></div>` : ''}
    ${d.currency      ? `<div class="meta-item"><span class="meta-label">العملة:</span><span class="meta-value">${d.currency}</span></div>` : ''}
    ${d.paymentTerms  ? `<div class="meta-item"><span class="meta-label">شروط الدفع:</span><span class="meta-value">${d.paymentTerms}</span></div>` : ''}
  </div>

  ${(d.vendor?.name || d.customer?.name) ? `
  <div class="parties">
    ${partyBlock('المورد', d.vendor)}
    ${partyBlock('العميل', d.customer)}
  </div>` : ''}

  ${(d.items?.length ?? 0) > 0 ? `
  <table>
    <thead>
      <tr>
        <th>الوصف</th>
        <th class="num">الكمية</th>
        <th class="num">سعر الوحدة</th>
        <th class="num">الإجمالي</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>` : ''}

  <div class="totals">
    ${d.subtotal   != null ? `<div class="totals-row"><span>المجموع الفرعي</span><span>${fmt(d.subtotal)} ${cur}</span></div>` : ''}
    ${d.tax        != null ? `<div class="totals-row"><span>الضريبة${d.taxRate ? ` (${d.taxRate}%)` : ''}</span><span>${fmt(d.tax)} ${cur}</span></div>` : ''}
    ${d.totalAmount != null ? `<div class="totals-row total-final"><span>الإجمالي</span><span>${fmt(d.totalAmount)} ${cur}</span></div>` : ''}
  </div>

  ${d.notes ? `<div class="notes-box"><strong>ملاحظات</strong>${d.notes}</div>` : ''}

  <div class="scan-image-wrap" style="margin-top:24px;">
    <img src="${imageUri}" class="scan-image" />
    <div class="scan-image-label">المستند الأصلي الممسوح</div>
  </div>

  <div class="scan-stamp">
    <span>تم الإنشاء بواسطة Plasticon — ماسح الفواتير الذكي</span>
    <span>${new Date().toLocaleDateString('ar')}</span>
  </div>
</body>
</html>`;
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
      {party.name    && <Field label="الاسم"         value={party.name}    />}
      {party.address && <Field label="العنوان"       value={party.address} />}
      {party.phone   && <Field label="الهاتف"        value={party.phone}   />}
      {party.email   && <Field label="البريد"        value={party.email}   />}
      {party.taxId   && <Field label="الرقم الضريبي" value={party.taxId}   />}
    </View>
  );
}

type Phase = 'pick' | 'preview' | 'scanning' | 'not-invoice' | 'result';

export function InvoiceExtractionScreen() {
  const { colors } = useAppTheme();

  const [phase,      setPhase]      = useState<Phase>('pick');
  const [imageUri,   setImageUri]   = useState<string | null>(null);
  const [imageMime,  setImageMime]  = useState<string>('image/jpeg');
  const [imageName,  setImageName]  = useState<string>('scan.jpg');
  const [result,     setResult]     = useState<ApiResponse | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [exporting,  setExporting]  = useState(false);

  const requestAndPick = async (fromCamera: boolean) => {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('إذن مطلوب', 'يجب السماح بالوصول إلى الكاميرا.'); return; }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('إذن مطلوب', 'يجب السماح بالوصول إلى مكتبة الصور.'); return; }
    }

    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
          allowsEditing: true,
          aspect: [3, 4],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
          allowsEditing: true,
          aspect: [3, 4],
        });

    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setImageUri(asset.uri);
    setImageMime(asset.mimeType ?? 'image/jpeg');
    setImageName(asset.fileName ?? (fromCamera ? 'scan_capture.jpg' : 'scan.jpg'));
    setResult(null);
    setErrorMsg(null);
    setPhase('preview');
  };

  const scan = async () => {
    if (!imageUri) return;
    setPhase('scanning');
    setErrorMsg(null);
    try {
      const form = new FormData();
      form.append('file', { uri: imageUri, name: imageName, type: imageMime } as any);
      const res = await uploadForm<ApiResponse>('/ai/invoice-extract', form);
      if (isLikelyInvoice(res.data, res.confidence ?? {})) {
        setResult(res);
        setPhase('result');
      } else {
        setPhase('not-invoice');
      }
    } catch (e: any) {
      setErrorMsg(e.message ?? 'فشل تحليل المستند.');
      setPhase('preview');
    }
  };

  const exportPdf = async () => {
    if (!result?.data || !imageUri) return;
    setExporting(true);
    try {
      const html = buildPdfHtml(result.data, imageUri);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('تم الحفظ', `تم حفظ الفاتورة في:\n${uri}`);
      }
    } catch (e: any) {
      Alert.alert('خطأ', e.message ?? 'فشل تصدير الفاتورة.');
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    setImageUri(null);
    setResult(null);
    setErrorMsg(null);
    setPhase('pick');
  };

  const d    = result?.data;
  const conf = result?.confidence ?? {};
  const fmt  = (n?: number | null, cur?: string | null) =>
    n != null ? `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur ?? ''}`.trim() : '—';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header banner ── */}
        <View style={[styles.banner, { backgroundColor: colors.surface, borderLeftColor: colors.success }]}>
          <View style={[styles.bannerIcon, { backgroundColor: `${colors.success}15` }]}>
            <Ionicons name="scan" size={26} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>{'ماسح الفواتير الذكي'}</Text>
            <Text style={[styles.bannerSub, { color: colors.textMuted }]}>{'امسح المستند — سيتم التعرف على الفاتورة وتصديرها PDF'}</Text>
          </View>
        </View>

        {/* ── PHASE: pick ── */}
        {phase === 'pick' && (
          <View style={styles.pickRow}>
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: colors.primary }]} onPress={() => requestAndPick(true)} activeOpacity={0.8}>
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.pickBtnText}>{'مسح بالكاميرا'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]} onPress={() => requestAndPick(false)} activeOpacity={0.8}>
              <Ionicons name="images" size={22} color={colors.primary} />
              <Text style={[styles.pickBtnText, { color: colors.primary }]}>{'من المعرض'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PHASE: preview ── */}
        {(phase === 'preview') && imageUri && (
          <>
            <View style={[styles.scanFrame, { borderColor: colors.primary }]}>
              {/* Scanner corner brackets */}
              <View style={[styles.corner, styles.cornerTL, { borderColor: colors.success }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: colors.success }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: colors.success }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: colors.success }]} />
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            </View>
            {errorMsg && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
              </View>
            )}
            <View style={styles.previewActions}>
              <TouchableOpacity style={[styles.previewBtn, { borderColor: colors.border, borderWidth: 1 }]} onPress={reset} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.previewBtnText, { color: colors.danger }]}>{'إزالة'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.previewBtn, { backgroundColor: colors.success }]} onPress={scan} activeOpacity={0.8}>
                <Ionicons name="flash" size={16} color="#fff" />
                <Text style={[styles.previewBtnText, { color: '#fff' }]}>{'تحليل المستند'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── PHASE: scanning ── */}
        {phase === 'scanning' && (
          <View style={[styles.scanningBox, { backgroundColor: colors.surface }]}>
            {imageUri && (
              <View style={[styles.scanFrame, { borderColor: colors.primary, marginBottom: 20 }]}>
                <View style={[styles.scanLine, { backgroundColor: `${colors.success}80` }]} />
                <View style={[styles.corner, styles.cornerTL, { borderColor: colors.success }]} />
                <View style={[styles.corner, styles.cornerTR, { borderColor: colors.success }]} />
                <View style={[styles.corner, styles.cornerBL, { borderColor: colors.success }]} />
                <View style={[styles.corner, styles.cornerBR, { borderColor: colors.success }]} />
                <Image source={{ uri: imageUri }} style={[styles.preview, { opacity: 0.7 }]} resizeMode="contain" />
              </View>
            )}
            <ActivityIndicator size="large" color={colors.success} />
            <Text style={[styles.scanningText, { color: colors.text }]}>{'جارٍ تحليل المستند…'}</Text>
            <Text style={[styles.scanningSubText, { color: colors.textMuted }]}>{'الذكاء الاصطناعي يستخرج بيانات الفاتورة'}</Text>
          </View>
        )}

        {/* ── PHASE: not-invoice ── */}
        {phase === 'not-invoice' && (
          <View style={[styles.notInvoiceBox, { backgroundColor: colors.surface }]}>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.notInvoiceThumb} resizeMode="cover" />}
            <View style={[styles.notInvoiceIcon, { backgroundColor: `${colors.warning}20` }]}>
              <Ionicons name="document-outline" size={40} color={colors.warning} />
            </View>
            <Text style={[styles.notInvoiceTitle, { color: colors.text }]}>{'لا يبدو أنها فاتورة'}</Text>
            <Text style={[styles.notInvoiceSub, { color: colors.textMuted }]}>
              {'المستند الممسوح لا يحتوي على بيانات فاتورة واضحة. جرّب مسح مستند آخر أو صورة أوضح.'}
            </Text>
            <View style={styles.notInvoiceActions}>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => requestAndPick(true)} activeOpacity={0.8}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={[styles.retryBtnText, { color: '#fff' }]}>{'مسح مجدداً'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.retryBtn, { borderColor: colors.border, borderWidth: 1.5 }]} onPress={reset} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                <Text style={[styles.retryBtnText, { color: colors.primary }]}>{'بداية جديدة'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── PHASE: result ── */}
        {phase === 'result' && d && (
          <>
            {/* PDF Export bar */}
            <TouchableOpacity
              style={[styles.pdfBar, { backgroundColor: colors.success }, exporting && { opacity: 0.7 }]}
              onPress={exportPdf}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="document-text" size={20} color="#fff" />}
              <Text style={styles.pdfBarText}>{exporting ? 'جارٍ إنشاء PDF…' : 'تصدير كـ PDF'}</Text>
              {!exporting && <Ionicons name="share-outline" size={18} color="#fff" />}
            </TouchableOpacity>

            {/* Scanned image thumbnail */}
            {imageUri && (
              <View style={[styles.thumbRow, { backgroundColor: colors.surface }]}>
                <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.thumbTitle, { color: colors.text }]}>{'المستند الممسوح'}</Text>
                  <View style={[styles.invoiceBadge, { backgroundColor: `${colors.success}20` }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={[styles.invoiceBadgeText, { color: colors.success }]}>{'تم التعرف على الفاتورة'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Invoice header */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="receipt" size={16} color={colors.success} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{'بيانات الفاتورة'}</Text>
                {d._totalMismatch && (
                  <View style={[styles.mismatchBadge, { backgroundColor: `${colors.warning}20` }]}>
                    <Text style={[styles.mismatchText, { color: colors.warning }]}>{'تحقق من الإجمالي'}</Text>
                  </View>
                )}
              </View>
              <Field label={'رقم الفاتورة'}      value={d.invoiceNumber}  conf={conf.invoiceNumber}  />
              <Field label={'التاريخ'}            value={d.date}           conf={conf.date}           />
              <Field label={'تاريخ الاستحقاق'}   value={d.dueDate}        conf={conf.dueDate}        />
              <Field label={'العملة'}             value={d.currency}       conf={conf.currency}       />
              <Field label={'شروط الدفع'}        value={d.paymentTerms}                              />
              <Field label={'ملاحظات'}            value={d.notes}                                     />
            </View>

            <PartyCard title={'المورد'}  party={d.vendor}   icon="business" />
            <PartyCard title={'العميل'} party={d.customer} icon="person"   />

            {/* Items */}
            {(d.items?.length ?? 0) > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="list" size={16} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{'بنود الفاتورة'}</Text>
                </View>
                <View style={[styles.itemHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.itemCol, styles.itemDesc, { color: colors.textMuted }]}>{'الوصف'}</Text>
                  <Text style={[styles.itemColR, { color: colors.textMuted }]}>{'الكمية'}</Text>
                  <Text style={[styles.itemColR, { color: colors.textMuted }]}>{'السعر'}</Text>
                  <Text style={[styles.itemColR, { color: colors.textMuted }]}>{'الإجمالي'}</Text>
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
                <Text style={[styles.cardTitle, { color: colors.text }]}>{'الإجماليات'}</Text>
              </View>
              <Field label={'المجموع الفرعي'}  value={fmt(d.subtotal,    d.currency)} conf={conf.subtotal}    />
              <Field label={'الضريبة'}          value={fmt(d.tax,         d.currency)} conf={conf.tax}         />
              {d.taxRate != null && <Field label={'نسبة الضريبة'} value={`${d.taxRate}%`} />}
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>{'الإجمالي'}</Text>
                <View style={styles.fieldValueRow}>
                  <Text style={[styles.totalAmount, { color: colors.success }]}>{fmt(d.totalAmount, d.currency)}</Text>
                  <ConfDot level={conf.totalAmount} />
                </View>
              </View>
            </View>

            {/* Confidence legend */}
            <View style={[styles.legend, { backgroundColor: colors.surface }]}>
              <Text style={[styles.legendTitle, { color: colors.textMuted }]}>{'مفتاح الثقة:'}</Text>
              {[['#22c55e', 'عالية'], ['#f59e0b', 'متوسطة'], ['#ef4444', 'منخفضة']].map(([c, l]) => (
                <View key={c} style={styles.legendItem}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Export again + Reset */}
            <TouchableOpacity
              style={[styles.pdfBar, { backgroundColor: colors.success }, exporting && { opacity: 0.7 }]}
              onPress={exportPdf}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="document-text" size={20} color="#fff" />}
              <Text style={styles.pdfBarText}>{exporting ? 'جارٍ إنشاء PDF…' : 'تصدير كـ PDF'}</Text>
              {!exporting && <Ionicons name="share-outline" size={18} color="#fff" />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]} onPress={reset} activeOpacity={0.8}>
              <Ionicons name="scan-outline" size={18} color={colors.primary} />
              <Text style={[styles.resetBtnText, { color: colors.primary }]}>{'مسح فاتورة أخرى'}</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const CORNER = 18;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  banner:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderLeftWidth: 4, ...shadow.sm },
  bannerIcon:  { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { ...typography.h3 },
  bannerSub:   { ...typography.caption, marginTop: 2 },

  pickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 16 },
  pickBtnText: { ...typography.h4, color: '#fff' },

  // Scanner frame
  scanFrame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  preview: { width: '100%', height: 260 },
  scanLine: {
    position: 'absolute',
    left: 0, right: 0,
    top: '45%',
    height: 2,
    zIndex: 10,
  },
  // Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    zIndex: 20,
    borderColor: '#22c55e',
  },
  cornerTL: { top: 8,  left:  8,  borderTopWidth: CORNER_THICKNESS, borderLeftWidth:  CORNER_THICKNESS },
  cornerTR: { top: 8,  right: 8,  borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 8, left:  8,  borderBottomWidth: CORNER_THICKNESS, borderLeftWidth:  CORNER_THICKNESS },
  cornerBR: { bottom: 8, right: 8,  borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },

  previewActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  previewBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 12 },
  previewBtnText: { ...typography.bodySmall, fontWeight: '700' },

  // Scanning overlay
  scanningBox: { borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, ...shadow.sm, marginBottom: spacing.md },
  scanningText:    { ...typography.h3, marginTop: spacing.sm },
  scanningSubText: { ...typography.caption, textAlign: 'center' },

  // Not an invoice
  notInvoiceBox:     { borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.md, ...shadow.sm, marginBottom: spacing.md },
  notInvoiceThumb:   { width: '100%', height: 140, borderRadius: radius.lg, marginBottom: 4 },
  notInvoiceIcon:    { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  notInvoiceTitle:   { ...typography.h2, textAlign: 'center' },
  notInvoiceSub:     { ...typography.body, textAlign: 'center' },
  notInvoiceActions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  retryBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.lg, paddingVertical: 12 },
  retryBtnText:      { ...typography.bodySmall, fontWeight: '700' },

  // PDF export bar
  pdfBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.lg, paddingVertical: 14, marginBottom: spacing.md, ...shadow.md },
  pdfBarText: { ...typography.h3, color: '#fff', flex: 1 },

  // Thumbnail row
  thumbRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.md, ...shadow.sm },
  thumb:      { width: 60, height: 80, borderRadius: radius.md },
  thumbTitle: { ...typography.h4 },
  invoiceBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  invoiceBadgeText: { fontSize: 11, fontWeight: '700' },

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

  resetBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 12, borderWidth: 1.5, marginTop: 4 },
  resetBtnText: { ...typography.h4 },
});
