import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Empty, Feedback, Pager, ReviewCard, Screen, styles } from '@/components/ui';
import { FollowButton } from '@/components/social';
import { useResource } from '@/lib/hooks';
import type { Enums, Page, Profile, Review } from '@/lib/types';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const profile = useResource<Profile>(`/user/v1/${id}/profile`);
  const reviews = useResource<Page<Review>>(
    profile.data?.can_view ? `/user/v1/${id}/reviews?page=${page}` : null,
  );
  const meta = useResource<Enums>('/meta/v1/enums');
  return (
    <Screen title={profile.data?.name ?? '프로필'}>
      <Feedback loading={profile.loading} error={profile.error} retry={profile.reload} />
      <Button
        secondary
        title="새로고침"
        onPress={() => {
          profile.reload();
          reviews.reload();
        }}
      />
      {profile.data && (
        <>
          <View style={styles.card}>
            <Text style={styles.muted}>
              {profile.data.is_private ? '비공개 계정' : '공개 계정'}
            </Text>
            <FollowButton
              profile={profile.data}
              onChange={() => {
                profile.reload();
                reviews.reload();
              }}
            />
            {profile.data.can_view && (
              <>
                <Text style={styles.heading}>발자국 {profile.data.review_count}개</Text>
                <View style={styles.row}>
                  <Button
                    secondary
                    title="캘린더"
                    onPress={() => router.push({ pathname: '/calendar', params: { userId: id } })}
                  />
                  {(['followers', 'following'] as const).map((direction, i) => (
                    <Button
                      secondary
                      key={direction}
                      title={`${i === 0 ? '팔로워' : '팔로잉'} ${i === 0 ? profile.data!.follower_count : profile.data!.following_count}`}
                      onPress={() =>
                        router.push({ pathname: '/follows', params: { userId: id, direction } })
                      }
                    />
                  ))}
                </View>
              </>
            )}
          </View>
          {!profile.data.can_view ? (
            <Empty text="팔로우가 승인되면 발자국을 볼 수 있어요." />
          ) : (
            <>
              <Feedback loading={reviews.loading} error={reviews.error} retry={reviews.reload} />
              {reviews.data?.items.map((review) => (
                <ReviewCard key={review.id} review={review} keywords={meta.data?.review_keyword} />
              ))}
              {reviews.data?.total === 0 && <Empty text="아직 남긴 발자국이 없어요." />}
              {reviews.data && <Pager page={page} total={reviews.data.total} onChange={setPage} />}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
