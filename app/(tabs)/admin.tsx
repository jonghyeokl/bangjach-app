import { useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Button, Choices, Empty, Feedback, Field, Pager, Screen, styles } from '@/components/ui';
import { api, json, query } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Cafe, Enums, Page, Theme } from '@/lib/types';

function optionalUrl(value: string) {
  const text = value.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (['http:', 'https:'].includes(url.protocol)) return text;
  } catch {}
  throw new Error('링크는 http:// 또는 https://로 시작하는 주소를 입력해주세요.');
}

export default function Admin() {
  const { user } = useSession();
  const [mode, setMode] = useState<'theme' | 'cafe'>('theme');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [message, setMessage] = useState('');
  if (!user?.is_admin) return <Redirect href="/" />;
  return (
    <Screen title="테마 추가" subtitle="방탈출 카페를 등록하고, 카페의 테마를 추가하세요.">
      <View style={styles.row}>
        <Button title="테마 추가" secondary={mode !== 'theme'} onPress={() => setMode('theme')} />
        <Button title="카페 추가" secondary={mode !== 'cafe'} onPress={() => setMode('cafe')} />
      </View>
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {message}
        </Text>
      )}
      <View style={{ display: mode === 'cafe' ? 'flex' : 'none' }}>
        <CafeForm
          onCreated={(cafe) => {
            setSelectedCafe(cafe);
            setMessage(`${cafe.name} 카페를 추가했어요. 이어서 테마를 등록할 수 있어요.`);
            setMode('theme');
          }}
        />
      </View>
      <View style={{ display: mode === 'theme' ? 'flex' : 'none' }}>
        <ThemeForm
          cafe={selectedCafe}
          onSelect={setSelectedCafe}
          onAddCafe={() => setMode('cafe')}
        />
      </View>
    </Screen>
  );
}

function CafeForm({ onCreated }: { onCreated: (cafe: Cafe) => void }) {
  const meta = useResource<Enums>('/meta/v1/enums');
  const [name, setName] = useState('');
  const [region, setRegion] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    setError('');
    if (!name.trim() || !address.trim() || !phone.trim() || region === null) {
      setError('카페명·지역·주소·전화번호를 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      const cafe = await api<Cafe>(
        '/cafe/v1',
        json('POST', {
          name: name.trim(),
          region,
          address: address.trim(),
          phone_number: phone.trim(),
          website: optionalUrl(website),
        }),
      );
      setName('');
      setRegion(null);
      setAddress('');
      setPhone('');
      setWebsite('');
      onCreated(cafe);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>방탈출 카페 등록</Text>
      <Field label="카페명 *" value={name} onChangeText={setName} maxLength={100} />
      <Text style={styles.text}>지역 *</Text>
      <Feedback loading={meta.loading} error={meta.error} retry={meta.reload} />
      <Choices
        options={meta.data?.region ?? []}
        selected={region === null ? [] : [region]}
        onChange={setRegion}
      />
      <Field label="주소 *" value={address} onChangeText={setAddress} maxLength={300} />
      <Field
        label="카페 전화번호 *"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={30}
      />
      <Field
        label="카페 홈페이지"
        value={website}
        onChangeText={setWebsite}
        placeholder="https://… (선택)"
        autoCapitalize="none"
        keyboardType="url"
        maxLength={2000}
      />
      <Feedback error={error} />
      <Button title={busy ? '등록 중…' : '카페 등록'} disabled={busy} onPress={submit} />
    </View>
  );
}

function ThemeForm({
  cafe,
  onSelect,
  onAddCafe,
}: {
  cafe: Cafe | null;
  onSelect: (cafe: Cafe | null) => void;
  onAddCafe: () => void;
}) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const cafes = useResource<Page<Cafe>>(!cafe ? `/cafe/v1?${query({ q, page })}` : null);
  const [name, setName] = useState('');
  const [length, setLength] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [created, setCreated] = useState<Theme | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function search() {
    setQ(text.trim());
    setPage(1);
    cafes.reload();
  }
  async function submit() {
    setError('');
    setCreated(null);
    if (!cafe || !name.trim() || !/^\d+$/.test(length) || Number(length) < 1) {
      setError('카페·테마명·제한 시간(1분 이상 정수)을 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      const result = await api<Theme>(
        '/theme/v1',
        json('POST', {
          cafe_id: cafe.id,
          name: name.trim(),
          length: Number(length),
          description: description.trim(),
          image_url: optionalUrl(imageUrl),
          website: optionalUrl(website),
        }),
      );
      setCreated(result);
      setName('');
      setLength('');
      setDescription('');
      setImageUrl('');
      setWebsite('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 18 }}>
      <View style={styles.card}>
        <Text style={styles.heading}>카페 선택 *</Text>
        {cafe ? (
          <>
            <Text style={styles.text}>{cafe.name}</Text>
            <Text style={styles.muted}>{cafe.address}</Text>
            <Button secondary title="다른 카페 선택" onPress={() => onSelect(null)} />
          </>
        ) : (
          <>
            <Field
              label="카페명 검색"
              value={text}
              onChangeText={setText}
              onSubmitEditing={search}
              maxLength={100}
            />
            <Button secondary title="카페 검색" onPress={search} />
            <Feedback loading={cafes.loading} error={cafes.error} retry={cafes.reload} />
            {cafes.data?.items.map((item) => (
              <View key={item.id} style={{ gap: 6 }}>
                <Button secondary title={item.name} onPress={() => onSelect(item)} />
                <Text style={styles.muted}>{item.address}</Text>
              </View>
            ))}
            {cafes.data?.total === 0 && (
              <Empty text="등록된 카페가 없어요. 먼저 카페를 추가해주세요." />
            )}
            {cafes.data && <Pager page={page} total={cafes.data.total} onChange={setPage} />}
          </>
        )}
        <Button secondary title="새 카페 추가하기" onPress={onAddCafe} />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>테마 등록</Text>
        <Field label="테마명 *" value={name} onChangeText={setName} maxLength={100} />
        <Field
          label="제한 시간 (분) *"
          value={length}
          onChangeText={setLength}
          keyboardType="number-pad"
          maxLength={5}
        />
        <Field
          label="테마 설명"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={10000}
        />
        <Field
          label="테마 사진 URL"
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://… (선택)"
          autoCapitalize="none"
          keyboardType="url"
          maxLength={2000}
        />
        <Field
          label="테마 홈페이지"
          value={website}
          onChangeText={setWebsite}
          placeholder="비워두면 카페 홈페이지 사용"
          autoCapitalize="none"
          keyboardType="url"
          maxLength={2000}
        />
        <Feedback error={error} />
        {created && (
          <View style={{ gap: 8 }}>
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              {created.name} 테마를 추가했어요.
            </Text>
            <Button
              secondary
              title="추가한 테마 보기"
              onPress={() => router.push({ pathname: '/theme/[id]', params: { id: created.id } })}
            />
          </View>
        )}
        <Button title={busy ? '등록 중…' : '테마 등록'} disabled={busy} onPress={submit} />
      </View>
    </View>
  );
}
