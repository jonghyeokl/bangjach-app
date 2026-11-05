import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Choices,
  colors,
  Empty,
  Feedback,
  Field,
  Pager,
  Screen,
  styles,
  ThemeCard,
} from '@/components/ui';
import { FilterChip, FilterSheet, RegionPicker } from '@/components/search-controls';
import { query } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Enums, Page, PublicUser, Theme } from '@/lib/types';

type Filters = {
  q: string;
  region: number | null;
  subregions: number[];
  genres: number[];
  ranges: Record<string, string>;
  exclude: boolean;
  party: PublicUser[];
  sort: string;
  order: string;
};
const initial: Filters = {
  q: '',
  region: null,
  subregions: [],
  genres: [],
  ranges: {},
  exclude: false,
  party: [],
  sort: 'rating',
  order: 'desc',
};
const sorts = [
  ['rating', 'desc', '평점 높은 순'],
  ['newest', 'desc', '최신 등록순'],
  ['difficulty', 'desc', '난이도 높은 순'],
  ['difficulty', 'asc', '난이도 낮은 순'],
  ['horrorness', 'desc', '공포도 높은 순'],
  ['horrorness', 'asc', '공포도 낮은 순'],
  ['physicality', 'desc', '활동성 높은 순'],
  ['physicality', 'asc', '활동성 낮은 순'],
];
export default function Explore() {
  const { user } = useSession();
  const meta = useResource<Enums>('/meta/v1/enums');
  const [filters, setFilters] = useState<Filters>(initial);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<'region' | 'details' | 'sort' | 'party' | null>(null);
  const [draftRegion, setDraftRegion] = useState<number | null>(null);
  const [draftAreas, setDraftAreas] = useState<number[]>([]);
  const [draftGenres, setDraftGenres] = useState<number[]>([]);
  const [draftRanges, setDraftRanges] = useState<Record<string, string>>({});
  const [rangeError, setRangeError] = useState('');
  const [partyText, setPartyText] = useState('');
  const [partyQ, setPartyQ] = useState('');
  const [partyPage, setPartyPage] = useState(1);
  const people = useResource<Page<PublicUser>>(
    user && sheet === 'party' && partyQ
      ? `/user/v1/search?${query({ q: partyQ, purpose: 'party', page: partyPage })}`
      : null,
  );
  const themes = useResource<Page<Theme>>(
    `/theme/v1?${query({
      q: filters.q,
      region: filters.region ? [filters.region] : [],
      subregion: filters.subregions,
      genre: filters.genres,
      sort: filters.sort,
      order: filters.order,
      exclude_played: filters.exclude,
      party_user_id: filters.exclude ? filters.party.map((p) => p.id) : [],
      ...filters.ranges,
      page,
    })}`,
  );
  function apply(next: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  }
  function searchFollowing() {
    setPartyQ(partyText.trim());
    setPartyPage(1);
    people.reload();
  }
  function applyDetails() {
    for (const key of ['difficulty', 'horrorness', 'physicality']) {
      const min = draftRanges[`${key}_min`],
        max = draftRanges[`${key}_max`];
      if (
        [min, max].some(
          (v) =>
            v &&
            (!Number.isFinite(Number(v)) ||
              Number(v) < 1 ||
              Number(v) > 5 ||
              (Number(v) * 2) % 1 !== 0),
        ) ||
        (min && max && Number(min) > Number(max))
      ) {
        setRangeError(
          '점수는 1~5 사이, 0.5 간격으로 입력하고 최소값은 최대값 이하로 설정해주세요.',
        );
        return;
      }
    }
    apply({ genres: draftGenres, ranges: draftRanges });
    setSheet(null);
  }
  const regionName = meta.data?.region.find((r) => r.value === filters.region)?.label ?? '전국';
  const areaName = meta.data?.subregion.find((r) => r.value === filters.subregions[0])?.label;
  const regionLabel = areaName
    ? `${areaName}${filters.subregions.length > 1 ? ` 외 ${filters.subregions.length - 1}` : ''}`
    : regionName;
  const sortLabel = sorts.find(
    ([key, order]) => key === filters.sort && order === filters.order,
  )?.[2];
  const detailCount = filters.genres.length + Object.values(filters.ranges).filter(Boolean).length;
  return (
    <Screen title="테마 검색" compact>
      <View style={searchStyles.searchRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`지역 선택: ${regionLabel}`}
          onPress={() => {
            setDraftRegion(filters.region);
            setDraftAreas(filters.subregions);
            setSheet('region');
          }}
          style={searchStyles.region}
        >
          <Text style={searchStyles.regionText} numberOfLines={1}>
            {regionLabel}
          </Text>
          <Text style={styles.muted}>⌄</Text>
        </Pressable>
        <View style={searchStyles.searchBox}>
          <TextInput
            accessibilityLabel="테마 또는 카페"
            placeholder="테마 · 카페 검색"
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => apply({ q: q.trim() })}
            returnKeyType="search"
            style={searchStyles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="검색"
            onPress={() => apply({ q: q.trim() })}
            style={searchStyles.searchButton}
          >
            <Text style={{ color: colors.green, fontWeight: '700', fontSize: 14 }}>검색</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8 }}
      >
        <FilterChip
          label="안 한 테마"
          active={filters.exclude}
          onPress={() => (user ? apply({ exclude: !filters.exclude }) : router.push('/login'))}
        />
        <FilterChip
          label={`상세 필터${detailCount ? ` · ${detailCount}` : ''}`}
          accessibilityLabel="상세 필터"
          active={!!detailCount}
          onPress={() => {
            setDraftGenres(filters.genres);
            setDraftRanges(filters.ranges);
            setRangeError('');
            setSheet('details');
          }}
        />
        {filters.exclude && (
          <FilterChip
            label={`일행${filters.party.length ? ` · ${filters.party.length}` : ''}`}
            accessibilityLabel="일행 선택"
            active={!!filters.party.length}
            onPress={() => setSheet('party')}
          />
        )}
      </ScrollView>
      <View style={searchStyles.resultBar}>
        <Text style={styles.heading}>테마</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="정렬 선택"
          onPress={() => setSheet('sort')}
          style={searchStyles.sort}
        >
          <Text style={styles.muted}>{sortLabel} ⌄</Text>
        </Pressable>
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
        <View style={{ gap: 0 }}>
          {themes.data.items.map((t) => (
            <ThemeCard compact key={t.id} theme={t} />
          ))}
          {!themes.data.total && <Empty text="조건에 맞는 테마가 없어요." />}
          <Pager page={page} total={themes.data.total} onChange={setPage} />
        </View>
      )}

      <FilterSheet
        title="지역 선택"
        visible={sheet === 'region'}
        onClose={() => setSheet(null)}
        footer={
          <Button
            title="지역 적용"
            onPress={() => {
              apply({ region: draftRegion, subregions: draftAreas });
              setSheet(null);
            }}
          />
        }
      >
        <Feedback loading={meta.loading} error={meta.error} retry={meta.reload} />
        <RegionPicker
          meta={meta.data}
          region={draftRegion}
          subregions={draftAreas}
          onChange={(region, areas) => {
            setDraftRegion(region);
            setDraftAreas(areas);
          }}
        />
      </FilterSheet>
      <FilterSheet
        title="상세 필터"
        visible={sheet === 'details'}
        onClose={() => setSheet(null)}
        footer={
          <>
            <Button title="필터 적용" onPress={applyDetails} />
            <Button
              secondary
              title="필터 초기화"
              onPress={() => {
                setDraftGenres([]);
                setDraftRanges({});
                setRangeError('');
              }}
            />
          </>
        }
      >
        <Text style={styles.heading}>장르</Text>
        <Choices
          options={meta.data?.genre ?? []}
          selected={draftGenres}
          onChange={(v) =>
            setDraftGenres(
              draftGenres.includes(v) ? draftGenres.filter((x) => x !== v) : [...draftGenres, v],
            )
          }
        />
        {(
          [
            ['difficulty', '난이도'],
            ['horrorness', '공포도'],
            ['physicality', '활동성'],
          ] as const
        ).map(([key, label]) => (
          <View key={key} style={styles.row}>
            {['min', 'max'].map((bound) => (
              <View key={bound} style={{ flex: 1 }}>
                <Field
                  label={`${label} ${bound === 'min' ? '최소' : '최대'}`}
                  placeholder="1~5"
                  keyboardType="decimal-pad"
                  value={draftRanges[`${key}_${bound}`] ?? ''}
                  onChangeText={(v) => setDraftRanges({ ...draftRanges, [`${key}_${bound}`]: v })}
                />
              </View>
            ))}
          </View>
        ))}
        <Feedback error={rangeError} />
      </FilterSheet>
      <FilterSheet title="정렬" visible={sheet === 'sort'} onClose={() => setSheet(null)}>
        {sorts.map(([sort, order, label]) => (
          <Button
            key={`${sort}-${order}`}
            title={label}
            secondary={filters.sort !== sort || filters.order !== order}
            onPress={() => {
              apply({ sort, order });
              setSheet(null);
            }}
          />
        ))}
      </FilterSheet>
      <FilterSheet
        title="일행 선택"
        visible={sheet === 'party'}
        onClose={() => setSheet(null)}
        footer={<Button title="완료" onPress={() => setSheet(null)} />}
      >
        <Field
          label="일행으로 추가할 팔로잉 검색"
          placeholder="팔로잉 닉네임"
          value={partyText}
          onChangeText={setPartyText}
          onSubmitEditing={searchFollowing}
          returnKeyType="search"
          maxLength={30}
        />
        <Button secondary title="팔로잉 검색" onPress={searchFollowing} />
        <View style={styles.row}>
          {filters.party.map((p) => (
            <Button
              secondary
              key={p.id}
              title={`${p.name} ×`}
              onPress={() => apply({ party: filters.party.filter((x) => x.id !== p.id) })}
            />
          ))}
        </View>
        <Feedback loading={people.loading} error={people.error} />
        {people.data?.items
          .filter((p) => !filters.party.some((x) => x.id === p.id))
          .map((p) => (
            <Button
              secondary
              key={p.id}
              title={`${p.name} 추가`}
              disabled={filters.party.length >= 20}
              onPress={() => apply({ party: [...filters.party, p] })}
            />
          ))}
        {people.data?.total === 0 && <Text style={styles.muted}>검색 결과가 없어요.</Text>}
        {people.data && (
          <Pager page={partyPage} total={people.data.total} onChange={setPartyPage} />
        )}
      </FilterSheet>
    </Screen>
  );
}
const searchStyles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  region: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, maxWidth: '36%' },
  regionText: { color: colors.ink, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.light,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 13,
    color: colors.ink,
    fontSize: 15,
  },
  searchButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  resultBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sort: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
});
