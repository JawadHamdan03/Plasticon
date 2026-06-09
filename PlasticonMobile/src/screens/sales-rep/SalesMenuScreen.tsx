import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components';
import { radius, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import type { SalesRepSalesStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<SalesRepSalesStackParamList>;

const MENU_ITEMS: { labelEn: string; labelAr: string; icon: string; screen: keyof SalesRepSalesStackParamList }[] = [
  { labelEn: 'My Customers',  labelAr: 'عملائي',         icon: 'people-outline',          screen: 'Customers' },
  { labelEn: 'Quotations',    labelAr: 'عروض الأسعار',   icon: 'document-text-outline',   screen: 'Quotations' },
  { labelEn: 'Visit Log',     labelAr: 'سجل الزيارات',   icon: 'location-outline',         screen: 'Visits' },
  { labelEn: 'Targets',       labelAr: 'الأهداف',        icon: 'flag-outline',             screen: 'Targets' },
];

export function SalesMenuScreen() {
  const { colors } = useAppTheme();
  const { isAr }   = useLocale();
  const nav        = useNavigation<NavProp>();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScreenHeader title={isAr ? 'أدوات المبيعات' : 'Sales Tools'} />
      <ScrollView contentContainerStyle={styles.container}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => nav.navigate(item.screen)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accent + '22' }]}>
              <Ionicons name={item.icon as any} size={26} color={colors.accent} />
            </View>
            <Text style={[styles.label, { color: colors.text }]}>
              {isAr ? item.labelAr : item.labelEn}
            </Text>
            <Ionicons name={isAr ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  container:{ padding: spacing.md, gap: spacing.sm },
  card:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  iconWrap: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label:    { ...typography.body, fontWeight: '600', flex: 1 },
});
