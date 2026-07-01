import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface MenuItem {
  icon:  string;
  label: string;
  desc:  string;
  color: string;
  screen: string;
}

function Item({ item, colors }: { item: MenuItem; colors: any }) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity style={[styles.item, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.75}>
      <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemLabel}>{item.label}</Text>
        <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function PersonalMenuScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();

  const ITEMS: MenuItem[] = [
    { icon: 'person-circle', label: 'ملفي الشخصي',    desc: 'الصورة والمعلومات الشخصية والمستندات',  color: colors.primary,  screen: 'Profile'       },
    { icon: 'time',          label: 'حضوري',  desc: 'تسجيل الدخول/الخروج وسجل الحضور',  color: colors.success,  screen: 'Attendance'    },
    { icon: 'cash',          label: 'راتبي',      desc: 'سجلات الرواتب والأرباح الشهرية',       color: colors.accent,   screen: 'Payroll'       },
    { icon: 'notifications', label: 'الإشعارات', desc: 'التنبيهات ورسائل النظام',                color: colors.warning,  screen: 'Notifications' },
    { icon: 'chatbubbles',   label: 'الدردشة',           desc: 'التواصل مع فريقك',                        color: colors.info,     screen: 'Chat'          },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{'الشخصية'}</Text>
          <Text style={[styles.pageSub, { color: colors.textMuted }]}>{user?.fullName ?? 'Worker'}</Text>
        </View>
        <View style={styles.list}>
          {ITEMS.map((item) => (
            <Item key={item.screen} item={item} colors={colors} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  content:    { padding: spacing.md, paddingBottom: spacing.xxl },
  pageHeader: { marginBottom: spacing.lg, paddingTop: spacing.sm },
  pageTitle:  { ...typography.h1 },
  pageSub:    { ...typography.bodySmall, marginTop: 2 },
  list:       { gap: spacing.sm },
  item:       { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  iconWrap:   { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText:   { flex: 1 },
  itemLabel:  { ...typography.h4 },
  itemDesc:   { ...typography.bodySmall, marginTop: 2 },
});
