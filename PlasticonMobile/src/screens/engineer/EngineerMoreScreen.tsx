import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import { EngineerProfileStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<EngineerProfileStackParamList>;

const ITEMS: { label: string; icon: string; screen: keyof EngineerProfileStackParamList; color: string }[] = [
  { label: 'My Profile',     icon: 'person-circle',    screen: 'Profile',       color: colors.primary },
  { label: 'AI Tools',       icon: 'hardware-chip',    screen: 'AIHub',         color: '#7C3AED' },
  { label: 'Notifications',  icon: 'notifications',    screen: 'Notifications', color: colors.warning },
];

function MenuItem({ label, icon, color, onPress }: { label: string; icon: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function EngineerMoreScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="More" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {ITEMS.map((item) => (
            <MenuItem
              key={item.screen}
              label={item.label}
              icon={item.icon}
              color={item.color}
              onPress={() => navigation.navigate(item.screen as any)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.sm, overflow: 'hidden' },
  item:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBox: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label:   { ...typography.body, flex: 1 },
});
