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
  const { isAr } = useLocale();
  const { user } = useAuth();

  const ITEMS: MenuItem[] = [
    { icon: 'person-circle', label: isAr ? 'ملفي الشخصي' : 'My Profile',    desc: isAr ? 'الصورة والمعلومات الشخصية والمستندات' : 'Photo, personal info and documents',  color: colors.primary,  screen: 'Profile'       },
    { icon: 'time',          label: isAr ? 'حضوري' : 'My Attendance',  desc: isAr ? 'تسجيل الدخول/الخروج وسجل الحضور' : 'Check-in/out and attendance history',  color: colors.success,  screen: 'Attendance'    },
    { icon: 'cash',          label: isAr ? 'راتبي' : 'My Payroll',      desc: isAr ? 'سجلات الرواتب والأرباح الشهرية' : 'Pay records and monthly earnings',       color: colors.accent,   screen: 'Payroll'       },
    { icon: 'notifications', label: isAr ? 'الإشعارات' : 'Notifications', desc: isAr ? 'التنبيهات ورسائل النظام' : 'Alerts and system messages',                color: colors.warning,  screen: 'Notifications' },
    { icon: 'chatbubbles',   label: isAr ? 'الدردشة' : 'Chat',           desc: isAr ? 'التواصل مع فريقك' : 'Communicate with your team',                        color: colors.info,     screen: 'Chat'          },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{isAr ? 'الشخصية' : 'Personal'}</Text>
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
