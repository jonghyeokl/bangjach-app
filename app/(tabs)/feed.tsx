import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  ReviewPhotos,
  Button,
  colors,
  Empty,
  Feedback,
  Pager,
  photoUrl,
  Screen,
  styles,
} from '@/components/ui';
import { useResource } from '@/lib/hooks';
import type { Page, Review } from '@/lib/types';

export default function Feed() {
  const [page, setPage] = useState(1);
  const rows = useResource<Page<Review>>(`/feed/v1?page=${page}`);
  return (
    <Screen title="피드" subtitle="친구들이 남긴 발자국을 최신순으로 만나보세요.">
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={styles.muted}>리뷰 작성일 최신순</Text>
        <Button
          secondary
          title="새로고침"
          disabled={rows.loading}
          onPress={() => {
            setPage(1);
            rows.reload();
          }}
        />
      </View>
      <Feedback loading={rows.loading} error={rows.error} retry={rows.reload} />
      {rows.data?.items.map((review) => (
        <View key={review.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.heading, { flex: 1 }]}>{review.author.name}</Text>
            <Text style={styles.heading}>★ {review.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.muted}>
            {new Date(review.created_dt).toLocaleString('ko-KR')} 작성
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${review.theme_name} 테마 상세 보기`}
            onPress={() =>
              router.push({ pathname: '/theme/[id]', params: { id: review.theme_id } })
            }
            style={{ gap: 10 }}
          >
            {review.theme_image_url ? (
              <Image
                source={{ uri: photoUrl(review.theme_image_url) }}
                accessibilityLabel={`${review.theme_name} 테마 사진`}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: 12,
                  backgroundColor: colors.light,
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  height: 100,
                  borderRadius: 12,
                  backgroundColor: colors.light,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={styles.muted}>테마 사진 준비 중</Text>
              </View>
            )}
            <Text style={styles.heading}>{review.theme_name}</Text>
            <Text style={styles.muted}>
              {review.cafe_name} · {review.date} 플레이
            </Text>
          </Pressable>
          <ReviewPhotos photos={review.photos ?? []} />
          {!!review.content && <Text style={styles.text}>{review.content}</Text>}
        </View>
      ))}
      {rows.data?.total === 0 && (
        <Empty text="아직 친구들의 리뷰가 없어요. 친구를 추가하면 친구가 남긴 발자국이 여기에 모여요." />
      )}
      {rows.data && <Pager page={page} total={rows.data.total} onChange={setPage} />}
    </Screen>
  );
}
