import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../../theme';

const ITEMS = [
  { icon: 'people',          label: 'Users',               desc: 'Manage all user accounts and roles',              screen: 'Users',            color: colors.primary },
  { icon: 'calendar',        label: 'Attendance Admin',    desc: 'View and manage attendance for all employees',    screen: 'AttendanceAdmin',  color: colors.info },
  { icon: 'cash',            label: 'Payroll Admin',       desc: 'Oversee payroll records for all staff',           screen: 'PayrollAdmin',     color: colors.success },
  { icon: 'document',        label: 'Worker Records',      desc: 'Daily worker activity snapshots and logs',        screen: 'WorkerRecords',    color: colors.accent },
  { icon: 'construct',       label: 'Engineer Overview',   desc: 'Machine health and maintenance by engineer',      screen: 'EngineerOverview', color: colors.warning },
  { icon: 'person-add',      label: 'Registration Requests', desc: 'Approve or reject new user registrations',    screen: 'Registrations',    color: colors.danger },
];

export function PeopleMenuScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>People</Text>
        <Text style={styles.sub}>User and workforce management</Text>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <TouchableOpacity key={item.screen} style={styles.item} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
              <View style={[styles.icon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.md, paddingBottom: spacing.xxl },
  title:     { ...typography.h1, marginTop: spacing.sm },
  sub:       { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.lg, marginTop: 2 },
  list:      { gap: spacing.sm },
  item:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  icon:      { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:  { flex: 1 },
  itemLabel: { ...typography.h4 },
  itemDesc:  { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});
