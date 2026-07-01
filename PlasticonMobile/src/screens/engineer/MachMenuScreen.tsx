import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

export function MachMenuScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'pulse',           label: 'صحة الآلات',      desc: 'الحالة التشغيلية والكفاءة وسجلات التوقف', screen: 'MachineHealth', color: colors.success },
    { icon: 'settings',        label: 'قطع الغيار',          desc: 'مخزون القطع ومستويات المخزون وتنبيهات النقص', screen: 'SpareParts',    color: colors.primary },
    { icon: 'cube',            label: 'مخزون المهندس', desc: 'الأدوات والمعدات المخصصة للهندسة',     screen: 'EngInventory',  color: colors.info },
    { icon: 'checkmark-circle',label: 'المعايرة',             desc: 'حالة معايرة المعدات وسجلاتها',        screen: 'Calibration',   color: colors.accent },
    { icon: 'refresh-circle',  label: 'تتبع دورة الحياة', desc: 'تتبع عمر المعدات وحالتها وتاريخها',     screen: 'Lifecycle',     color: colors.warning },
    { icon: 'swap-horizontal', label: 'سجل النقل',           desc: 'تاريخ نقل المعدات وإسناداتها',       screen: 'TransferLog',   color: colors.danger },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{'الآلات'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{'مجموعة إدارة الآلات الكاملة'}</Text>
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
