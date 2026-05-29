import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { Badge, Button, Card } from '../../components';
import { colors, roleColor, spacing, typography } from '../../theme';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const initials = (user?.fullName ?? '?')
    .split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');

  const color = roleColor(user?.role);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar + identity */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: `${color}22`, borderColor: color }]}>
            <Text style={[styles.avatarText, { color }]}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Badge
            label={user?.role ?? ''}
            variant="primary"
            dot
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* Details card */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>ACCOUNT INFO</Text>
          <InfoRow label="Username"   value={user?.username   ?? '—'} />
          <InfoRow label="Role"       value={user?.role       ?? '—'} />
          <InfoRow label="Department" value={user?.department ?? '—'} />
          <InfoRow label="Job Title"  value={user?.jobTitle   ?? '—'} />
          <InfoRow label="Phone"      value={user?.phone      ?? '—'} />
        </Card>

        <Button onPress={handleLogout} variant="danger" fullWidth size="lg">
          Sign Out
        </Button>

        <Text style={styles.version}>Plasticon Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 26, fontWeight: '700' },
  name:       { ...typography.h2, marginBottom: 4 },
  email:      { ...typography.bodySmall, color: colors.textMuted },

  card:    { marginBottom: spacing.md },
  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.md },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: { ...typography.bodySmall, color: colors.textMuted, flex: 1 },
  infoValue: { ...typography.bodySmall, fontWeight: '600', color: colors.text, flex: 2, textAlign: 'right' },

  version: { ...typography.caption, textAlign: 'center', marginTop: spacing.xl },
});
