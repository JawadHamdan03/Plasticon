import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

export function AuditMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'shield-checkmark', label: isAr ? 'سجلات التدقيق' : 'Audit Logs',    desc: isAr ? 'سجل النشاط الكامل وتاريخ التغييرات' : 'Full system activity and change history',    screen: 'AuditLogs',     color: colors.primary },
    { icon: 'camera',           label: isAr ? 'اللقطات' : 'Snapshots',           desc: isAr ? 'قراءات الآلات والكهرباء من العمال' : 'Machine and electricity readings by workers', screen: 'AdminSnaps',    color: colors.info },
    { icon: 'hardware-chip',    label: isAr ? 'أدوات الذكاء الاصطناعي' : 'AI Tools', desc: isAr ? 'تقارير ورؤى إدارية بالذكاء الاصطناعي' : 'AI-powered admin reports and insights',      screen: 'AIHub',         color: '#7C3AED' },
    { icon: 'notifications',    label: isAr ? 'الإشعارات' : 'Notifications',     desc: isAr ? 'تنبيهات النظام ومركز الإشعارات' : 'System alerts and notification centre',         screen: 'Notifications', color: colors.warning },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'التدقيق والأدوات' : 'Audit & Tools'}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{isAr ? 'مراقبة النظام وأدوات الذكاء الاصطناعي' : 'System monitoring and AI tools'}</Text>
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
