import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function PeopleMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'people',     label: isAr ? 'المستخدمون' : 'Users',                  desc: isAr ? 'إدارة المستخدمين والأدوار' : 'Manage users and roles',                          screen: 'Users',            color: colors.primary },
    { icon: 'calendar',   label: isAr ? 'الحضور' : 'Attendance Admin',            desc: isAr ? 'عرض سجلات الحضور' : 'View attendance records',                                  screen: 'AttendanceAdmin',  color: colors.info },
    { icon: 'cash',       label: isAr ? 'الرواتب' : 'Payroll Admin',              desc: isAr ? 'إدارة الرواتب' : 'Manage payroll',                                              screen: 'PayrollAdmin',     color: colors.success },
    { icon: 'document',   label: isAr ? 'سجلات العمال' : 'Worker Records',        desc: isAr ? 'لقطات وسجلات نشاط العمال اليومية' : 'Daily worker activity snapshots and logs', screen: 'WorkerRecords',    color: colors.accent },
    { icon: 'construct',  label: isAr ? 'نظرة عامة للمهندس' : 'Engineer Overview', desc: isAr ? 'صحة الآلات والصيانة حسب المهندس' : 'Machine health and maintenance by engineer', screen: 'EngineerOverview', color: colors.warning },
    { icon: 'person-add', label: isAr ? 'طلبات التسجيل' : 'Registration Requests', desc: isAr ? 'الموافقة على تسجيلات المستخدمين الجديدة أو رفضها' : 'Approve or reject new user registrations', screen: 'Registrations', color: colors.danger },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isAr ? 'الأشخاص' : 'People'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {isAr ? 'إدارة المستخدمين والقوى العاملة' : 'User and workforce management'}
        </Text>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.item, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <View style={[styles.icon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  content:   { padding: spacing.md, paddingBottom: spacing.xxl },
  title:     { ...typography.h1, marginTop: spacing.sm },
  sub:       { ...typography.bodySmall, marginBottom: spacing.lg, marginTop: 2 },
  list:      { gap: spacing.sm },
  item:      { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  icon:      { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:  { flex: 1 },
  itemLabel: { ...typography.h4 },
  itemDesc:  { ...typography.bodySmall, marginTop: 2 },
});
