import { ReviewImage } from '@/components/review-image';
import { useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Choices, Feedback, Field, Guard, Screen, styles } from '@/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { Counter, DatePicker, ScorePicker } from '@/components/review-inputs';
import { elapsedSeconds, localDate, peopleOptions } from '@/lib/review-form';
import { api, json } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import type { Enums, Photo, Review, Theme } from '@/lib/types';

const fields = ['difficulty', 'horrorness', 'physicality'] as const;
export default function ReviewEditor() {
  return (
    <Screen title="오늘의 발자국">
      <Guard>
        <Editor />
      </Guard>
    </Screen>
  );
}
function Editor() {
  const { themeId, reviewId } = useLocalSearchParams<{ themeId: string; reviewId?: string }>();
  const theme = useResource<Theme>(`/theme/v1/${themeId}`);
  const existing = useResource<Review>(reviewId ? `/review/v1/${reviewId}` : null);
  if (!theme.data || (reviewId && !existing.data))
    return (
      <Feedback
        loading={theme.loading || existing.loading}
        error={theme.error || existing.error}
        retry={() => {
          theme.reload();
          existing.reload();
        }}
      />
    );
  return (
    <ReviewForm
      key={reviewId ?? themeId}
      theme={theme.data}
      reviewId={reviewId}
      initial={existing.data}
    />
  );
}
function ReviewForm({
  theme,
  reviewId,
  initial,
}: {
  theme: Theme;
  reviewId?: string;
  initial: Review | null;
}) {
  const themeId = theme.id;
  const meta = useResource<Enums>('/meta/v1/enums');
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [date, setDate] = useState(initial?.date ?? localDate());
  const [content, setContent] = useState(initial?.content ?? '');
  const [genre, setGenre] = useState<number[]>(initial?.genre_list ?? []);
  const [success, setSuccess] = useState(initial?.is_success === false ? 0 : 1);
  const [people, setPeople] = useState<number | null>(
    initial?.people_size ? Math.min(5, initial.people_size) : null,
  );
  const [hints, setHints] = useState(initial?.hint_count ?? 0);
  const initialRemaining =
    initial?.played_time == null ? null : theme.length * 60 - initial.played_time;
  const [remainingMinutes, setRemainingMinutes] = useState(
    initialRemaining == null ? '' : String(Math.floor(initialRemaining / 60)),
  );
  const [remainingSeconds, setRemainingSeconds] = useState(
    initialRemaining == null ? '' : String(initialRemaining % 60),
  );
  let playedTime: number | null = null;
  let timeError = '';
  try {
    playedTime = elapsedSeconds(theme.length, remainingMinutes, remainingSeconds);
  } catch (e) {
    timeError = (e as Error).message;
  }
  const [details, setDetails] = useState<Record<(typeof fields)[number], number | null>>({
    difficulty: initial?.difficulty ?? null,
    horrorness: initial?.horrorness ?? null,
    physicality: initial?.physicality ?? null,
  });
  const [photos, setPhotos] = useState<(Photo & { preview?: string })[]>(initial?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  async function pickPhotos() {
    setError('');
    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        allowsMultipleSelection: true,
        selectionLimit: 5 - photos.length,
        quality: 0.8,
      });
      if (result.canceled) return;
      for (const asset of result.assets.slice(0, 5 - photos.length)) {
        const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
        if (blob.size > 8 * 1024 * 1024) throw new Error('사진 한 장은 8MB 이하여야 합니다.');
        const photo = await api<Photo>('/media/v1/review-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: blob,
        });
        setPhotos((current) => [...current, { ...photo, preview: asset.uri }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  function returnToPrevious() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/theme/[id]', params: { id: themeId } });
  }
  async function save() {
    if (rating === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('평점과 플레이 날짜를 선택해주세요.');
      return;
    }
    if (timeError) {
      setError(timeError);
      return;
    }
    setBusy(true);
    setError('');
    const payload = {
      photo_ids: photos.map((p) => p.id),
      rating,
      date,
      content: content.trim() || null,
      genre_list: genre,
      is_success: Boolean(success),
      ...details,
      people_size: people,
      hint_count: hints,
      played_time: playedTime,
    };
    try {
      await api<Review>(
        reviewId ? `/review/v1/${reviewId}` : '/review/v1',
        json(reviewId ? 'PATCH' : 'POST', reviewId ? payload : { ...payload, theme_id: themeId }),
      );
      returnToPrevious();
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
      returnToPrevious();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Feedback error={meta.error} retry={meta.reload} />
      <View style={styles.card}>
        <Text style={styles.heading}>{theme.name}</Text>
        <ScorePicker label="평점" value={rating} onChange={setRating} stars />
        <DatePicker value={date} onChange={setDate} />
      </View>
      <View style={styles.card}>
        <Text style={styles.text}>장르</Text>
        <Choices
          options={meta.data?.genre ?? []}
          selected={genre}
          onChange={(v) =>
            setGenre(genre.includes(v) ? genre.filter((g) => g !== v) : [...genre, v])
          }
        />
        {fields.map((field, i) => (
          <ScorePicker
            key={field}
            label={['난이도', '공포도', '활동성'][i]}
            value={details[field]}
            onChange={(v) => setDetails({ ...details, [field]: v })}
          />
        ))}
        <Text style={styles.text}>탈출 결과</Text>
        <Choices
          options={[
            { value: 1, label: '성공' },
            { value: 0, label: '실패' },
          ]}
          selected={[success]}
          onChange={setSuccess}
        />
        <Text style={styles.text}>플레이 인원</Text>
        <Choices
          options={peopleOptions}
          selected={people == null ? [] : [people]}
          onChange={(v) => setPeople(people === v ? null : v)}
        />
        <Counter label="힌트 수" value={hints} onChange={setHints} />
        <Text style={styles.text}>남은 시간</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            accessibilityLabel="남은 분"
            placeholder="--"
            keyboardType="number-pad"
            value={remainingMinutes}
            onChangeText={setRemainingMinutes}
            maxLength={5}
            style={[styles.input, { flex: 1, minWidth: 0, textAlign: 'center' }]}
          />
          <Text style={styles.text}>분</Text>
          <TextInput
            accessibilityLabel="남은 초"
            placeholder="--"
            keyboardType="number-pad"
            value={remainingSeconds}
            onChangeText={setRemainingSeconds}
            maxLength={2}
            style={[styles.input, { flex: 1, minWidth: 0, textAlign: 'center' }]}
          />
          <Text style={styles.text}>초</Text>
        </View>
        {!!timeError && <Text style={{ color: '#A23C35' }}>{timeError}</Text>}
        <Field label="리뷰" value={content} onChangeText={setContent} multiline maxLength={5000} />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>리뷰 사진 · {photos.length}/5</Text>
        <View style={styles.row}>
          {photos.map((photo, index) => (
            <View key={photo.id} style={{ gap: 6 }}>
              {photo.preview ? (
                <Image
                  source={{ uri: photo.preview }}
                  accessibilityLabel={`첨부 사진 ${index + 1}`}
                  style={{ width: 130, height: 130, borderRadius: 12 }}
                />
              ) : (
                <ReviewImage
                  path={photo.url}
                  accessibilityLabel={`첨부 사진 ${index + 1}`}
                  style={{ width: 130, height: 130, borderRadius: 12 }}
                />
              )}
              <Button
                secondary
                title={`사진 ${index + 1} 삭제`}
                disabled={busy || uploading}
                onPress={() => setPhotos((current) => current.filter((p) => p.id !== photo.id))}
              />
            </View>
          ))}
        </View>
        <Button
          secondary
          title={uploading ? '사진을 올리고 있어요…' : '사진 첨부'}
          disabled={busy || uploading || photos.length >= 5}
          onPress={pickPhotos}
        />
      </View>
      <Feedback error={error} />
      <Button
        title={busy ? '기록을 저장하고 있어요…' : reviewId ? '수정한 기록 저장' : '발자국 남기기'}
        disabled={busy || uploading}
        onPress={save}
      />
      {reviewId && (
        <View style={styles.card}>
          {confirmDelete ? (
            <>
              <Text style={styles.text}>
                리뷰를 삭제하면 플레이 완료 기록과 캘린더에서도 사라져요.
              </Text>
              <Button title="리뷰 삭제 확정" disabled={busy || uploading} onPress={remove} />
              <Button secondary title="취소" onPress={() => setConfirmDelete(false)} />
            </>
          ) : (
            <Button
              secondary
              title="이 리뷰 삭제"
              disabled={busy || uploading}
              onPress={() => setConfirmDelete(true)}
            />
          )}
        </View>
      )}
    </>
  );
}
