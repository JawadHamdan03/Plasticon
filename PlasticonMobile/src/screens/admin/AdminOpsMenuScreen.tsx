import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const SECTIONS = [
  {
    title: 'Workforce',
    items: [
      { icon: 'people',       label: 'Attendance',    desc: 'Track and manage worker check-ins',    screen: 'AttendanceAdmin', color: colors.primary },
      { icon: 'cash',         label: 'Payroll',       desc: 'Salary records and payment runs',      screen: 'PayrollAdmin',    color: colors.success },
      { icon: 'person',       label: 'Worker Records', desc: 'Worker profiles and history',         screen: 'WorkerRecords',   color: colors.info },
      { icon: 'home',         label: 'Worker Hub',    desc: 'Worker announcements and tools',       screen: 'WorkerHub',       color: colors.accent },
      { icon: 'camera',       label: 'Snapshots',     desc: 'Production snapshots and photos',      screen: 'Snapshots',       color: colors.warning },
    ],
  },
  {
    title: 'Production & Equipment',
    items: [
      { icon: 'construct',    label: 'Production',    desc: 'Production batches and output',        screen: 'Production',      color: colors.primary },
      { icon: 'cube',         label: 'Consumption',   desc: 'Raw material usage and tracking',      screen: 'Consumption',     color: colors.warning },
      { icon: 'hardware-chip', label: 'Machines',     desc: 'Machine configuration and status',     screen: 'Machines',        color: colors.info },
      { icon: 'time',         label: 'Shifts',        desc: 'Shift schedules and assignments',      screen: 'Shifts',          color: colors.success },
      { icon: 'flash',        label: 'Electricity',   desc: 'Power consumption monitoring',         screen: 'Electricity',     color: colors.warning },
    ],
  },
];

export function AdminOpsMenuScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Operations</Text>
        <Text style={styles.sub}>Workforce, production and equipment management</Text>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.screen}
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
