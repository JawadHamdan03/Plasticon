import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

export function AcctMoreScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'business',      label: 'إدارة الموردين',   desc: 'إدارة علاقات الموردين وجهات الاتصال',     screen: 'Suppliers',           color: colors.primary },
    { icon: 'pricetag',      label: 'تسعير القطع',             desc: 'كتالوج قطع الغيار مع تفاصيل التكلفة',    screen: 'PartsPricing',        color: colors.info },
    { icon: 'git-merge',     label: 'سير العمل الموافقات', desc: 'مراجعة الطلبات المعلقة والموافقة عليها',        screen: 'ApprovalWorkflows',   color: colors.warning },
    { icon: 'stats-chart',   label: 'أداء الموظفين',    desc: 'مراجعات الأداء والتقييمات',                     screen: 'EmployeePerformance', color: colors.success },
    { icon: 'hardware-chip', label: 'أدوات الذكاء الاصطناعي',        desc: 'رؤى مالية وملخصات مدعومة بالذكاء الاصطناعي', screen: 'AIHub',               color: '#7C3AED' },
    { icon: 'notifications', label: 'الإشعارات',               desc: 'التنبيهات وإشعارات النظام',                    screen: 'Notifications',       color: colors.accent },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{'المزيد'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{'أدوات وإعدادات إضافية'}</Text>
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
