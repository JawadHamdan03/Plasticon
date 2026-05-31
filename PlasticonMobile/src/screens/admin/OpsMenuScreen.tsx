import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function OpsMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'hardware-chip', label: isAr ? 'الآلات' : 'Machines',    desc: isAr ? 'عرض وتهيئة جميع آلات الإنتاج' : 'View and configure all production machines',  screen: 'Machines',    color: colors.primary },
    { icon: 'time',          label: isAr ? 'الورديات' : 'Shifts',     desc: isAr ? 'إدارة جداول الورديات والتكليفات' : 'Manage shift schedules and assignments',      screen: 'Shifts',      color: colors.info },
    { icon: 'flash',         label: isAr ? 'الكهرباء' : 'Electricity', desc: isAr ? 'مراقبة استخدام الكهرباء والاستهلاك' : 'Monitor electricity usage and consumption', screen: 'Electricity', color: colors.warning },
    { icon: 'settings',      label: isAr ? 'الإعدادات' : 'Settings',  desc: isAr ? 'ضبط إعدادات التطبيق على مستوى النظام' : 'Configure system-wide application settings', screen: 'Settings', color: colors.textMuted },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'العمليات' : 'Operations'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{isAr ? 'إدارة النظام والبنية التحتية' : 'System and infrastructure management'}</Text>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <TouchableOpacity key={item.screen} style={[styles.item, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
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
