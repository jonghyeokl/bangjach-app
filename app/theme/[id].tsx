import { useState } from 'react';
import { Image, Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Choices,
  Empty,
  Feedback,
  Pager,
  photoUrl,
  ReviewCard,
  Screen,
  scoreText,
  styles,
} from '@/components/ui';
import { peopleOptions } from '@/lib/review-form';
import { query } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Enums, Page, Review, Theme } from '@/lib/types';

export default function ThemeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const theme = useResource<Theme>(`/theme/v1/${id}`);
  const meta = useResource<Enums>('/meta/v1/enums');
  const [selected, setSelected] = useState<number | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const reviews = useResource<Page<Review>>(
    `/review/v1?${query({ theme_id: id, keyword: selected ?? undefined, people_size: people ?? undefined, sort: 'newest', page })}`,
  );
  const chips = useResource<{ items: { keyword: number; label: string; review_count: number }[] }>(
    `/theme/v1/${id}/review-keywords?${query({ people_size: people ?? undefined })}`,
  );
  const own = useResource<Page<Review>>(user ? `/user/v1/me/reviews?theme_id=${id}` : null);
  const ownReview = own.data?.items[0];
  const t = theme.data;
  return (
    <Screen
      title={t?.name ?? '테마 정보'}
      subtitle={t ? `${t.cafe.name} · ${t.length}분` : undefined}
    >
      <Feedback loading={theme.loading} error={theme.error || error} retry={theme.reload} />
      {t && (
        <>
          {t.image_url && (
            <Image
              source={{ uri: photoUrl(t.image_url) }}
              style={{ height: 270, borderRadius: 18, width: '100%' }}
              resizeMode="cover"
            />
          )}
          <View style={styles.card}>
            {!!t.description && <Text style={styles.text}>{t.description}</Text>}
            <Text style={styles.muted}>{t.cafe.address}</Text>
            {[
              t.statistics.normalized_rating,
              t.statistics.avg_difficulty,
              t.statistics.avg_horrorness,
              t.statistics.avg_physicality,
            ].some((v) => v != null) && (
              <View style={styles.row}>
                {[
                  ['보정 평점', t.statistics.normalized_rating],
                  ['난이도', t.statistics.avg_difficulty],
                  ['공포도', t.statistics.avg_horrorness],
                  ['활동성', t.statistics.avg_physicality],
                ]
                  .filter(([, value]) => value != null)
                  .map(([label, value]) => (
                    <View key={String(label)} style={{ padding: 10 }}>
                      <Text style={styles.muted}>{label}</Text>
                      <Text style={styles.heading}>{scoreText(value as number | null)}</Text>
                    </View>
                  ))}
              </View>
            )}
            {!!t.statistics.most_genre_list?.length && (
              <Text style={styles.muted}>
                {(t.statistics.most_genre_list ?? [])
                  .map((g) => meta.data?.genre.find((o) => o.value === g)?.label)
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}
            {!!t.website && (
              <Button
                secondary
                title="카페 홈페이지로 이동 ↗"
                onPress={() => {
                  Linking.openURL(t.website!).catch(() => setError('홈페이지를 열 수 없어요.'));
                }}
              />
            )}
            <Button
              title={ownReview ? '내 리뷰 수정하기' : '이 테마 기록하기'}
              disabled={own.loading}
              onPress={() =>
                user
                  ? router.push({
                      pathname: '/review',
                      params: { themeId: id, ...(ownReview ? { reviewId: ownReview.id } : {}) },
                    })
                  : router.push('/login')
              }
            />
          </View>
        </>
      )}
      <Text style={styles.heading}>플레이어들의 기록</Text>
      <Choices
        options={
          chips.data?.items.map((k) => ({
            value: k.keyword,
            label: `${k.label} ${k.review_count}`,
          })) ?? []
        }
        selected={selected == null ? [] : [selected]}
        onChange={(v) => {
          setSelected(selected === v ? null : v);
          setPage(1);
        }}
      />
      <Text style={styles.text}>플레이 인원</Text>
      <Choices
        options={[{ value: 0, label: '전체' }, ...peopleOptions]}
        selected={[people ?? 0]}
        onChange={(v) => {
          setPeople(v || null);
          setPage(1);
        }}
      />
      <Feedback
        loading={reviews.loading}
        error={reviews.error || chips.error}
        retry={() => {
          reviews.reload();
          chips.reload();
        }}
      />
      {reviews.data?.items.map((r) => (
        <ReviewCard key={r.id} review={r} keywords={meta.data?.review_keyword} />
      ))}
      {reviews.data?.total === 0 && (
        <Empty text="아직 이 조건의 리뷰가 없어요. 첫 기록을 남겨보세요." />
      )}
      {reviews.data && <Pager page={page} total={reviews.data.total} onChange={setPage} />}
    </Screen>
  );
}
