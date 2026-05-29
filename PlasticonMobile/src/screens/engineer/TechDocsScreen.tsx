import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';

interface TechDoc {
  id: number;
  title: string;
  category?: string;
  fileUrl?: string;
  description?: string;
  uploadedBy?: { fullName: string } | null;
  createdAt: string;
}

const CAT_COLOR: Record<string, string> = {
  SOP: colors.primary, DATASHEET: colors.info, MANUAL: colors.success, OTHER: colors.textMuted,
};

function DocCard({ item }: { item: TechDoc }) {
  const color = CAT_COLOR[item.category ?? 'OTHER'] ?? colors.textMuted;
  const open  = () => { if (item.fileUrl) void Linking.openURL(item.fileUrl); };

  return (
    <TouchableOpacity style={styles.card} onPress={open} activeOpacity={item.fileUrl ? 0.75 : 1}>
      <View style={[styles.docIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name="document-text" size={22} color={color} />
      </View>
      <View style={styles.docContent}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.meta}>
          {item.category && (
            <View style={[styles.catBadge, { backgroundColor: `${color}15` }]}>
              <Text style={[styles.catText, { color }]}>{item.category}</Text>
            </View>
          )}
          {item.uploadedBy && <Text style={styles.uploader}>by {item.uploadedBy.fullName}</Text>}
        </View>
        {item.description ? <Text style={styles.desc} numberOfLines={1}>{item.description}</Text> : null}
      </View>
      {item.fileUrl && <Ionicons name="open-outline" size={18} color={colors.primary} />}
    </TouchableOpacity>
  );
}

export function TechDocsScreen() {
  const [docs, setDocs]         = useState<TechDoc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ documents: TechDoc[] }>('/tech-documents?limit=40');
      setDocs(res.documents ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Technical Docs" subtitle={`${docs.length} documents`} showBack />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={docs}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <DocCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="documents-outline" size={44} color={colors.textMuted} /><Text style={styles.emptyText}>No documents uploaded</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: spacing.md, paddingBottom: 40 },
  card:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md, ...shadow.sm },
  docIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docContent: { flex: 1 },
  title:   { ...typography.h4, marginBottom: 4 },
  meta:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  catText:  { fontSize: 10, fontWeight: '700' },
  uploader: { ...typography.caption },
  desc:    { ...typography.caption, color: colors.textMuted },
  empty:   { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
});
