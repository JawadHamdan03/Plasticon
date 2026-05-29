import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface Props {
  label: string;
  variant?: Variant;
  dot?: boolean;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; dot: string }> = {
  success: { bg: colors.successLight, text: colors.success,  dot: colors.success  },
  warning: { bg: colors.warningLight, text: colors.warning,  dot: colors.warning  },
  danger:  { bg: colors.dangerLight,  text: colors.danger,   dot: colors.danger   },
  info:    { bg: colors.infoLight,    text: colors.info,     dot: colors.info     },
  neutral: { bg: colors.border,       text: colors.textSecondary, dot: colors.textMuted },
  primary: { bg: colors.primaryLight, text: colors.primary,  dot: colors.primary  },
};

export function Badge({ label, variant = 'neutral', dot = false, style }: Props) {
  const v = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: v.dot }]} /> : null}
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
});
