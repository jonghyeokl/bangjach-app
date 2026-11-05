import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, colors, styles } from './ui';
import { localDate } from '@/lib/review-form';

export function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <Text style={styles.text}>{label}</Text>
      <View style={inputStyles.counter}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 줄이기`}
          accessibilityState={{ disabled: value === 0 }}
          disabled={value === 0}
          onPress={() => onChange(value - 1)}
          style={[inputStyles.counterButton, value === 0 && { opacity: 0.35 }]}
        >
          <View style={inputStyles.circle}>
            <Text style={inputStyles.symbol}>−</Text>
          </View>
        </Pressable>
        <Text accessibilityLabel={`${label} ${value}`} style={inputStyles.counterValue}>
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 늘리기`}
          onPress={() => onChange(value + 1)}
          style={inputStyles.counterButton}
        >
          <View style={inputStyles.circle}>
            <Text style={inputStyles.symbol}>+</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export function ScorePicker({
  label,
  value,
  onChange,
  stars = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  stars?: boolean;
}) {
  return (
    <View style={inputStyles.score}>
      <View testID={`${label}-score-header`} style={inputStyles.scoreHeader}>
        <Text style={[styles.text, { flexShrink: 1 }]}>
          {label}
          {stars ? ' *' : ''}
        </Text>
        <View style={inputStyles.scoreControls}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.5} style={inputStyles.scoreValue}>
            {value?.toFixed(1) ?? '—'}
          </Text>
          {!stars && (
            <View style={inputStyles.clearSlot}>
              {value !== null && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label} 선택 해제`}
                  onPress={() => onChange(null)}
                  style={inputStyles.clearSlot}
                >
                  <Text style={styles.muted}>×</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: stars ? 8 : 6, justifyContent: 'space-between' }}>
        {[1, 2, 3, 4, 5].map((score) => (
          <View key={score} style={{ flex: 1, height: 44 }}>
            {stars ? (
              <View pointerEvents="none" style={inputStyles.starBase}>
                <Text allowFontScaling={false} style={inputStyles.starEmpty}>
                  ★
                </Text>
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: `${Math.max(0, Math.min(1, (value ?? 0) - score + 1)) * 100}%`,
                    overflow: 'hidden',
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    style={[inputStyles.starEmpty, { color: colors.green }]}
                  >
                    ★
                  </Text>
                </View>
              </View>
            ) : (
              <View pointerEvents="none" style={inputStyles.segment}>
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: colors.green,
                      width: `${Math.max(0, Math.min(1, (value ?? 0) - score + 1)) * 100}%`,
                    },
                  ]}
                />
                <Text
                  style={{
                    color: (value ?? 0) >= score ? colors.white : colors.ink,
                    fontWeight: '600',
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {score}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', flex: 1 }}>
              {(score === 1 ? [1] : [score - 0.5, score]).map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} ${n.toFixed(1)}점`}
                  accessibilityState={{ selected: value === n }}
                  onPress={() => onChange(n)}
                  style={{ flex: 1, minHeight: 44 }}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 7));
  const [year, m] = month.split('-').map(Number);
  const offset = new Date(year, m - 1, 1).getDay();
  const days = new Date(year, m, 0).getDate();
  const today = localDate();
  function shift(diff: number) {
    setMonth(localDate(new Date(year, m - 1 + diff, 1)).slice(0, 7));
  }
  function choose(date: string) {
    onChange(date);
    setOpen(false);
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.text}>플레이 날짜 *</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`플레이 날짜 ${value}`}
        onPress={() => {
          setMonth(value.slice(0, 7));
          setOpen(true);
        }}
        style={[styles.input, styles.row, { justifyContent: 'space-between' }]}
      >
        <Text style={styles.text}>
          {value.replaceAll('-', '. ')}
          {value === today ? ' · 오늘' : ''}
        </Text>
        <Text style={styles.muted}>⌄</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <View style={inputStyles.backdrop}>
          <View style={inputStyles.calendar} accessibilityViewIsModal>
            <Text style={styles.heading}>플레이 날짜 선택</Text>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 해"
                onPress={() => shift(-12)}
                style={inputStyles.nav}
              >
                <Text>«</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 달"
                onPress={() => shift(-1)}
                style={inputStyles.nav}
              >
                <Text>‹</Text>
              </Pressable>
              <Text style={[styles.text, { fontWeight: '700' }]}>
                {year}년 {m}월
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="다음 달"
                onPress={() => shift(1)}
                style={inputStyles.nav}
              >
                <Text>›</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="다음 해"
                onPress={() => shift(12)}
                style={inputStyles.nav}
              >
                <Text>»</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <Text key={d} style={[styles.muted, inputStyles.day]}>
                  {d}
                </Text>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <View key={`blank-${i}`} style={inputStyles.day} />
              ))}
              {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
                const date = `${month}-${String(day).padStart(2, '0')}`;
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`${date} 선택`}
                    accessibilityState={{ selected: value === date }}
                    onPress={() => choose(date)}
                    style={[
                      inputStyles.day,
                      { borderRadius: 24 },
                      value === date && { backgroundColor: colors.green },
                    ]}
                  >
                    <Text
                      style={{
                        color: value === date ? colors.white : colors.ink,
                        fontWeight: date === today ? '800' : '400',
                      }}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Button secondary title="오늘 선택" onPress={() => choose(today)} />
              <Button secondary title="달력 닫기" onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const inputStyles = StyleSheet.create({
  score: { gap: 8, paddingVertical: 6 },
  scoreHeader: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreControls: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  clearSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scoreValue: {
    width: 52,
    textAlign: 'right',
    fontSize: 18,
    lineHeight: 26,
    includeFontPadding: false,
    fontWeight: '700',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  starBase: { position: 'absolute', top: 0, width: 36, height: 44, alignSelf: 'center' },
  starEmpty: { color: colors.line, fontSize: 32, lineHeight: 44, width: 36, textAlign: 'center' },
  segment: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.light,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  counterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 21, color: colors.muted, lineHeight: 26 },
  counterValue: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 26,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calendar: {
    backgroundColor: colors.white,
    width: '100%',
    maxWidth: 390,
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  nav: { minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: '14.285714%',
    minHeight: 42,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
});
