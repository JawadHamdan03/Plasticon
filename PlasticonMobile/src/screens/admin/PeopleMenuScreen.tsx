import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

export function PeopleMenuScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'people',     label: 'المستخدمون',                  desc: 'إدارة المستخدمين والأدوار',                          screen: 'Users',            color: colors.primary },
    { icon: 'calendar',   label: 'الحضور',            desc: 'عرض سجلات الحضور',                                  screen: 'AttendanceAdmin',  color: colors.info },
    { icon: 'cash',       label: 'الرواتب',              desc: 'إدارة الرواتب',                                              screen: 'PayrollAdmin',     color: colors.success },
    { icon: 'document',   label: 'سجلات العمال',        desc: 'لقطات وسجلات نشاط العمال اليومية', screen: 'WorkerRecords',    color: colors.accent },
    { icon: 'construct',  label: 'نظرة عامة للمهندس', desc: 'صحة الآلات والصيانة حسب المهندس', screen: 'EngineerOverview', color: colors.warning },
    { icon: 'person-add', label: 'طلبات التسجيل', desc: 'الموافقة على تسجيلات المستخدمين الجديدة أو رفضها', screen: 'Registrations', color: colors.danger },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>
          {'الأشخاص'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {'إدارة المستخدمين والقوى العاملة'}
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
