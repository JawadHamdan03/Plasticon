import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface Props {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function PlaceholderScreen({ title, icon = 'construct-outline' }: Props) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={icon} size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{isAr ? 'قريباً في المرحلة القادمة' : 'Coming in the next phase'}</Text>
        <View style={[styles.pill, { backgroundColor: colors.accentLight }]}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.pillText, { color: colors.accentDark }]}>{isAr ? 'قيد التطوير' : 'In development'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  iconWrap:  { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title:     { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  subtitle:  { fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
  pill:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  pillText:  { fontSize: 12, fontWeight: '600' },
});
