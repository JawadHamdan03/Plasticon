import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface MenuItem {
  icon: string;
  label: string;
  description: string;
  color: string;
  screen: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: 'cube',
    label: 'Production Log',
    description: 'Record and view production entries',
    color: colors.primary,
    screen: 'Production',
  },
  {
    icon: 'time',
    label: 'Attendance',
    description: 'Check in / out and view history',
    color: colors.success,
    screen: 'Attendance',
  },
  {
    icon: 'cash',
    label: 'My Payroll',
    description: 'Daily pay records and monthly totals',
    color: colors.accent,
    screen: 'Payroll',
  },
  {
    icon: 'bar-chart',
    label: 'Reports',
    description: 'Attendance, production and shift reports',
    color: colors.info,
    screen: 'Reports',
  },
];

function Item({ item }: { item: MenuItem }) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemLabel}>{item.label}</Text>
        <Text style={styles.itemDesc}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
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

        <View style={styles.list}>
          {MENU_ITEMS.map((item) => (
            <Item key={item.screen} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  pageHeader: { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:  { ...typography.h1 },
  pageSub:    { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },

  list: { gap: spacing.sm },

  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.sm,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  itemText:  { flex: 1 },
  itemLabel: { ...typography.h4 },
  itemDesc:  { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});
