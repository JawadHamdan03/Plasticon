import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { radius, shadow, spacing, typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface AITool {
  icon:         string;
  title:        string;
  titleAr:      string;
  description:  string;
  descriptionAr: string;
  screen:       string;
  adminScreen?: string;
  color:        string;
  roles:        string[];
}

function ToolCard({ tool, role }: { tool: AITool; role: string }) {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const navigation = useNavigation<any>();
  const target = role === 'ADMIN' && tool.adminScreen ? tool.adminScreen : tool.screen;
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate(target)} activeOpacity={0.78}>
      <View style={[styles.cardIcon, { backgroundColor: `${tool.color}15` }]}>
        <Ionicons name={tool.icon as any} size={28} color={tool.color} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? tool.titleAr : tool.title}</Text>
      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{isAr ? tool.descriptionAr : tool.description}</Text>
      <View style={[styles.cardArrow, { backgroundColor: `${tool.color}15` }]}>
        <Ionicons name="arrow-forward" size={14} color={tool.color} />
      </View>
    </TouchableOpacity>
  );
}

export function AIHubScreen() {
  const { colors } = useAppTheme();
  const { isAr } = useLocale();
  const { user } = useAuth();
  const role = user?.role ?? 'WORKER';

  const AI_TOOLS: AITool[] = [
    { icon: 'chatbubble-ellipses', title: 'RAG Assistant', titleAr: 'المساعد الذكي',
      description: 'Ask anything about Plasticon operations, machinery, reports, and more.',
      descriptionAr: 'اسأل عن أي شيء يتعلق بعمليات بلاستيكون، الآلات، التقارير والمزيد.',
      screen: 'Assistant', color: colors.primary, roles: ['WORKER', 'ENGINEER', 'ACCOUNTANT', 'ADMIN'] },
    { icon: 'swap-horizontal', title: 'Shift Handover', titleAr: 'تسليم الوردية',
      description: 'AI generates a structured shift handover report from your session data.',
      descriptionAr: 'يُنشئ الذكاء الاصطناعي تقرير تسليم وردية منظم من بيانات جلستك.',
      screen: 'ShiftHandover', color: colors.accent, roles: ['WORKER', 'ENGINEER', 'ADMIN'] },
    { icon: 'school', title: 'Worker Coaching', titleAr: 'تدريب العامل',
      description: 'Get personalised performance coaching tips based on your work history.',
      descriptionAr: 'احصل على نصائح تدريب مخصصة بناءً على سجل عملك.',
      screen: 'WorkerCoaching', color: colors.success, roles: ['WORKER', 'ADMIN'] },
    { icon: 'warning', title: 'Anomaly Detection', titleAr: 'كشف الشذوذات',
      description: 'AI scans recent machine and production data to flag anomalies.',
      descriptionAr: 'يفحص الذكاء الاصطناعي بيانات الآلات والإنتاج للكشف عن الشذوذات.',
      screen: 'Assistant', adminScreen: 'AnomalyDetection', color: colors.danger, roles: ['ENGINEER', 'ADMIN'] },
    { icon: 'construct', title: 'Maintenance Report', titleAr: 'تقرير الصيانة',
      description: 'Generate an AI-assisted predictive maintenance report.',
      descriptionAr: 'إنشاء تقرير صيانة تنبؤي بمساعدة الذكاء الاصطناعي.',
      screen: 'Assistant', adminScreen: 'MaintenanceReport', color: colors.warning, roles: ['ENGINEER', 'ADMIN'] },
    { icon: 'receipt', title: 'Invoice Extraction', titleAr: 'استخراج الفواتير',
      description: 'Extract and structure invoice data automatically with AI.',
      descriptionAr: 'استخراج وهيكلة بيانات الفواتير تلقائيًا بالذكاء الاصطناعي.',
      screen: 'Assistant', adminScreen: 'InvoiceExtraction', color: colors.roleAccountant, roles: ['ACCOUNTANT', 'ADMIN'] },
  ];

  const visibleTools = AI_TOOLS.filter((t) => t.roles.includes(role));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="hardware-chip" size={28} color={colors.primary} />
          </View>
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>{'مركز الذكاء الاصطناعي'}</Text>
            <Text style={[styles.bannerSub, { color: colors.textMuted }]}>{'مدعوم بذكاء بلاستيكون'}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{'الأدوات المتاحة'}</Text>
        <View style={styles.grid}>
          {visibleTools.map((tool) => <ToolCard key={tool.title} tool={tool} role={role} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  banner:     { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.md, ...shadow.sm, borderLeftWidth: 4 },
  bannerIcon: { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1 },
  bannerTitle: { ...typography.h2 },
  bannerSub:   { ...typography.caption, marginTop: 2 },

  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },
  grid:         { gap: spacing.sm },

  card:     { borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  cardTitle: { ...typography.h3, marginBottom: 4 },
  cardDesc:  { ...typography.bodySmall, lineHeight: 20 },
  cardArrow: { alignSelf: 'flex-end', marginTop: spacing.sm, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
