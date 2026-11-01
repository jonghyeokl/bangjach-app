import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Choices, Feedback, Field, Guard, Screen, styles } from '@/components/ui';
import { api, json } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import type { Enums, Review, Theme } from '@/lib/types';

const scores = Array.from({ length: 9 }, (_, i) => ({
  value: 1 + i * 0.5,
  label: (1 + i * 0.5).toFixed(1),
}));
const fields = ['difficulty', 'horrorness', 'physicality'] as const;
export default function ReviewEditor() {
  return (
    <Screen title="오늘의 방자취" subtitle="평점과 플레이 날짜를 남기면 기록이 시작돼요.">
      <Guard>
        <Editor />
      </Guard>
    </Screen>
  );
}
function Editor() {
  const { themeId, reviewId } = useLocalSearchParams<{ themeId: string; reviewId?: string }>();
  const existing = useResource<Review>(reviewId ? `/review/v1/${reviewId}` : null);
  const theme = useResource<Theme>(`/theme/v1/${themeId}`);
  const meta = useResource<Enums>('/meta/v1/enums');
  const [rating, setRating] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [genre, setGenre] = useState<number[]>([]);
  const [success, setSuccess] = useState<number | null>(null);
  const [numbers, setNumbers] = useState({ people_size: '', hint_count: '', played_time: '' });
  const [details, setDetails] = useState<Record<(typeof fields)[number], number | null>>({
    difficulty: null,
    horrorness: null,
    physicality: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const r = existing.data;
    if (!r) return;
    setRating(r.rating);
    setDate(r.date);
    setContent(r.content ?? '');
    setGenre(r.genre_list);
    setSuccess(r.is_success === null ? null : Number(r.is_success));
    setNumbers({
      people_size: r.people_size?.toString() ?? '',
      hint_count: r.hint_count?.toString() ?? '',
      played_time: r.played_time?.toString() ?? '',
    });
    setDetails({ difficulty: r.difficulty, horrorness: r.horrorness, physicality: r.physicality });
  }, [existing.data]);
  async function save() {
    if (rating === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('평점과 플레이 날짜(YYYY-MM-DD)를 입력해주세요.');
      return;
    }
    if (Object.values(numbers).some((v) => v !== '' && !/^\d+$/.test(v))) {
      setError('인원·힌트·시간은 정수로 입력해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      rating,
      date,
      content: content.trim() || null,
      genre_list: genre,
      is_success: success === null ? null : Boolean(success),
      ...details,
      ...Object.fromEntries(
        Object.entries(numbers).map(([k, v]) => [k, v === '' ? null : Number(v)]),
      ),
    };
    try {
      await api<Review>(
        reviewId ? `/review/v1/${reviewId}` : '/review/v1',
        json(reviewId ? 'PATCH' : 'POST', reviewId ? payload : { ...payload, theme_id: themeId }),
      );
      router.replace('/me');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api(`/review/v1/${reviewId}`, json('DELETE'));
      router.replace('/me');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (reviewId && !existing.data)
    return <Feedback loading={existing.loading} error={existing.error} retry={existing.reload} />;
  return (
    <>
      <Feedback
        loading={theme.loading}
        error={theme.error || meta.error}
        retry={() => {
          theme.reload();
          meta.reload();
        }}
      />
      <View style={styles.card}>
        <Text style={styles.heading}>{theme.data?.name}</Text>
        <Text style={styles.text}>평점 *</Text>
        <Choices options={scores} selected={rating === null ? [] : [rating]} onChange={setRating} />
        <Field
          label="플레이 날짜 *"
          placeholder="2026-11-02"
          value={date}
          onChangeText={setDate}
          maxLength={10}
          autoCapitalize="none"
        />
        <Text style={styles.muted}>리뷰는 항상 공개되며 날짜는 캘린더에도 표시돼요.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>조금 더 자세히</Text>
        <Text style={styles.text}>장르 · 여러 개 선택할 수 있어요</Text>
        <Choices
          options={meta.data?.genre ?? []}
          selected={genre}
          onChange={(v) =>
            setGenre(genre.includes(v) ? genre.filter((g) => g !== v) : [...genre, v])
          }
        />
        {fields.map((field, i) => (
          <View key={field} style={{ gap: 8 }}>
            <Text style={styles.text}>{['난이도', '공포도', '활동성'][i]}</Text>
            <Choices
              options={[{ value: 0, label: '미입력' }, ...scores]}
              selected={[details[field] ?? 0]}
              onChange={(v) => setDetails({ ...details, [field]: v || null })}
            />
          </View>
        ))}
        <Text style={styles.text}>탈출 결과</Text>
        <Choices
          options={[
            { value: -1, label: '미입력' },
            { value: 1, label: '성공' },
            { value: 0, label: '실패' },
          ]}
          selected={[success ?? -1]}
          onChange={(v) => setSuccess(v === -1 ? null : v)}
        />
        {(['people_size', 'hint_count', 'played_time'] as const).map((key, i) => (
          <Field
            key={key}
            label={['플레이 인원', '힌트 수', '실제 플레이 시간 (초)'][i]}
            placeholder="선택 입력"
            keyboardType="number-pad"
            value={numbers[key]}
            onChangeText={(v) => setNumbers({ ...numbers, [key]: v })}
          />
        ))}
        <Field
          label="이야기를 남겨주세요"
          placeholder="스포일러 없이, 기억에 남은 순간은 어땠나요?"
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={5000}
        />
        <Text style={styles.muted}>리뷰 내용에서 정해진 주제 키워드를 자동으로 찾아요.</Text>
      </View>
      <Feedback error={error} />
      <Button
        title={busy ? '기록을 저장하고 있어요…' : reviewId ? '수정한 기록 저장' : '방자취 남기기'}
        disabled={busy || !theme.data}
        onPress={save}
      />
      {reviewId && (
        <View style={styles.card}>
          {confirmDelete ? (
            <>
              <Text style={styles.text}>
                리뷰를 삭제하면 플레이 완료 기록과 캘린더에서도 사라져요.
              </Text>
              <Button title="리뷰 삭제 확정" disabled={busy} onPress={remove} />
              <Button secondary title="취소" onPress={() => setConfirmDelete(false)} />
            </>
          ) : (
            <Button
              secondary
              title="이 리뷰 삭제"
              disabled={busy}
              onPress={() => setConfirmDelete(true)}
            />
          )}
        </View>
      )}
    </>
  );
}
