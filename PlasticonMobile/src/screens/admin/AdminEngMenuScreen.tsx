import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function AdminEngMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const SECTIONS = [
    {
      title: isAr ? 'الصيانة' : 'Maintenance',
      items: [
        { icon: 'hammer',          label: isAr ? 'الصيانة' : 'Maintenance',          desc: isAr ? 'أوامر العمل ومهام الصيانة' : 'Work orders and maintenance tasks',           screen: 'Maintenance',         color: colors.warning },
        { icon: 'calendar',        label: isAr ? 'جدول الصيانة' : 'Maint. Schedule', desc: isAr ? 'جدولة الصيانة الوقائية' : 'Preventive maintenance scheduling',              screen: 'MaintSchedule',       color: colors.info },
        { icon: 'build',           label: isAr ? 'أوامر العمل' : 'Work Orders',      desc: isAr ? 'أوامر العمل النشطة والتكليفات' : 'Active work orders and assignments',       screen: 'WorkOrders',          color: colors.primary },
        { icon: 'cash',            label: isAr ? 'تكاليف الصيانة' : 'Maintenance Costs', desc: isAr ? 'تتبع نفقات الصيانة' : 'Maintenance expenditure tracking',             screen: 'MaintCosts',          color: colors.danger },
      ],
    },
    {
      title: isAr ? 'المعدات والمخزون' : 'Equipment & Inventory',
      items: [
        { icon: 'pulse',           label: isAr ? 'صحة الآلات' : 'Machine Health',       desc: isAr ? 'مراقبة صحة الآلات في الوقت الفعلي' : 'Real-time machine health monitoring',   screen: 'MachineHealth',       color: colors.success },
        { icon: 'cog',             label: isAr ? 'قطع الغيار' : 'Spare Parts',           desc: isAr ? 'مخزون قطع الغيار وطلباتها' : 'Spare parts stock and requests',              screen: 'SpareParts',          color: colors.warning },
        { icon: 'archive',         label: isAr ? 'مخزون الهندسة' : 'Eng. Inventory',    desc: isAr ? 'المخزون الهندسي والمكونات' : 'Engineering stock and components',             screen: 'EngInventory',        color: colors.info },
        { icon: 'speedometer',     label: isAr ? 'المعايرة' : 'Calibration',             desc: isAr ? 'سجلات معايرة المعدات' : 'Equipment calibration records',                    screen: 'Calibration',         color: colors.accent },
        { icon: 'git-branch',      label: isAr ? 'دورة حياة المعدات' : 'Equipment Lifecycle', desc: isAr ? 'تتبع الأصول وإهلاكها' : 'Asset lifecycle and depreciation tracking',   screen: 'Lifecycle',           color: colors.roleEngineer },
        { icon: 'swap-horizontal', label: isAr ? 'نقل المعدات' : 'Equipment Transfer',   desc: isAr ? 'تتبع تنقلات موقع المعدات' : 'Track equipment location transfers',           screen: 'TransferLog',         color: colors.textMuted },
      ],
    },
    {
      title: isAr ? 'الجودة والإنتاج' : 'Quality & Production',
      items: [
        { icon: 'checkmark-done',  label: isAr ? 'فحوصات الجودة' : 'Quality Checks',       desc: isAr ? 'نتائج الفحص وتتبع العيوب' : 'Inspection results and defect tracking',   screen: 'QualityChecks',       color: colors.success },
        { icon: 'trending-up',     label: isAr ? 'اتجاهات الجودة' : 'Quality Trends',       desc: isAr ? 'اتجاهات مؤشرات الجودة وتحليلها' : 'Quality KPI trends and analysis',     screen: 'QualityTrends',       color: colors.info },
        { icon: 'analytics',       label: isAr ? 'تحليلات الإنتاج' : 'Production Analytics', desc: isAr ? 'كفاءة الإخراج وتحليل العائد' : 'Output efficiency and yield analysis',  screen: 'ProductionAnalytics', color: colors.primary },
        { icon: 'alert-circle',    label: isAr ? 'تنبيهات المواد الخام' : 'Raw Material Alerts', desc: isAr ? 'نقص المخزون وإشعارات إعادة الطلب' : 'Low stock and reorder notifications', screen: 'RawAlerts',      color: colors.danger },
        { icon: 'document',        label: isAr ? 'الوثائق التقنية' : 'Tech Documents',       desc: isAr ? 'الأدلة التقنية وإجراءات التشغيل' : 'Technical manuals and SOPs',          screen: 'TechDocs',            color: colors.textMuted },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'الهندسة' : 'Engineering'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{isAr ? 'إدارة الصيانة والمعدات والجودة' : 'Maintenance, equipment and quality management'}</Text>
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
