import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface MenuItem {
  icon:   string;
  label:  string;
  labelAr: string;
  desc:   string;
  color:  string;
  screen: string;
}

function Section({ title, items, colors, isAr }: { title: string; items: MenuItem[]; colors: any; isAr: boolean }) {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.screen} style={[styles.item, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <View style={styles.itemText}>
            <Text style={[styles.itemLabel, { color: colors.text }]}>{isAr ? item.labelAr : item.label}</Text>
            <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function EngineerEngMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();

  const PRODUCTION_ITEMS: MenuItem[] = [
    { icon: 'cube',      label: 'Production',          labelAr: 'الإنتاج',           desc: 'All production logs and records',     color: colors.primary, screen: 'Production'          },
    { icon: 'analytics', label: 'Production Analytics', labelAr: 'تحليل الإنتاج',     desc: 'Production trends and deep analysis', color: colors.info,    screen: 'ProductionAnalytics' },
    { icon: 'flash',     label: 'Electricity',          labelAr: 'الكهرباء',           desc: 'Power monitoring and alerts',         color: colors.warning, screen: 'Electricity'         },
  ];

  const QUALITY_MAINT_ITEMS: MenuItem[] = [
    { icon: 'shield-checkmark', label: 'Quality Checks',      labelAr: 'فحص الجودة',           desc: 'Inspection records and results',   color: colors.success, screen: 'QualityChecks'   },
    { icon: 'warning',          label: 'Raw Material Alerts',  labelAr: 'تنبيهات المواد الخام', desc: 'Raw material threshold alerts',    color: colors.danger,  screen: 'RawAlerts'       },
    { icon: 'construct',        label: 'Maintenance',          labelAr: 'الصيانة',              desc: 'Active and scheduled maintenance', color: colors.warning, screen: 'MaintenancePage' },
    { icon: 'calendar',         label: 'Work Orders',          labelAr: 'أوامر العمل',          desc: 'Maintenance work order tracking',  color: '#6366F1',      screen: 'WorkOrders'      },
    { icon: 'cash',             label: 'Maintenance Costs',    labelAr: 'تكاليف الصيانة',       desc: 'Maintenance expense tracking',     color: colors.danger,  screen: 'MaintCosts'      },
  ];

  const MACHINES_ITEMS: MenuItem[] = [
    { icon: 'hardware-chip',   label: 'Machine Health',       labelAr: 'صحة الآلات',       desc: 'Real-time machine status and KPIs',   color: colors.primary,  screen: 'MachineHealth' },
    { icon: 'grid',            label: 'Parts Inventory',      labelAr: 'مخزون القطع',      desc: 'Engineer parts and supplies',         color: '#0EA5E9',        screen: 'EngInventory'  },
    { icon: 'settings',        label: 'Spare Parts',          labelAr: 'قطع الغيار',       desc: 'Spare part requests and stock',       color: colors.warning,  screen: 'SpareParts'    },
    { icon: 'time',            label: 'Equipment Lifecycle',  labelAr: 'دورة المعدات',     desc: 'Equipment age and lifecycle data',    color: '#8B5CF6',        screen: 'Lifecycle'     },
    { icon: 'swap-horizontal', label: 'Transfer Log',         labelAr: 'سجل النقل',        desc: 'Equipment transfer log history',      color: colors.info,     screen: 'TransferLog'   },
    { icon: 'document-text',   label: 'Technical Docs',       labelAr: 'الوثائق التقنية',  desc: 'Technical manuals and documents',     color: colors.textMuted, screen: 'TechDocs'     },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{isAr ? 'الهندسة' : 'Engineering'}</Text>
          <Text style={[styles.pageSub, { color: colors.textMuted }]}>{isAr ? '١٤ أداة وشاشة' : '14 tools and monitors'}</Text>
        </View>
        <Section title={isAr ? 'الإنتاج' : 'Production'}            items={PRODUCTION_ITEMS}    colors={colors} isAr={isAr} />
        <Section title={isAr ? 'الجودة والصيانة' : 'Quality & Maintenance'} items={QUALITY_MAINT_ITEMS} colors={colors} isAr={isAr} />
        <Section title={isAr ? 'الآلات والمعدات' : 'Machines & Equipment'}  items={MACHINES_ITEMS}      colors={colors} isAr={isAr} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  content:      { padding: spacing.md, paddingBottom: spacing.xxl },
  pageHeader:   { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:    { ...typography.h1 },
  pageSub:      { ...typography.bodySmall, marginTop: 2 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { ...typography.caption, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  item:         { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.xs, ...shadow.sm },
  iconWrap:     { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:     { flex: 1 },
  itemLabel:    { ...typography.h4 },
  itemDesc:     { ...typography.bodySmall, marginTop: 1 },
});
