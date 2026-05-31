import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

function MenuItem({ label, icon, color, onPress }: { label: string; icon: string; color: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function EngineerMoreScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();

  const ITEMS = [
    { label: isAr ? 'ملفي الشخصي' : 'My Profile',    icon: 'person-circle', screen: 'Profile',       color: colors.primary },
    { label: isAr ? 'أدوات الذكاء الاصطناعي' : 'AI Tools', icon: 'hardware-chip', screen: 'AIHub',   color: '#7C3AED' },
    { label: isAr ? 'الإشعارات' : 'Notifications',   icon: 'notifications',  screen: 'Notifications', color: colors.warning },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader title={isAr ? 'المزيد' : 'More'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {ITEMS.map((item) => (
            <MenuItem
              key={item.screen}
              label={item.label}
              icon={item.icon}
              color={item.color}
              onPress={() => navigation.navigate(item.screen as any)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  section: { borderRadius: radius.lg, ...shadow.sm, overflow: 'hidden' },
  item:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label:   { ...typography.body, flex: 1 },
});
