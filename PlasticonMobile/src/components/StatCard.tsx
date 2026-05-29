import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../theme';

interface Props {
  label: string;
  value: string | number;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  style?: ViewStyle;
}

export function StatCard({ label, value, color = colors.primary, icon, subtext, trend, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {/* Colored top accent bar */}
      <View style={[styles.bar, { backgroundColor: color }]} />

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.value, { color }]}>{value}</Text>
          {icon ? (
            <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
              <Ionicons name={icon} size={16} color={color} />
            </View>
          ) : null}
        </View>

        <Text style={styles.label}>{label}</Text>

        {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}

        {trend ? (
          <View style={styles.trendRow}>
            <Ionicons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
              size={13}
              color={trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textMuted}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.sm,
  },
  bar: {
    height: 3,
    width: '100%',
  },
  body: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.text,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  subtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  trendRow: {
    marginTop: spacing.xs,
  },
});
