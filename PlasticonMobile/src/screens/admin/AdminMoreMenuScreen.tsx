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
      title: 'User Management',
      items: [
        { icon: 'people',          label: 'Users',               desc: 'Manage all user accounts and roles',          screen: 'Users',              color: colors.primary },
        { icon: 'person-add',      label: 'Registrations',       desc: 'Pending access requests and approvals',       screen: 'Registrations',      color: colors.warning },
        { icon: 'briefcase',       label: 'Engineer Overview',   desc: 'Engineering team performance review',         screen: 'EngineerOverview',   color: colors.roleEngineer },
        { icon: 'people',          label: 'Customers',           desc: 'Customer accounts derived from sales records', screen: 'Customers',          color: colors.info },
      ],
    },
    {
      title: 'AI Tools',
      items: [
        { icon: 'hardware-chip',   label: 'AI Assistant',        desc: 'General-purpose factory AI assistant',        screen: 'AIHub',              color: colors.primary },
        { icon: 'document-text',   label: 'Invoice Extraction',  desc: 'Extract data from invoices using AI',         screen: 'InvoiceExtraction',  color: colors.success },
        { icon: 'warning',         label: 'Anomaly Detection',   desc: 'Detect production and equipment anomalies',   screen: 'AnomalyDetection',   color: colors.danger },
        { icon: 'construct',       label: 'Maintenance Report',  desc: 'AI-generated maintenance summaries',          screen: 'MaintenanceReport',  color: colors.warning },
        { icon: 'swap-horizontal', label: 'Shift Handover',      desc: 'AI-assisted shift handover notes',            screen: 'ShiftHandover',      color: colors.info },
        { icon: 'school',          label: 'Worker Coaching',     desc: 'AI coaching and guidance for workers',        screen: 'WorkerCoaching',     color: colors.accent },
      ],
    },
    {
      title: 'System',
      items: [
        { icon: 'shield',          label: isAr ? 'سجلات التدقيق' : 'Audit Logs',   desc: 'All system actions and audit trail',          screen: 'AuditLogs',      color: colors.info },
        { icon: 'camera',          label: 'Admin Snapshots',     desc: 'Administrative snapshots and archives',       screen: 'AdminSnaps',         color: colors.textMuted },
        { icon: 'settings',        label: isAr ? 'الإعدادات' : 'Settings',          desc: 'System-wide configuration and preferences',   screen: 'Settings',       color: colors.textMuted },
        { icon: 'chatbubbles',     label: isAr ? 'الدردشة' : 'Chat',                desc: 'Company-wide messaging and discussion',       screen: 'Chat',           color: colors.primary },
        { icon: 'notifications',   label: isAr ? 'الإشعارات' : 'Notifications',    desc: 'System alerts and notification history',      screen: 'Notifications',  color: colors.accent },
        { icon: 'person',          label: isAr ? 'ملفي الشخصي' : 'My Profile',     desc: 'Your account settings and preferences',       screen: 'Profile',        color: colors.success },
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
          User management, AI tools and system settings
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
