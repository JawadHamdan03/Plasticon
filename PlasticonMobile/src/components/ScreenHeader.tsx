import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';

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

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {(rightIcon || rightLabel) && onRightPress ? (
        <Pressable
          onPress={onRightPress}
          style={({ pressed }) => [styles.rightBtn, pressed && { opacity: 0.7 }]}
        >
          {rightLabel ? (
            <Text style={styles.rightLabel}>{rightLabel}</Text>
          ) : rightIcon ? (
            <View style={styles.iconBtn}>
              <Ionicons name={rightIcon} size={20} color={colors.primary} />
            </View>
          ) : null}
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
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
  backBtn:         { padding: 4, marginRight: 4 },
  backPlaceholder: { width: 32 },
  center: { flex: 1, alignItems: 'center' },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
  rightBtn:   { marginLeft: spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  rightLabel: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
