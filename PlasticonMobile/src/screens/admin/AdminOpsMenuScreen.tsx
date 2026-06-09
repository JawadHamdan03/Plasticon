import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function AdminOpsMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const SECTIONS = [
    {
      title: isAr ? 'القوى العاملة' : 'Workforce',
      items: [
        { icon: 'people',        label: isAr ? 'الحضور' : 'Attendance',     desc: isAr ? 'تتبع وإدارة تسجيل دخول العمال' : 'Track and manage worker check-ins',   screen: 'AttendanceAdmin', color: colors.primary },
        { icon: 'cash',          label: isAr ? 'الرواتب' : 'Payroll',        desc: isAr ? 'سجلات الرواتب ودورات الدفع' : 'Salary records and payment runs',        screen: 'PayrollAdmin',    color: colors.success },
        { icon: 'person',        label: isAr ? 'سجلات العمال' : 'Worker Records', desc: isAr ? 'ملفات العمال وسجلاتهم' : 'Worker profiles and history',            screen: 'WorkerRecords',   color: colors.info },
        { icon: 'camera',        label: isAr ? 'القراءات' : 'Snapshots',      desc: isAr ? 'لقطات الإنتاج والصور' : 'Production snapshots and photos',             screen: 'Snapshots',       color: colors.warning },
      ],
    },
    {
      title: isAr ? 'الإنتاج والمعدات' : 'Production & Equipment',
      items: [
        { icon: 'construct',     label: isAr ? 'الإنتاج' : 'Production',      desc: isAr ? 'دفعات الإنتاج والمخرجات' : 'Production batches and output',           screen: 'Production',      color: colors.primary },
        { icon: 'cube',          label: isAr ? 'الاستهلاك' : 'Consumption',    desc: isAr ? 'استخدام المواد الخام وتتبعها' : 'Raw material usage and tracking',    screen: 'Consumption',     color: colors.warning },
        { icon: 'hardware-chip', label: isAr ? 'الآلات' : 'Machines',          desc: isAr ? 'إعداد الآلات وحالتها' : 'Machine configuration and status',          screen: 'Machines',        color: colors.info },
        { icon: 'time',          label: isAr ? 'الورديات' : 'Shifts',          desc: isAr ? 'جداول الورديات والتعيينات' : 'Shift schedules and assignments',       screen: 'Shifts',          color: colors.success },
        { icon: 'flash',         label: isAr ? 'الكهرباء' : 'Electricity',     desc: isAr ? 'مراقبة استهلاك الطاقة' : 'Power consumption monitoring',             screen: 'Electricity',     color: colors.warning },
        { icon: 'warning',       label: isAr ? 'توقفات الآلات' : 'Machine Stops', desc: isAr ? 'تنبيهات توقف الآلات من العمال' : 'Worker-reported machine stop alerts', screen: 'MachineStops',       color: colors.danger   },
        { icon: 'flash',         label: isAr ? 'قراءات الكهرباء' : 'Electricity Readings', desc: isAr ? 'سجلات قراءات عدادات الكهرباء' : 'Worker electricity meter readings log', screen: 'ElectricityRecord', color: colors.warning  },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isAr ? 'العمليات' : 'Operations'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {isAr ? 'إدارة القوى العاملة والإنتاج والمعدات' : 'Workforce, production and equipment management'}
        </Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title.toUpperCase()}</Text>
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
