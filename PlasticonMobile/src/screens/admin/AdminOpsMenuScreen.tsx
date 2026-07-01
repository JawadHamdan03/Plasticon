import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

export function AdminOpsMenuScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const SECTIONS = [
    {
      title: 'القوى العاملة',
      items: [
        { icon: 'people',        label: 'الحضور',     desc: 'تتبع وإدارة تسجيل دخول العمال',   screen: 'AttendanceAdmin', color: colors.primary },
        { icon: 'cash',          label: 'الرواتب',        desc: 'سجلات الرواتب ودورات الدفع',        screen: 'PayrollAdmin',    color: colors.success },
        { icon: 'person',        label: 'سجلات العمال', desc: 'ملفات العمال وسجلاتهم',            screen: 'WorkerRecords',   color: colors.info },
        { icon: 'camera',        label: 'القراءات',      desc: 'لقطات الإنتاج والصور',             screen: 'Snapshots',       color: colors.warning },
      ],
    },
    {
      title: 'الإنتاج والمعدات',
      items: [
        { icon: 'construct',     label: 'الإنتاج',      desc: 'دفعات الإنتاج والمخرجات',           screen: 'Production',      color: colors.primary },
        { icon: 'cube',          label: 'الاستهلاك',    desc: 'استخدام المواد الخام وتتبعها',    screen: 'Consumption',     color: colors.warning },
        { icon: 'hardware-chip', label: 'الآلات',          desc: 'إعداد الآلات وحالتها',          screen: 'Machines',        color: colors.info },
        { icon: 'time',          label: 'الورديات',          desc: 'جداول الورديات والتعيينات',       screen: 'Shifts',          color: colors.success },
        { icon: 'flash',         label: 'الكهرباء',     desc: 'مراقبة استهلاك الطاقة',             screen: 'Electricity',     color: colors.warning },
        { icon: 'warning',       label: 'توقفات الآلات', desc: 'تنبيهات توقف الآلات من العمال', screen: 'MachineStops',       color: colors.danger   },
        { icon: 'flash',         label: 'قراءات الكهرباء', desc: 'سجلات قراءات عدادات الكهرباء', screen: 'ElectricityRecord', color: colors.warning  },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>
          {'العمليات'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {'إدارة القوى العاملة والإنتاج والمعدات'}
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
