import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

export function AdminEngMenuScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const SECTIONS = [
    {
      title: 'الصيانة',
      items: [
        { icon: 'hammer',          label: 'الصيانة',          desc: 'أوامر العمل ومهام الصيانة',           screen: 'Maintenance',         color: colors.warning },
        { icon: 'calendar',        label: 'جدول الصيانة', desc: 'جدولة الصيانة الوقائية',              screen: 'MaintSchedule',       color: colors.info },
        { icon: 'build',           label: 'أوامر العمل',      desc: 'أوامر العمل النشطة والتكليفات',       screen: 'WorkOrders',          color: colors.primary },
        { icon: 'cash',            label: 'تكاليف الصيانة', desc: 'تتبع نفقات الصيانة',             screen: 'MaintCosts',          color: colors.danger },
      ],
    },
    {
      title: 'المعدات والمخزون',
      items: [
        { icon: 'pulse',           label: 'صحة الآلات',       desc: 'مراقبة صحة الآلات في الوقت الفعلي',   screen: 'MachineHealth',       color: colors.success },
        { icon: 'cog',             label: 'قطع الغيار',           desc: 'مخزون قطع الغيار وطلباتها',              screen: 'SpareParts',          color: colors.warning },
        { icon: 'speedometer',     label: 'المعايرة',             desc: 'سجلات معايرة المعدات',                    screen: 'Calibration',         color: colors.accent },
        { icon: 'git-branch',      label: 'دورة حياة المعدات', desc: 'تتبع الأصول وإهلاكها',   screen: 'Lifecycle',           color: colors.roleEngineer },
        { icon: 'swap-horizontal', label: 'نقل المعدات',   desc: 'تتبع تنقلات موقع المعدات',           screen: 'TransferLog',         color: colors.textMuted },
      ],
    },
    {
      title: 'الجودة والإنتاج',
      items: [
        { icon: 'checkmark-done',  label: 'فحوصات الجودة',       desc: 'نتائج الفحص وتتبع العيوب',   screen: 'QualityChecks',       color: colors.success },
{ icon: 'analytics',       label: 'تحليلات الإنتاج', desc: 'كفاءة الإخراج وتحليل العائد',  screen: 'ProductionAnalytics', color: colors.primary },
        { icon: 'alert-circle',    label: 'تنبيهات المواد الخام', desc: 'نقص المخزون وإشعارات إعادة الطلب', screen: 'RawAlerts',      color: colors.danger },
        { icon: 'document',        label: 'الوثائق التقنية',       desc: 'الأدلة التقنية وإجراءات التشغيل',          screen: 'TechDocs',            color: colors.textMuted },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{'الهندسة'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{'إدارة الصيانة والمعدات والجودة'}</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title.toUpperCase()}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={`${section.title}-${item.screen}`}
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
