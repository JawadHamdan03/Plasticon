import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme';

const plasticonLogo = require('../../assets/plasticonLogo.png') as number;

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightLabel?: string;
}

export function ScreenHeader({ title, subtitle, showBack, rightIcon, onRightPress, rightLabel }: Props) {
  const navigation = useNavigation();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      {showBack ? (
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
      ) : (
        <Image source={plasticonLogo} style={styles.logo} resizeMode="contain" />
      )}

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {(rightIcon || rightLabel) && onRightPress ? (
        <Pressable
          onPress={onRightPress}
          style={({ pressed }) => [styles.rightBtn, pressed && { opacity: 0.7 }]}
        >
          {rightLabel ? (
            <Text style={[styles.rightLabel, { color: colors.primary }]}>{rightLabel}</Text>
          ) : rightIcon ? (
            <View style={[styles.iconBtn, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={rightIcon} size={20} color={colors.primary} />
            </View>
          ) : null}
        </Pressable>
      ) : (
        <View style={styles.logo} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { padding: 4, marginRight: 4 },
  logo:    { width: 44, height: 44, borderRadius: 8 },
  center:          { flex: 1, alignItems: 'center' },
  title: {
    ...typography.h3,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 1,
    textAlign: 'center',
  },
  rightBtn:   { marginLeft: spacing.sm },
  iconBtn:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rightLabel: { ...typography.body, fontWeight: '600' },
});
