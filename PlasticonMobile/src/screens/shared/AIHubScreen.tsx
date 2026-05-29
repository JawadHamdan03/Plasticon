import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface AITool {
  icon: string;
  title: string;
  description: string;
  screen: string;
  color: string;
  roles: string[];
}

const AI_TOOLS: AITool[] = [
  {
    icon: 'chatbubble-ellipses',
    title: 'RAG Assistant',
    description: 'Ask anything about Plasticon operations, machinery, reports, and more.',
    screen: 'Assistant',
    color: colors.primary,
    roles: ['WORKER', 'ENGINEER', 'ACCOUNTANT', 'ADMIN'],
  },
  {
    icon: 'swap-horizontal',
    title: 'Shift Handover',
    description: 'AI generates a structured shift handover report from your session data.',
    screen: 'ShiftHandover',
    color: colors.accent,
    roles: ['WORKER', 'ENGINEER'],
  },
  {
    icon: 'school',
    title: 'Worker Coaching',
    description: 'Get personalised performance coaching tips based on your work history.',
    screen: 'WorkerCoaching',
    color: colors.success,
    roles: ['WORKER'],
  },
  {
    icon: 'analytics',
    title: 'Anomaly Detection',
    description: 'AI scans recent machine and production data to flag anomalies.',
    screen: 'Assistant',
    color: colors.danger,
    roles: ['ENGINEER', 'ADMIN'],
  },
  {
    icon: 'document-text',
    title: 'Maintenance Report',
    description: 'Generate an AI-assisted predictive maintenance report.',
    screen: 'Assistant',
    color: colors.info,
    roles: ['ENGINEER', 'ADMIN'],
  },
  {
    icon: 'receipt',
    title: 'Invoice Extraction',
    description: 'Extract and structure invoice data automatically with AI.',
    screen: 'Assistant',
    color: colors.roleAccountant,
    roles: ['ACCOUNTANT', 'ADMIN'],
  },
];

function ToolCard({ tool }: { tool: AITool }) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate(tool.screen)}
      activeOpacity={0.78}
    >
      <View style={[styles.cardIcon, { backgroundColor: `${tool.color}15` }]}>
        <Ionicons name={tool.icon as any} size={28} color={tool.color} />
      </View>
      <Text style={styles.cardTitle}>{tool.title}</Text>
      <Text style={styles.cardDesc}>{tool.description}</Text>
      <View style={[styles.cardArrow, { backgroundColor: `${tool.color}15` }]}>
        <Ionicons name="arrow-forward" size={14} color={tool.color} />
      </View>
    </TouchableOpacity>
  );
}

export function AIHubScreen() {
  const { user } = useAuth();
  const role = user?.role ?? 'WORKER';

  const visibleTools = AI_TOOLS.filter((t) => t.roles.includes(role));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="hardware-chip" size={28} color={colors.primary} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>AI Hub</Text>
            <Text style={styles.bannerSub}>Powered by Plasticon Intelligence</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>AVAILABLE TOOLS</Text>
        <View style={styles.grid}>
          {visibleTools.map((tool) => (
            <ToolCard key={tool.title} tool={tool} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.lg, gap: spacing.md,
    ...shadow.sm,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  bannerIcon: {
    width: 50, height: 50, borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerText:  { flex: 1 },
  bannerTitle: { ...typography.h2 },
  bannerSub:   { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },

  grid: { gap: spacing.sm },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: { ...typography.h3, marginBottom: 4 },
  cardDesc:  { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  cardArrow: {
    alignSelf: 'flex-end', marginTop: spacing.sm,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});
