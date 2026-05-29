import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface MenuItem {
  icon:  string;
  label: string;
  desc:  string;
  color: string;
  screen: string;
}

const ITEMS: MenuItem[] = [
  { icon: 'time',          label: 'My Attendance',  desc: 'Check-in/out and attendance history',  color: colors.success,  screen: 'Attendance'    },
  { icon: 'cash',          label: 'My Payroll',      desc: 'Pay records and monthly earnings',      color: colors.accent,   screen: 'Payroll'       },
  { icon: 'notifications', label: 'Notifications',   desc: 'Alerts and system messages',            color: colors.primary,  screen: 'Notifications' },
  { icon: 'chatbubbles',   label: 'Team Chat',        desc: 'Communicate with your team',            color: colors.info,     screen: 'Chat'          },
];

function Item({ item }: { item: MenuItem }) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
      <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemLabel}>{item.label}</Text>
        <Text style={styles.itemDesc}>{item.desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function PersonalMenuScreen() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Personal</Text>
          <Text style={styles.pageSub}>{user?.fullName ?? 'Worker'}</Text>
        </View>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <Item key={item.screen} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  content:    { padding: spacing.md, paddingBottom: spacing.xxl },
  pageHeader: { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:  { ...typography.h1 },
  pageSub:    { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  list:       { gap: spacing.sm },
  item:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  iconWrap:   { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:   { flex: 1 },
  itemLabel:  { ...typography.h4 },
  itemDesc:   { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});
