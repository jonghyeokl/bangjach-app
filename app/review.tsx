import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { photoUrl, Button, Choices, Feedback, Field, Guard, Screen, styles } from '@/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { api, json } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import type { Enums, Photo, Review, Theme } from '@/lib/types';

const scores = Array.from({ length: 9 }, (_, i) => ({
  value: 1 + i * 0.5,
  label: (1 + i * 0.5).toFixed(1),
}));
const fields = ['difficulty', 'horrorness', 'physicality'] as const;
export default function ReviewEditor() {
  return (
    <Screen title="오늘의 발자국" subtitle="평점과 플레이 날짜를 남기면 기록이 시작돼요.">
      <Guard>
        <Editor />
      </Guard>
    </Screen>
  );
}
function Editor() {
  const { themeId, reviewId } = useLocalSearchParams<{ themeId: string; reviewId?: string }>();
  const existing = useResource<Review>(reviewId ? `/review/v1/${reviewId}` : null);
  if (reviewId && !existing.data)
    return <Feedback loading={existing.loading} error={existing.error} retry={existing.reload} />;
  return (
    <ReviewForm
      key={reviewId ?? themeId}
      themeId={themeId}
      reviewId={reviewId}
      initial={existing.data}
    />
  );
}
function ReviewForm({
  themeId,
  reviewId,
  initial,
}: {
  themeId: string;
  reviewId?: string;
  initial: Review | null;
}) {
  const theme = useResource<Theme>(`/theme/v1/${themeId}`);
  const meta = useResource<Enums>('/meta/v1/enums');
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [date, setDate] = useState(initial?.date ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [genre, setGenre] = useState<number[]>(initial?.genre_list ?? []);
  const [success, setSuccess] = useState<number | null>(
    initial?.is_success == null ? null : Number(initial.is_success),
  );
  const [numbers, setNumbers] = useState({
    people_size: initial?.people_size?.toString() ?? '',
    hint_count: initial?.hint_count?.toString() ?? '',
    played_time: initial?.played_time?.toString() ?? '',
  });
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
      photo_ids: photos.map((p) => p.id),
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
      router.dismissTo('/me');
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
      router.dismissTo('/me');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
          label="발자국을 남겨주세요"
          placeholder="스포일러 없이, 기억에 남은 순간은 어땠나요?"
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={5000}
        />
        <Text style={styles.muted}>리뷰 내용에서 정해진 주제 키워드를 자동으로 찾아요.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>리뷰 사진 · {photos.length}/5</Text>
        <Text style={styles.muted}>
          JPEG·PNG·WebP, 한 장당 8MB까지. 사진은 리뷰와 함께 공개돼요.
        </Text>
        <View style={styles.row}>
          {photos.map((photo, index) => (
            <View key={photo.id} style={{ gap: 6 }}>
              <Image
                source={{ uri: photo.preview ?? photoUrl(photo.url) }}
                accessibilityLabel={`첨부 사진 ${index + 1}`}
                style={{ width: 130, height: 130, borderRadius: 12 }}
              />
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
        disabled={busy || uploading || !theme.data}
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
