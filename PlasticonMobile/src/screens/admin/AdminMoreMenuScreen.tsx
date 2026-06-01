import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function AdminMoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const SECTIONS = [
    {
      title: isAr ? 'إدارة المستخدمين' : 'User Management',
      items: [
        {
          icon: 'people',
          label: isAr ? 'المستخدمون' : 'Users',
          desc:  isAr ? 'إدارة جميع حسابات المستخدمين والأدوار' : 'Manage all user accounts and roles',
          screen: 'Users',
          color: colors.primary,
        },
        {
          icon: 'person-add',
          label: isAr ? 'طلبات التسجيل' : 'Registrations',
          desc:  isAr ? 'طلبات الوصول المعلقة والموافقات' : 'Pending access requests and approvals',
          screen: 'Registrations',
          color: colors.warning,
        },
        {
          icon: 'briefcase',
          label: isAr ? 'نظرة عامة على المهندسين' : 'Engineer Overview',
          desc:  isAr ? 'مراجعة أداء الفريق الهندسي' : 'Engineering team performance review',
          screen: 'EngineerOverview',
          color: colors.roleEngineer,
        },
        {
          icon: 'people',
          label: isAr ? 'العملاء' : 'Customers',
          desc:  isAr ? 'حسابات العملاء المستمدة من سجلات المبيعات' : 'Customer accounts derived from sales records',
          screen: 'Customers',
          color: colors.info,
        },
      ],
    },
    {
      title: isAr ? 'أدوات الذكاء الاصطناعي' : 'AI Tools',
      items: [
        {
          icon: 'hardware-chip',
          label: isAr ? 'المساعد الذكي' : 'AI Assistant',
          desc:  isAr ? 'مساعد ذكي متعدد الأغراض للمصنع' : 'General-purpose factory AI assistant',
          screen: 'AIHub',
          color: colors.primary,
        },
        {
          icon: 'document-text',
          label: isAr ? 'استخراج الفواتير' : 'Invoice Extraction',
          desc:  isAr ? 'استخراج البيانات من الفواتير بالذكاء الاصطناعي' : 'Extract data from invoices using AI',
          screen: 'InvoiceExtraction',
          color: colors.success,
        },
        {
          icon: 'warning',
          label: isAr ? 'كشف الانحرافات' : 'Anomaly Detection',
          desc:  isAr ? 'الكشف عن الانحرافات في الإنتاج والمعدات' : 'Detect production and equipment anomalies',
          screen: 'AnomalyDetection',
          color: colors.danger,
        },
        {
          icon: 'construct',
          label: isAr ? 'تقرير الصيانة' : 'Maintenance Report',
          desc:  isAr ? 'ملخصات الصيانة المولدة بالذكاء الاصطناعي' : 'AI-generated maintenance summaries',
          screen: 'MaintenanceReport',
          color: colors.warning,
        },
        {
          icon: 'swap-horizontal',
          label: isAr ? 'تسليم الوردية' : 'Shift Handover',
          desc:  isAr ? 'ملاحظات تسليم الوردية بمساعدة الذكاء الاصطناعي' : 'AI-assisted shift handover notes',
          screen: 'ShiftHandover',
          color: colors.info,
        },
        {
          icon: 'school',
          label: isAr ? 'تدريب العمال' : 'Worker Coaching',
          desc:  isAr ? 'التدريب والتوجيه الذكي للعمال' : 'AI coaching and guidance for workers',
          screen: 'WorkerCoaching',
          color: colors.accent,
        },
      ],
    },
    {
      title: isAr ? 'النظام' : 'System',
      items: [
        {
          icon: 'shield',
          label: isAr ? 'سجلات التدقيق' : 'Audit Logs',
          desc:  isAr ? 'جميع إجراءات النظام وسجل التدقيق' : 'All system actions and audit trail',
          screen: 'AuditLogs',
          color: colors.info,
        },
        {
          icon: 'camera',
          label: isAr ? 'لقطات المدير' : 'Admin Snapshots',
          desc:  isAr ? 'اللقطات والأرشيفات الإدارية' : 'Administrative snapshots and archives',
          screen: 'AdminSnaps',
          color: colors.textMuted,
        },
        {
          icon: 'settings',
          label: isAr ? 'الإعدادات' : 'Settings',
          desc:  isAr ? 'إعدادات النظام والتفضيلات' : 'System-wide configuration and preferences',
          screen: 'Settings',
          color: colors.textMuted,
        },
        {
          icon: 'chatbubbles',
          label: isAr ? 'الدردشة' : 'Chat',
          desc:  isAr ? 'المراسلة والنقاش على مستوى الشركة' : 'Company-wide messaging and discussion',
          screen: 'Chat',
          color: colors.primary,
        },
        {
          icon: 'notifications',
          label: isAr ? 'الإشعارات' : 'Notifications',
          desc:  isAr ? 'تنبيهات النظام وسجل الإشعارات' : 'System alerts and notification history',
          screen: 'Notifications',
          color: colors.accent,
        },
        {
          icon: 'person',
          label: isAr ? 'ملفي الشخصي' : 'My Profile',
          desc:  isAr ? 'إعدادات حسابك وتفضيلاتك' : 'Your account settings and preferences',
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
          {isAr ? 'المزيد' : 'More Options'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {isAr ? 'إدارة المستخدمين وأدوات الذكاء الاصطناعي وإعدادات النظام' : 'User management, AI tools and system settings'}
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
