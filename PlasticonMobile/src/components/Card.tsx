import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { radius, shadow, spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  accentColor?: string;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, onPress, accentColor, style, padding }: Props) {
  const { colors } = useAppTheme();

  const inner = (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 3 } : null,
        padding !== undefined ? { padding } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
});
