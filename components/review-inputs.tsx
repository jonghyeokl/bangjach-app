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
    <View style={{ gap: 12 }}>
      <Text style={styles.text}>{label}</Text>
      <View style={inputStyles.counter}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 줄이기`}
          accessibilityState={{ disabled: value === 0 }}
          disabled={value === 0}
          onPress={() => onChange(value - 1)}
          style={[inputStyles.circle, value === 0 && { opacity: 0.35 }]}
        >
          <Text style={inputStyles.symbol}>−</Text>
        </Pressable>
        <Text accessibilityLabel={`${label} ${value}`} style={inputStyles.counterValue}>
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 늘리기`}
          onPress={() => onChange(value + 1)}
          style={inputStyles.circle}
        >
          <Text style={inputStyles.symbol}>+</Text>
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
  endpoints,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  stars?: boolean;
  endpoints?: [string, string];
}) {
  return (
    <View style={inputStyles.score}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={styles.text}>
          {label}
          {stars ? ' *' : ''}
        </Text>
        <View style={styles.row}>
          <Text style={inputStyles.scoreValue}>
            {value?.toFixed(1) ?? '—'}
            <Text style={styles.muted}> / 5</Text>
          </Text>
          {!stars && value !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label} 선택 해제`}
              onPress={() => onChange(null)}
              style={{ padding: 10 }}
            >
              <Text style={styles.muted}>초기화</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: stars ? 8 : 6, justifyContent: 'space-between' }}>
        {[1, 2, 3, 4, 5].map((score) => (
          <View key={score} style={{ flex: 1, height: 48 }}>
            {stars ? (
              <View pointerEvents="none" style={inputStyles.starBase}>
                <Text style={inputStyles.starEmpty}>★</Text>
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: `${Math.max(0, Math.min(1, (value ?? 0) - score + 1)) * 100}%`,
                    overflow: 'hidden',
                  }}
                >
                  <Text style={[inputStyles.starEmpty, { color: colors.green }]}>★</Text>
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
                  style={{ flex: 1, minHeight: 48 }}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={styles.muted}>{endpoints?.[0] ?? '별을 눌러 선택'}</Text>
        <Text style={styles.muted}>{endpoints?.[1] ?? '0.5점 단위'}</Text>
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
        <Text style={styles.muted}>날짜 선택</Text>
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
  scoreValue: { fontSize: 25, fontWeight: '700', color: colors.green },
  starBase: { position: 'absolute', top: 0, width: 40, height: 48, alignSelf: 'center' },
  starEmpty: { color: colors.line, fontSize: 40, lineHeight: 48, width: 40, textAlign: 'center' },
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
    gap: 28,
    paddingVertical: 8,
  },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 29, color: colors.muted, lineHeight: 34 },
  counterValue: {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 28,
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
