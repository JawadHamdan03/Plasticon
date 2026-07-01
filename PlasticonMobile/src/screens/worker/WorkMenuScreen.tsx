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
    { icon: 'cube',         label: 'تسجيل الإنتاج',  desc: 'تسجيل مخرجات الإنتاج',            color: colors.primary, screen: 'Production'   },
    { icon: 'camera',       label: 'اللقطات',        desc: 'قراءات الآلة والكهرباء',  color: '#8b5cf6',      screen: 'Snapshots'    },
    { icon: 'flag',         label: 'الأهداف اليومية',     desc: isAr ? 'أهداف اليوم'                : "Today's production goals",             color: colors.success, screen: 'DailyTargets' },
  ];

  const REPORTING_ITEMS: MenuItem[] = [
    { icon: 'warning',          label: 'توقف الآلات',   desc: 'الإبلاغ عن توقف الآلة',         color: colors.danger,  screen: 'MachineStops'   },
    { icon: 'pause-circle',     label: 'توقفات مايكرو',   desc: 'تسجيل الانقطاعات القصيرة',  color: colors.info,    screen: 'MicroStops'     },
    { icon: 'trash',            label: 'هدر المواد',   desc: 'تسجيل المواد المهدرة',            color: '#E67E22',      screen: 'MaterialWaste'  },
    { icon: 'alert-circle',     label: 'مشاكل الجودة', desc: 'الإبلاغ عن العيوب',                color: colors.warning, screen: 'QualityIssues'  },
    { icon: 'checkmark-circle', label: 'قائمة التحقق', desc: 'فحوصات السلامة',                 color: colors.success, screen: 'DailyChecklist' },
  ];

  const ELECTRICITY_ITEMS: MenuItem[] = [
    { icon: 'flash-outline', label: 'تنبيهات الكهرباء', desc: 'عرض تنبيهات الاستهلاك',   color: colors.warning, screen: 'ElectricityAlerts' },
    { icon: 'document-text', label: 'سجل الكهرباء',     desc: 'تصفح سجل القراءات',    color: colors.info,    screen: 'ElectricityRecord' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{'عملي'}</Text>
          <Text style={[styles.pageSub, { color: colors.textMuted }]}>{user?.department ?? ('أرضية المصنع')}</Text>
        </View>
        <Section title={'الإنتاج'}   items={PRODUCTION_ITEMS}   colors={colors} />
        <Section title={'التقارير'}    items={REPORTING_ITEMS}    colors={colors} />
        <Section title={'الكهرباء'}  items={ELECTRICITY_ITEMS}  colors={colors} />
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
