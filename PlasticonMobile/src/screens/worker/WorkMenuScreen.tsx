import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface MenuItem {
  icon:   string;
  label:  string;
  desc:   string;
  color:  string;
  screen: string;
}

const PRODUCTION_ITEMS: MenuItem[] = [
  { icon: 'cube',       label: 'Production Log',  desc: 'Record production output',          color: colors.primary, screen: 'Production'    },
  { icon: 'flask',      label: 'Consumption',     desc: 'Material usage records',             color: colors.accent,  screen: 'Consumption'   },
  { icon: 'flash',      label: 'Readings',        desc: 'Log electricity meter readings',     color: colors.warning, screen: 'Readings'      },
  { icon: 'flag',       label: 'Daily Targets',   desc: "Today's production goals",          color: colors.success, screen: 'DailyTargets'  },
];

const REPORTING_ITEMS: MenuItem[] = [
  { icon: 'warning',          label: 'Machine Stops',   desc: 'Report full machine stoppages',     color: colors.danger,  screen: 'MachineStops'     },
  { icon: 'pause-circle',     label: 'Micro Stops',     desc: 'Log brief production interruptions', color: colors.info,    screen: 'MicroStops'       },
  { icon: 'trash',            label: 'Material Waste',  desc: 'Log scrap and waste materials',      color: '#E67E22',      screen: 'MaterialWaste'    },
  { icon: 'alert-circle',     label: 'Quality Issues',  desc: 'Report defects and problems',        color: colors.warning, screen: 'QualityIssues'    },
  { icon: 'checkmark-circle', label: 'Daily Checklist', desc: 'Safety and pre-start checks',        color: colors.success, screen: 'DailyChecklist'   },
  { icon: 'bulb',             label: 'Kaizen Ideas',    desc: 'Submit improvement suggestions',     color: '#8B5CF6',      screen: 'KaizenIdeas'      },
];

const ELECTRICITY_ITEMS: MenuItem[] = [
  { icon: 'flash-outline', label: 'Electricity Alerts', desc: 'View power consumption alerts',   color: colors.warning, screen: 'ElectricityAlerts' },
  { icon: 'document-text', label: 'Electricity Record', desc: 'Browse all meter reading history', color: colors.info,    screen: 'ElectricityRecord' },
];

function Section({ title, items }: { title: string; items: MenuItem[] }) {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.screen} style={styles.item} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <View style={styles.itemText}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemDesc}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function WorkMenuScreen() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Work</Text>
          <Text style={styles.pageSub}>{user?.department ?? 'Factory Floor'}</Text>
        </View>
        <Section title="Production"     items={PRODUCTION_ITEMS}   />
        <Section title="Reporting"      items={REPORTING_ITEMS}    />
        <Section title="Electricity"    items={ELECTRICITY_ITEMS}  />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.md, paddingBottom: spacing.xxl },
  pageHeader:   { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:    { ...typography.h1 },
  pageSub:      { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  item:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.xs, ...shadow.sm },
  iconWrap:     { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:     { flex: 1 },
  itemLabel:    { ...typography.h4 },
  itemDesc:     { ...typography.bodySmall, color: colors.textMuted, marginTop: 1 },
});
