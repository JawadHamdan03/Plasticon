import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const SECTIONS = [
  {
    title: 'Maintenance',
    items: [
      { icon: 'hammer',          label: 'Maintenance',          desc: 'Work orders and maintenance tasks',           screen: 'Maintenance',         color: colors.warning },
      { icon: 'calendar',        label: 'Maint. Schedule',      desc: 'Preventive maintenance scheduling',           screen: 'MaintSchedule',       color: colors.info },
      { icon: 'build',           label: 'Work Orders',          desc: 'Active work orders and assignments',          screen: 'WorkOrders',          color: colors.primary },
      { icon: 'cash',            label: 'Maintenance Costs',    desc: 'Maintenance expenditure tracking',            screen: 'MaintCosts',          color: colors.danger },
    ],
  },
  {
    title: 'Equipment & Inventory',
    items: [
      { icon: 'pulse',           label: 'Machine Health',       desc: 'Real-time machine health monitoring',         screen: 'MachineHealth',       color: colors.success },
      { icon: 'cog',             label: 'Spare Parts',          desc: 'Spare parts stock and requests',              screen: 'SpareParts',          color: colors.warning },
      { icon: 'archive',         label: 'Eng. Inventory',       desc: 'Engineering stock and components',            screen: 'EngInventory',        color: colors.info },
      { icon: 'speedometer',     label: 'Calibration',          desc: 'Equipment calibration records',               screen: 'Calibration',         color: colors.accent },
      { icon: 'git-branch',      label: 'Equipment Lifecycle',  desc: 'Asset lifecycle and depreciation tracking',   screen: 'Lifecycle',           color: colors.roleEngineer },
      { icon: 'swap-horizontal', label: 'Equipment Transfer',   desc: 'Track equipment location transfers',          screen: 'TransferLog',         color: colors.textMuted },
    ],
  },
  {
    title: 'Quality & Production',
    items: [
      { icon: 'checkmark-done',  label: 'Quality Checks',       desc: 'Inspection results and defect tracking',      screen: 'QualityChecks',       color: colors.success },
      { icon: 'trending-up',     label: 'Quality Trends',       desc: 'Quality KPI trends and analysis',             screen: 'QualityTrends',       color: colors.info },
      { icon: 'analytics',       label: 'Production Analytics', desc: 'Output efficiency and yield analysis',        screen: 'ProductionAnalytics', color: colors.primary },
      { icon: 'alert-circle',    label: 'Raw Material Alerts',  desc: 'Low stock and reorder notifications',         screen: 'RawAlerts',           color: colors.danger },
      { icon: 'document',        label: 'Tech Documents',       desc: 'Technical manuals and SOPs',                  screen: 'TechDocs',            color: colors.textMuted },
    ],
  },
];

export function AdminEngMenuScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Engineering</Text>
        <Text style={styles.sub}>Maintenance, equipment and quality management</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={`${section.title}-${item.screen}`}
                style={styles.item}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.icon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.itemText}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.md, paddingBottom: spacing.xxl },
  title:        { ...typography.h1, marginTop: spacing.sm },
  sub:          { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.lg, marginTop: 2 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.sectionLabel, marginBottom: spacing.sm },
  item:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  icon:         { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:     { flex: 1 },
  itemLabel:    { ...typography.h4 },
  itemDesc:     { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});
