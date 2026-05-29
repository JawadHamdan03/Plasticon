import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface MenuItem {
  icon:   string;
  label:  string;
  desc:   string;
  color:  string;
  screen: string;
}

const PRODUCTION_ITEMS: MenuItem[] = [
  { icon: 'cube',          label: 'Production',        desc: 'All production logs and records',      color: colors.primary,  screen: 'Production'         },
  { icon: 'flask',         label: 'Consumption',       desc: 'Material usage and consumption data',  color: colors.accent,   screen: 'Consumption'        },
  { icon: 'layers',        label: 'Warehouse',         desc: 'Warehouse stock and locations',        color: '#D97706',       screen: 'Warehouse'          },
  { icon: 'analytics',     label: 'Prod. Analytics',   desc: 'Production trends and deep analysis',  color: colors.info,     screen: 'ProductionAnalytics'},
  { icon: 'flash',         label: 'Electricity',       desc: 'Power monitoring and alerts',          color: colors.warning,  screen: 'Electricity'        },
];

const QUALITY_MAINT_ITEMS: MenuItem[] = [
  { icon: 'shield-checkmark', label: 'Quality Checks',    desc: 'Inspection records and results',    color: colors.success,  screen: 'QualityChecks'      },
  { icon: 'trending-up',      label: 'Quality Trends',    desc: 'Quality KPIs and trend reports',    color: colors.info,     screen: 'QualityTrends'      },
  { icon: 'warning',          label: 'Raw Mat. Alerts',   desc: 'Raw material threshold alerts',     color: colors.danger,   screen: 'RawAlerts'          },
  { icon: 'construct',        label: 'Maintenance',       desc: 'Active and scheduled maintenance',  color: colors.warning,  screen: 'MaintenancePage'    },
  { icon: 'calendar',         label: 'Work Orders',       desc: 'Maintenance work order tracking',   color: '#6366F1',       screen: 'WorkOrders'         },
  { icon: 'cash',             label: 'Maint. Costs',      desc: 'Maintenance expense tracking',      color: colors.danger,   screen: 'MaintCosts'         },
];

const MACHINES_ITEMS: MenuItem[] = [
  { icon: 'hardware-chip',    label: 'Machine Health',    desc: 'Real-time machine status and KPIs', color: colors.primary,  screen: 'MachineHealth'      },
  { icon: 'grid',             label: 'Parts Inventory',   desc: 'Engineer parts and supplies',       color: '#0EA5E9',       screen: 'EngInventory'       },
  { icon: 'settings',         label: 'Spare Parts',       desc: 'Spare part requests and stock',     color: colors.warning,  screen: 'SpareParts'         },
  { icon: 'time',             label: 'Equip. Lifecycle',  desc: 'Equipment age and lifecycle data',  color: '#8B5CF6',       screen: 'Lifecycle'          },
  { icon: 'speedometer',      label: 'Calibration',       desc: 'Equipment calibration schedule',    color: colors.success,  screen: 'Calibration'        },
  { icon: 'swap-horizontal',  label: 'Equip. Transfer',   desc: 'Equipment transfer log history',    color: colors.info,     screen: 'TransferLog'        },
  { icon: 'document-text',    label: 'Tech. Docs',        desc: 'Technical manuals and documents',   color: colors.textMuted,screen: 'TechDocs'           },
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

export function EngineerEngMenuScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Engineering</Text>
          <Text style={styles.pageSub}>18 tools and monitors</Text>
        </View>
        <Section title="Production"          items={PRODUCTION_ITEMS}    />
        <Section title="Quality & Maintenance" items={QUALITY_MAINT_ITEMS} />
        <Section title="Machines & Equipment" items={MACHINES_ITEMS}      />
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
