import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function MaintMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'construct',  label: isAr ? 'سجلات الصيانة' : 'Maintenance Records', desc: isAr ? 'تسجيل ومتابعة جميع أنشطة الصيانة' : 'Log and track all maintenance activities',       screen: 'MaintenancePage', color: colors.warning },
    { icon: 'calendar',   label: isAr ? 'جدول الصيانة الوقائية' : 'PM Schedule',  desc: isAr ? 'تقويم ومجدول الصيانة الوقائية' : 'Preventive maintenance calendar and schedules',   screen: 'MaintSchedule',   color: colors.primary },
    { icon: 'clipboard',  label: isAr ? 'أوامر العمل' : 'Work Orders',            desc: isAr ? 'أوامر العمل المكلفة والمتكررة' : 'Assigned work orders and recurring tasks',        screen: 'WorkOrders',      color: colors.info },
    { icon: 'cash',       label: isAr ? 'تكاليف الصيانة' : 'Maintenance Costs',   desc: isAr ? 'تتبع القطع والعمالة وتكاليف الإصلاح' : 'Track parts, labour, and repair costs',        screen: 'MaintCosts',      color: colors.danger },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'الصيانة' : 'Maintenance'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{isAr ? 'جميع أدوات الصيانة في مكان واحد' : 'All maintenance tools in one place'}</Text>
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
