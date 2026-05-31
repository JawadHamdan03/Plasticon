import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function MachMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'pulse',           label: isAr ? 'صحة الآلات' : 'Machine Health',      desc: isAr ? 'الحالة التشغيلية والكفاءة وسجلات التوقف' : 'Operational status, efficiency, downtime records', screen: 'MachineHealth', color: colors.success },
    { icon: 'settings',        label: isAr ? 'قطع الغيار' : 'Spare Parts',          desc: isAr ? 'مخزون القطع ومستويات المخزون وتنبيهات النقص' : 'Parts inventory, stock levels, low-stock alerts', screen: 'SpareParts',    color: colors.primary },
    { icon: 'cube',            label: isAr ? 'مخزون المهندس' : 'Engineer Inventory', desc: isAr ? 'الأدوات والمعدات المخصصة للهندسة' : 'Tools and equipment assigned to engineering',     screen: 'EngInventory',  color: colors.info },
    { icon: 'checkmark-circle',label: isAr ? 'المعايرة' : 'Calibration',             desc: isAr ? 'حالة معايرة المعدات وسجلاتها' : 'Equipment calibration status and records',        screen: 'Calibration',   color: colors.accent },
    { icon: 'refresh-circle',  label: isAr ? 'تتبع دورة الحياة' : 'Lifecycle Tracking', desc: isAr ? 'تتبع عمر المعدات وحالتها وتاريخها' : 'Track equipment age, condition, and history',     screen: 'Lifecycle',     color: colors.warning },
    { icon: 'swap-horizontal', label: isAr ? 'سجل النقل' : 'Transfer Log',           desc: isAr ? 'تاريخ نقل المعدات وإسناداتها' : 'Equipment movement and assignment history',       screen: 'TransferLog',   color: colors.danger },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'الآلات' : 'Machines'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{isAr ? 'مجموعة إدارة الآلات الكاملة' : 'Full machine management suite'}</Text>
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
