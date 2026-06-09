import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface MenuItem {
  icon:   string;
  label:  string;
  desc:   string;
  color:  string;
  screen: string;
}

function Section({ title, items, colors }: { title: string; items: MenuItem[]; colors: any }) {
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
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function WorkMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();

  const PRODUCTION_ITEMS: MenuItem[] = [
    { icon: 'cube',         label: isAr ? 'تسجيل الإنتاج'  : 'Production Log',  desc: isAr ? 'تسجيل مخرجات الإنتاج'      : 'Record production output',            color: colors.primary, screen: 'Production'   },
    { icon: 'camera',       label: isAr ? 'اللقطات'        : 'Snapshots',        desc: isAr ? 'قراءات الآلة والكهرباء'     : 'Machine counter & electricity reads',  color: '#8b5cf6',      screen: 'Snapshots'    },
    { icon: 'flag',         label: isAr ? 'الأهداف اليومية': 'Daily Targets',     desc: isAr ? 'أهداف اليوم'                : "Today's production goals",             color: colors.success, screen: 'DailyTargets' },
  ];

  const REPORTING_ITEMS: MenuItem[] = [
    { icon: 'warning',          label: isAr ? 'توقف الآلات' : 'Machine Stops',   desc: isAr ? 'الإبلاغ عن توقف الآلة' : 'Report full machine stoppages',         color: colors.danger,  screen: 'MachineStops'   },
    { icon: 'pause-circle',     label: isAr ? 'توقفات مايكرو' : 'Micro Stops',   desc: isAr ? 'تسجيل الانقطاعات القصيرة' : 'Log brief production interruptions',  color: colors.info,    screen: 'MicroStops'     },
    { icon: 'trash',            label: isAr ? 'هدر المواد' : 'Material Waste',   desc: isAr ? 'تسجيل المواد المهدرة' : 'Log scrap and waste materials',            color: '#E67E22',      screen: 'MaterialWaste'  },
    { icon: 'alert-circle',     label: isAr ? 'مشاكل الجودة' : 'Quality Issues', desc: isAr ? 'الإبلاغ عن العيوب' : 'Report defects and problems',                color: colors.warning, screen: 'QualityIssues'  },
    { icon: 'checkmark-circle', label: isAr ? 'قائمة التحقق' : 'Daily Checklist', desc: isAr ? 'فحوصات السلامة' : 'Safety and pre-start checks',                 color: colors.success, screen: 'DailyChecklist' },
  ];

  const ELECTRICITY_ITEMS: MenuItem[] = [
    { icon: 'flash-outline', label: isAr ? 'تنبيهات الكهرباء' : 'Electricity Alerts', desc: isAr ? 'عرض تنبيهات الاستهلاك' : 'View power consumption alerts',   color: colors.warning, screen: 'ElectricityAlerts' },
    { icon: 'document-text', label: isAr ? 'سجل الكهرباء' : 'Electricity Record',     desc: isAr ? 'تصفح سجل القراءات' : 'Browse all meter reading history',    color: colors.info,    screen: 'ElectricityRecord' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{isAr ? 'عملي' : 'My Work'}</Text>
          <Text style={[styles.pageSub, { color: colors.textMuted }]}>{user?.department ?? (isAr ? 'أرضية المصنع' : 'Factory Floor')}</Text>
        </View>
        <Section title={isAr ? 'الإنتاج' : 'Production'}   items={PRODUCTION_ITEMS}   colors={colors} />
        <Section title={isAr ? 'التقارير' : 'Reporting'}    items={REPORTING_ITEMS}    colors={colors} />
        <Section title={isAr ? 'الكهرباء' : 'Electricity'}  items={ELECTRICITY_ITEMS}  colors={colors} />
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
