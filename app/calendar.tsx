import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Button,
  colors,
  Empty,
  Feedback,
  Field,
  Guard,
  Pager,
  Screen,
  styles,
} from '@/components/ui';
import { useResource } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { CalendarData, Friend, Page } from '@/lib/types';

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export default function CalendarScreen() {
  const { user } = useSession();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const initialTarget = userId ?? user?.id ?? '';
  return (
    <Screen title="기억을 모은 달력" subtitle="그날 남긴 발자국을 다시 돌아보세요.">
      <Guard>
        <Calendar key={`${user?.id}:${initialTarget}`} initialTarget={initialTarget} />
      </Guard>
    </Screen>
  );
}
function Calendar({ initialTarget }: { initialTarget: string }) {
  const { user } = useSession();
  const [target, setTarget] = useState(initialTarget);
  const [month, setMonth] = useState(thisMonth());
  const [input, setInput] = useState(month);
  const [day, setDay] = useState<number | null>(null);
  const [friendPage, setFriendPage] = useState(1);
  const friends = useResource<Page<Friend>>(`/friend/v1?page=${friendPage}`);
  const data = useResource<CalendarData>(`/user/v1/${target}/calendar?month=${month}`);
  const [year, m] = month.split('-').map(Number);
  const valid = year >= 1 && year <= 9999 && m >= 1 && m <= 12;
  const count = valid ? new Date(year, m, 0).getDate() : 0;
  const offset = valid ? new Date(year, m - 1, 1).getDay() : 0;
  function shift(diff: number) {
    if (!valid) return;
    const d = new Date(year, m - 1 + diff, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setMonth(next);
    setInput(next);
    setDay(null);
  }
  const items =
    data.data?.items.filter((item) => day === null || Number(item.date.slice(-2)) === day) ?? [];
  return (
    <>
      <View style={styles.row}>
        <Button
          title="내 캘린더"
          secondary={target !== user!.id}
          onPress={() => {
            setTarget(user!.id);
            setDay(null);
          }}
        />
        {friends.data?.items.map((f) => (
          <Button
            key={f.id}
            title={f.friend.name}
            secondary={target !== f.friend.id}
            onPress={() => {
              setTarget(f.friend.id);
              setDay(null);
            }}
          />
        ))}
      </View>
      <Pager page={friendPage} total={friends.data?.total ?? 0} onChange={setFriendPage} />
      <View style={styles.card}>
        <View style={styles.row}>
          <Button secondary title="← 지난달" onPress={() => shift(-1)} />
          <Text style={[styles.heading, { flex: 1, textAlign: 'center' }]}>{month}</Text>
          <Button secondary title="다음달 →" onPress={() => shift(1)} />
        </View>
        <Field
          label="월 바로가기"
          placeholder="YYYY-MM"
          value={input}
          onChangeText={setInput}
          maxLength={7}
        />
        <Button
          secondary
          title="이 달 보기"
          onPress={() => {
            setMonth(input);
            setDay(null);
          }}
        />
        <Feedback
          loading={data.loading}
          error={data.error || friends.error}
          retry={() => {
            data.reload();
            friends.reload();
          }}
        />
        {data.data && (
          <>
            <Text style={styles.muted}>
              {data.data.user.name}님의 기록 · {data.data.items.length}개
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
                <Text
                  key={label}
                  style={[
                    styles.muted,
                    { width: '14.285%', textAlign: 'center', paddingVertical: 10 },
                  ]}
                >
                  {label}
                </Text>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <View key={`empty${i}`} style={{ width: '14.285%' }} />
              ))}
              {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
                const entries = data.data!.items.filter(
                  (item) => Number(item.date.slice(-2)) === n,
                );
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`${n}일, 기록 ${entries.length}개`}
                    onPress={() => setDay(day === n ? null : n)}
                    style={{
                      width: '14.285%',
                      minHeight: 64,
                      alignItems: 'center',
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: day === n ? colors.light : 'transparent',
                    }}
                  >
                    <Text style={styles.text}>{n}</Text>
                    {entries.length > 0 && (
                      <Text style={{ color: colors.green, fontSize: 12 }}>● {entries.length}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>
      {day !== null && (
        <Button secondary title={`${day}일 선택 해제 · 전체 기록`} onPress={() => setDay(null)} />
      )}
      {items.map((r) => (
        <Pressable
          accessibilityRole="button"
          key={r.review_id}
          style={styles.card}
          onPress={() => router.push({ pathname: '/theme/[id]', params: { id: r.theme_id } })}
        >
          <Text style={styles.muted}>
            {r.date} · {r.cafe_name}
          </Text>
          <Text style={styles.heading}>{r.theme_name}</Text>
          <Text style={styles.text}>
            ★ {r.rating.toFixed(1)}
            {r.is_success !== null ? ` · ${r.is_success ? '탈출 성공' : '탈출 실패'}` : ''}
          </Text>
        </Pressable>
      ))}
      {data.data && !items.length && <Empty text="선택한 날짜에 아직 기록이 없어요." />}
    </>
  );
}
