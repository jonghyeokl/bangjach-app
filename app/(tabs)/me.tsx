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
      title="마이페이지"
      subtitle={user ? `${user.name}님의 발자국을 모아보세요.` : '나의 발자국'}
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
        <Text style={styles.heading}>지금까지 {rows.data?.total ?? '…'}개의 발자국</Text>
        <View style={styles.row}>
          <Button secondary title="캘린더" onPress={() => router.push('/calendar')} />
          <Button secondary title="친구" onPress={() => router.push('/friends')} />
          <Button secondary title="설정 및 로그아웃" onPress={() => router.push('/settings')} />
        </View>
      </View>
      <Text style={styles.heading}>내 리뷰</Text>
      <Feedback loading={rows.loading} error={rows.error} retry={rows.reload} />
      {rows.data?.items.map((r) => (
        <ReviewCard key={r.id} review={r} keywords={meta.data?.review_keyword} />
      ))}
      {rows.data?.total === 0 && (
        <Empty text="아직 기록이 없어요. 플레이한 테마를 검색하고 첫 발자국을 남겨보세요." />
      )}
      {rows.data && <Pager page={page} total={rows.data.total} onChange={setPage} />}
    </>
  );
}
