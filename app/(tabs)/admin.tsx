import { useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Redirect } from 'expo-router';
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
    <Screen tabScreen title="테마 추가">
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
        <ThemeForm cafe={selectedCafe} onSelect={setSelectedCafe} />
      </View>
    </Screen>
  );
}

function CafeForm({ onCreated }: { onCreated: (cafe: Cafe) => void }) {
  const meta = useResource<Enums>('/meta/v1/enums');
  const [name, setName] = useState('');
  const [subregion, setSubregion] = useState<number | null>(null);
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
          subregion,
          address: address.trim(),
          phone_number: phone.trim(),
          website: optionalUrl(website),
        }),
      );
      setName('');
      setRegion(null);
      setSubregion(null);
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
        onChange={(v) => {
          setRegion(v);
          setSubregion(null);
        }}
      />
      {region !== null && (
        <Choices
          options={(meta.data?.subregion ?? []).filter((o) => o.parent === region)}
          selected={subregion === null ? [] : [subregion]}
          onChange={(v) => setSubregion(subregion === v ? null : v)}
        />
      )}
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
}: {
  cafe: Cafe | null;
  onSelect: (cafe: Cafe | null) => void;
}) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const cafes = useResource<Page<Cafe>>(!cafe ? `/cafe/v1?${query({ q, page })}` : null);
  const [name, setName] = useState('');
  const [length, setLength] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [picking, setPicking] = useState(false);
  const [website, setWebsite] = useState('');
  const [created, setCreated] = useState<Theme | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function pickPhoto() {
    setError('');
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.fileSize ?? asset.file?.size ?? 0) > 8 * 1024 * 1024) {
        throw new Error('사진 한 장은 8MB 이하여야 합니다.');
      }
      setPhoto(asset);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPicking(false);
    }
  }
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
      const payload = {
        cafe_id: cafe.id,
        name: name.trim(),
        length: Number(length),
        description: description.trim(),
        website: optionalUrl(website),
      };
      let result: Theme;
      if (photo) {
        const body = new FormData();
        body.append('data', JSON.stringify(payload));
        if (Platform.OS === 'web') {
          const file = photo.file ?? (await (await fetch(photo.uri)).blob());
          if (file.size > 8 * 1024 * 1024) {
            throw new Error('사진 한 장은 8MB 이하여야 합니다.');
          }
          body.append('photo', file, photo.fileName ?? 'theme.jpg');
        } else {
          // React Native's FormData uploads local files by URI.
          body.append('photo', {
            uri: photo.uri,
            name: photo.fileName ?? 'theme.jpg',
            type: photo.mimeType ?? 'image/jpeg',
          } as unknown as Blob);
        }
        result = await api<Theme>('/theme/v1/with-photo', { method: 'POST', body });
      } else {
        result = await api<Theme>('/theme/v1', json('POST', payload));
      }
      setCreated(result);
      setName('');
      setLength('');
      setDescription('');
      setPhoto(null);
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
        <Text style={styles.text}>테마 사진</Text>
        {photo && (
          <Image
            source={{ uri: photo.uri }}
            accessibilityLabel="선택한 테마 사진"
            style={{ width: '100%', height: 220, borderRadius: 12 }}
            resizeMode="contain"
          />
        )}
        <View style={styles.row}>
          <Button
            secondary
            title={picking ? '사진 선택 중…' : photo ? '사진 변경' : '사진 첨부'}
            disabled={busy || picking}
            onPress={pickPhoto}
          />
          {photo && (
            <Button secondary title="사진 삭제" disabled={busy} onPress={() => setPhoto(null)} />
          )}
        </View>
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
          </View>
        )}
        <Button
          title={busy ? '등록 중…' : '테마 등록'}
          disabled={busy || picking}
          onPress={submit}
        />
      </View>
    </View>
  );
}
