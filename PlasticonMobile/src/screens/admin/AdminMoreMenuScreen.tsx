import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

export function AdminMoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();

  const SECTIONS = [
    {
      title: 'إدارة المستخدمين',
      items: [
        {
          icon: 'people',
          label: 'المستخدمون',
          desc:  'إدارة جميع حسابات المستخدمين والأدوار',
          screen: 'Users',
          color: colors.primary,
        },
        {
          icon: 'person-add',
          label: 'طلبات التسجيل',
          desc:  'طلبات الوصول المعلقة والموافقات',
          screen: 'Registrations',
          color: colors.warning,
        },
        {
          icon: 'briefcase',
          label: 'نظرة عامة على المهندسين',
          desc:  'مراجعة أداء الفريق الهندسي',
          screen: 'EngineerOverview',
          color: colors.roleEngineer,
        },
        {
          icon: 'people',
          label: 'العملاء',
          desc:  'حسابات العملاء المستمدة من سجلات المبيعات',
          screen: 'Customers',
          color: colors.info,
        },
      ],
    },
    {
      title: 'مندوبو المبيعات',
      items: [
        {
          icon: 'trending-up',
          label: 'لوحة المندوب',
          desc:  'نظرة عامة على أداء المندوبين',
          screen: 'SalesRepDash',
          color: '#ec4899',
        },
        {
          icon: 'people',
          label: 'عملاء المندوبين',
          desc:  'جميع عملاء المندوبين',
          screen: 'SalesRepCustomers',
          color: '#8b5cf6',
        },
        {
          icon: 'document-text',
          label: 'عروض الأسعار',
          desc:  'جميع عروض الأسعار',
          screen: 'SalesRepQuotations',
          color: '#3b82f6',
        },
        {
          icon: 'location',
          label: 'سجل الزيارات',
          desc:  'جميع زيارات العملاء',
          screen: 'SalesRepVisits',
          color: '#10b981',
        },
        {
          icon: 'flag',
          label: 'الأهداف',
          desc:  'أهداف المبيعات والإنجازات',
          screen: 'SalesRepTargets',
          color: '#f59e0b',
        },
        {
          icon: 'checkmark-circle',
          label: 'مراجعة الطلبات',
          desc:  'مراجعة وموافقة طلبات المندوبين',
          screen: 'SalesReview',
          color: '#ef4444',
        },
      ],
    },
    {
      title: 'أدوات الذكاء الاصطناعي',
      items: [
        {
          icon: 'hardware-chip',
          label: 'المساعد الذكي',
          desc:  'مساعد ذكي متعدد الأغراض للمصنع',
          screen: 'AIHub',
          color: colors.primary,
        },
        {
          icon: 'document-text',
          label: 'استخراج الفواتير',
          desc:  'استخراج البيانات من الفواتير بالذكاء الاصطناعي',
          screen: 'InvoiceExtraction',
          color: colors.success,
        },
        {
          icon: 'warning',
          label: 'كشف الانحرافات',
          desc:  'الكشف عن الانحرافات في الإنتاج والمعدات',
          screen: 'AnomalyDetection',
          color: colors.danger,
        },
        {
          icon: 'construct',
          label: 'تقرير الصيانة',
          desc:  'ملخصات الصيانة المولدة بالذكاء الاصطناعي',
          screen: 'MaintenanceReport',
          color: colors.warning,
        },
        {
          icon: 'swap-horizontal',
          label: 'تسليم الوردية',
          desc:  'ملاحظات تسليم الوردية بمساعدة الذكاء الاصطناعي',
          screen: 'ShiftHandover',
          color: colors.info,
        },
        {
          icon: 'school',
          label: 'تدريب العمال',
          desc:  'التدريب والتوجيه الذكي للعمال',
          screen: 'WorkerCoaching',
          color: colors.accent,
        },
      ],
    },
    {
      title: 'النظام',
      items: [
        {
          icon: 'shield',
          label: 'سجلات التدقيق',
          desc:  'جميع إجراءات النظام وسجل التدقيق',
          screen: 'AuditLogs',
          color: colors.info,
        },
        {
          icon: 'settings',
          label: 'الإعدادات',
          desc:  'إعدادات النظام والتفضيلات',
          screen: 'Settings',
          color: colors.textMuted,
        },
        {
          icon: 'chatbubbles',
          label: 'الدردشة',
          desc:  'المراسلة والنقاش على مستوى الشركة',
          screen: 'Chat',
          color: colors.primary,
        },
        {
          icon: 'notifications',
          label: 'الإشعارات',
          desc:  'تنبيهات النظام وسجل الإشعارات',
          screen: 'Notifications',
          color: colors.accent,
        },
        {
          icon: 'person',
          label: 'ملفي الشخصي',
          desc:  'إعدادات حسابك وتفضيلاتك',
          screen: 'Profile',
          color: colors.success,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>
          {'المزيد'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {'إدارة المستخدمين وأدوات الذكاء الاصطناعي وإعدادات النظام'}
        </Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {section.title.toUpperCase()}
            </Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={[styles.item, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.icon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.itemText}>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  content:      { padding: spacing.md, paddingBottom: spacing.xxl },
  title:        { ...typography.h1, marginTop: spacing.sm },
  sub:          { ...typography.bodySmall, marginBottom: spacing.lg, marginTop: 2 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.sectionLabel, marginBottom: spacing.sm },
  item:         { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  icon:         { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:     { flex: 1 },
  itemLabel:    { ...typography.h4 },
  itemDesc:     { ...typography.bodySmall, marginTop: 2 },
});
