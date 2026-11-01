import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Empty, Feedback, Guard, Pager, ReviewCard, Screen, styles } from '@/components/ui';
import { useResource } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Enums, Page, Review } from '@/lib/types';

export default function Me() {
  const { user } = useSession();
  return (
    <Screen
      title={user ? `${user.name}님의 방자취` : '나의 방자취'}
      subtitle="한 방, 한 이야기씩 쌓이는 나만의 기록."
    >
      <Guard>
        <Records />
      </Guard>
    </Screen>
  );
}
function Records() {
  const [page, setPage] = useState(1);
  const rows = useResource<Page<Review>>(`/user/v1/me/reviews?page=${page}`);
  const meta = useResource<Enums>('/meta/v1/enums');
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.heading}>지금까지 {rows.data?.total ?? '…'}개의 이야기</Text>
        <View style={styles.row}>
          <Button title="캘린더로 보기" onPress={() => router.push('/calendar')} />
          <Button secondary title="공개 설정" onPress={() => router.push('/settings')} />
        </View>
      </View>
      <Feedback loading={rows.loading} error={rows.error} retry={rows.reload} />
      {rows.data?.items.map((r) => (
        <ReviewCard key={r.id} review={r} keywords={meta.data?.review_keyword} />
      ))}
      {rows.data?.total === 0 && (
        <Empty text="아직 기록이 없어요. 플레이한 테마를 검색하고 첫 방자취를 남겨보세요." />
      )}
      {rows.data && <Pager page={page} total={rows.data.total} onChange={setPage} />}
    </>
  );
}
