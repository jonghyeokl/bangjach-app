import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Choices, colors, styles } from './ui';
import type { Enums } from '@/lib/types';

export function FilterChip({
  label,
  active = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[sheet.chip, active && { backgroundColor: colors.light, borderColor: colors.green }]}
    >
      <Text style={{ color: active ? colors.green : colors.ink, fontWeight: '600', fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FilterSheet({
  title,
  visible,
  onClose,
  children,
  footer,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="선택창 닫기"
        />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={sheet.panel}>
          <View style={sheet.header}>
            <Text accessibilityRole="header" style={styles.heading}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={onClose}
              style={sheet.close}
            >
              <Text style={{ fontSize: 24, color: colors.ink }}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={sheet.body}
          >
            {children}
          </ScrollView>
          {footer && <View style={sheet.footer}>{footer}</View>}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function RegionPicker({
  meta,
  region,
  subregions,
  onChange,
}: {
  meta: Enums | null;
  region: number | null;
  subregions: number[];
  onChange: (region: number | null, subregions: number[]) => void;
}) {
  const label = meta?.region.find((r) => r.value === region)?.label;
  return (
    <View style={sheet.regions}>
      <View style={sheet.majors}>
        {[{ value: 0, label: '전국' }, ...(meta?.region ?? [])].map((r) => (
          <Pressable
            key={r.value}
            accessibilityRole="button"
            accessibilityState={{ selected: (region ?? 0) === r.value }}
            onPress={() => onChange(r.value || null, [])}
            style={[sheet.major, (region ?? 0) === r.value && { backgroundColor: colors.light }]}
          >
            <Text
              style={{
                color: (region ?? 0) === r.value ? colors.green : colors.muted,
                fontWeight: '600',
              }}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View testID="subregion-options" style={sheet.areas}>
        <Text style={styles.text}>{label ? `${label} 세부 지역` : '전국'}</Text>
        {region ? (
          <>
            <FilterChip
              label={`${label} 전체`}
              active={!subregions.length}
              onPress={() => onChange(region, [])}
            />
            <Choices
              options={(meta?.subregion ?? []).filter((r) => r.parent === region)}
              selected={subregions}
              onChange={(value) =>
                onChange(
                  region,
                  subregions.includes(value)
                    ? subregions.filter((v) => v !== value)
                    : [...subregions, value],
                )
              }
            />
          </>
        ) : (
          <Button secondary title="모든 지역" onPress={() => onChange(null, [])} />
        )}
      </View>
    </View>
  );
}

const sheet = StyleSheet.create({
  chip: {
    minHeight: 42,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#15271D66' },
  panel: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 22,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
    minHeight: 62,
  },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 18 },
  footer: { padding: 16, borderTopWidth: 1, borderColor: colors.line, gap: 10 },
  regions: { flexDirection: 'row', gap: 16 },
  majors: { width: 76, gap: 4 },
  major: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  areas: { flex: 1, gap: 14, alignItems: 'flex-start' },
});
