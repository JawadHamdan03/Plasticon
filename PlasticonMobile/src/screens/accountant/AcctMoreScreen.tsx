import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const ITEMS = [
  { icon: 'business',      label: 'Supplier Management',   desc: 'Manage vendor relationships and contacts',       screen: 'Suppliers',           color: colors.primary },
  { icon: 'pricetag',      label: 'Parts Pricing',         desc: 'Spare parts catalogue with cost breakdown',      screen: 'PartsPricing',        color: colors.info },
  { icon: 'git-merge',     label: 'Approval Workflows',    desc: 'Review and approve pending requests',            screen: 'ApprovalWorkflows',   color: colors.warning },
  { icon: 'stats-chart',   label: 'Employee Performance',  desc: 'Performance reviews and ratings',                screen: 'EmployeePerformance', color: colors.success },
  { icon: 'hardware-chip', label: 'AI Tools',              desc: 'AI-powered financial insights and summaries',    screen: 'AIHub',               color: '#7C3AED' },
  { icon: 'notifications', label: 'Notifications',         desc: 'Alerts and system notifications',                screen: 'Notifications',       color: colors.accent },
];

export function AcctMoreScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.sub}>Additional tools and settings</Text>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <TouchableOpacity key={item.screen} style={styles.item} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
              <View style={[styles.icon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
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
  safe:      { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.md, paddingBottom: spacing.xxl },
  title:     { ...typography.h1, marginTop: spacing.sm },
  sub:       { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.lg, marginTop: 2 },
  list:      { gap: spacing.sm },
  item:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  icon:      { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:  { flex: 1 },
  itemLabel: { ...typography.h4 },
  itemDesc:  { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});
