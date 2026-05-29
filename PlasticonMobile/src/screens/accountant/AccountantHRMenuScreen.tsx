import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const ITEMS = [
  { icon: 'time',    label: 'Attendance', desc: 'All worker attendance records and history', color: colors.success, screen: 'Attendance' },
  { icon: 'cash',    label: 'Payroll',    desc: 'Worker pay records and monthly summaries',  color: colors.accent,  screen: 'Payroll'    },
];

export function AccountantHRMenuScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>HR</Text>
          <Text style={styles.pageSub}>Human resources overview</Text>
        </View>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <TouchableOpacity key={item.screen} style={styles.item} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={26} color={item.color} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
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
  safe:       { flex: 1, backgroundColor: colors.background },
  content:    { padding: spacing.md, paddingBottom: spacing.xxl },
  pageHeader: { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:  { ...typography.h1 },
  pageSub:    { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  list:       { gap: spacing.sm },
  item:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow.sm },
  iconWrap:   { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:   { flex: 1 },
  itemLabel:  { ...typography.h3 },
  itemDesc:   { ...typography.bodySmall, color: colors.textMuted, marginTop: 3 },
});
