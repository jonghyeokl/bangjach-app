import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Choices,
  Empty,
  Feedback,
  Field,
  Pager,
  Screen,
  styles,
  ThemeCard,
} from '@/components/ui';
import { query } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Enums, Page, PublicUser, Theme } from '@/lib/types';

const toggle = (values: number[], v: number) =>
  values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
export default function Explore() {
  const { user } = useSession();
  const meta = useResource<Enums>('/meta/v1/enums');
  const [q, setQ] = useState('');
  const [regions, setRegions] = useState<number[]>([]);
  const [genres, setGenres] = useState<number[]>([]);
  const [advanced, setAdvanced] = useState(false);
  const [exclude, setExclude] = useState(false);
  const [sort, setSort] = useState('newest');
  const [order, setOrder] = useState('desc');
  const [ranges, setRanges] = useState<Record<string, string>>({});
  const [partyText, setPartyText] = useState('');
  const [partyQ, setPartyQ] = useState('');
  const [party, setParty] = useState<PublicUser[]>([]);
  const people = useResource<Page<PublicUser>>(
    user && partyQ ? `/user/v1/search?${query({ q: partyQ, purpose: 'party' })}` : null,
  );
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState('');
  const themes = useResource<Page<Theme>>(`/theme/v1?${filters}&page=${page}`);
  function search() {
    setFilters(
      query({
        q,
        region: regions,
        genre: genres,
        sort,
        order,
        exclude_played: exclude,
        party_user_id: exclude ? party.map((p) => p.id) : [],
        ...ranges,
      }),
    );
    setPage(1);
  }
  return (
    <Screen title="다음 발자국을 남기세요" subtitle="함께 풀고, 오래 기억할 방탈출 테마.">
      <View style={styles.card}>
        <Field
          label="테마 또는 카페"
          placeholder="어떤 테마를 찾고 있나요?"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <Choices
          options={meta.data?.region ?? []}
          selected={regions}
          onChange={(v) => setRegions(toggle(regions, v))}
        />
        <View style={styles.row}>
          <Button title="테마 찾기" onPress={search} />
          <Button
            secondary
            title={advanced ? '필터 접기' : '장르 · 점수 · 일행 필터'}
            onPress={() => setAdvanced(!advanced)}
          />
        </View>
        {advanced && (
          <View style={{ gap: 15 }}>
            <Text style={styles.heading}>어떤 장르를 좋아하나요?</Text>
            <Choices
              options={meta.data?.genre ?? []}
              selected={genres}
              onChange={(v) => setGenres(toggle(genres, v))}
            />
            <Text style={styles.heading}>난이도와 플레이 스타일</Text>
            {[
              ['difficulty', '난이도'],
              ['horrorness', '공포도'],
              ['physicality', '활동성'],
            ].map(([key, label]) => (
              <View key={key} style={styles.row}>
                {['min', 'max'].map((bound) => (
                  <View key={bound} style={{ flex: 1, minWidth: 110 }}>
                    <Field
                      label={`${label} ${bound === 'min' ? '최소' : '최대'}`}
                      placeholder="1~5 (0.5 간격)"
                      keyboardType="decimal-pad"
                      value={ranges[`${key}_${bound}`] ?? ''}
                      onChangeText={(v) => setRanges({ ...ranges, [`${key}_${bound}`]: v })}
                    />
                  </View>
                ))}
              </View>
            ))}
            <Text style={styles.heading}>정렬</Text>
            <View style={styles.row}>
              {[
                ['newest', '최신'],
                ['rating', '보정 평점'],
                ['difficulty', '난이도'],
                ['horrorness', '공포도'],
                ['physicality', '활동성'],
              ].map(([key, label]) => (
                <Button
                  key={key}
                  title={label}
                  secondary={sort !== key}
                  onPress={() => setSort(key)}
                />
              ))}
              <Button
                secondary
                title={order === 'desc' ? '높은 순 ↓' : '낮은 순 ↑'}
                onPress={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
              />
            </View>
            <Button
              secondary={!exclude}
              title={exclude ? '✓ 나와 일행이 안 한 테마만' : '나와 일행이 안 한 테마만'}
              onPress={() => (user ? setExclude(!exclude) : router.push('/login'))}
            />
            {exclude && (
              <>
                <Field
                  label="일행 닉네임"
                  value={partyText}
                  onChangeText={setPartyText}
                  onSubmitEditing={() => setPartyQ(partyText)}
                />
                <Button secondary title="일행 검색" onPress={() => setPartyQ(partyText)} />
                <Feedback loading={people.loading} error={people.error} />
                {people.data?.items
                  .filter((p) => !party.some((x) => x.id === p.id))
                  .map((p) => (
                    <Button
                      secondary
                      key={p.id}
                      title={`${p.name} 추가`}
                      onPress={() => setParty([...party, p])}
                    />
                  ))}
                {people.data?.total === 0 && (
                  <Text style={styles.muted}>공개 범위가 허용된 사용자가 없어요.</Text>
                )}
                <View style={styles.row}>
                  {party.map((p) => (
                    <Button
                      key={p.id}
                      title={`${p.name} ×`}
                      onPress={() => setParty(party.filter((x) => x.id !== p.id))}
                      secondary
                    />
                  ))}
                </View>
              </>
            )}
            <Button title="필터 적용" onPress={search} />
            <Button
              secondary
              title="필터 초기화"
              onPress={() => {
                setRegions([]);
                setGenres([]);
                setRanges({});
                setExclude(false);
                setParty([]);
                setSort('newest');
                setOrder('desc');
                setQ('');
                setFilters('');
                setPage(1);
              }}
            />
          </View>
        )}
      </View>
      <Feedback
        loading={themes.loading || meta.loading}
        error={themes.error || meta.error}
        retry={() => {
          themes.reload();
          meta.reload();
        }}
      />
      {themes.data && (
        <>
          <Text style={styles.muted}>
            테마 {themes.data.total}개 · 집계 점수는 항목별 3명부터 표시돼요.
          </Text>
          {themes.data.items.map((t) => (
            <ThemeCard key={t.id} theme={t} />
          ))}
          {!themes.data.total && (
            <Empty text="조건에 맞는 테마가 없어요. 필터를 조금 줄여보세요." />
          )}
          <Pager page={page} total={themes.data.total} onChange={setPage} />
        </>
      )}
    </Screen>
  );
}
