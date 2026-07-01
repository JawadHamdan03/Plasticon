import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

export function AccountantHRMenuScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { icon: 'time', label: 'الحضور', desc: 'جميع سجلات حضور العمال وتاريخها', color: colors.success, screen: 'Attendance' },
    { icon: 'cash', label: 'الرواتب',   desc: 'سجلات رواتب العمال وملخصاتها الشهرية',  color: colors.accent,  screen: 'Payroll' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{'الموارد البشرية'}</Text>
          <Text style={[styles.pageSub, { color: colors.textMuted }]}>{'نظرة عامة على الموارد البشرية'}</Text>
        </View>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <TouchableOpacity key={item.screen} style={[styles.item, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={26} color={item.color} />
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
  safe:       { flex: 1 },
  content:    { padding: spacing.md, paddingBottom: spacing.xxl },
  pageHeader: { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:  { ...typography.h1 },
  pageSub:    { ...typography.bodySmall, marginTop: 2 },
  list:       { gap: spacing.sm },
  item:       { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow.sm },
  iconWrap:   { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:   { flex: 1 },
  itemLabel:  { ...typography.h3 },
  itemDesc:   { ...typography.bodySmall, marginTop: 3 },
});
