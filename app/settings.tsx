import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Choices, Feedback, Guard, Screen, styles } from '@/components/ui';
import { api, json, logout } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import type { Settings } from '@/lib/types';

export default function SettingsScreen() {
  return (
    <Screen title="나에게 맞는 공개 범위">
      <Guard>
        <Form />
        <LogoutButton />
      </Guard>
    </Screen>
  );
}
function Form() {
  const resource = useResource<Settings>('/user/v1/me/settings');
  return (
    <>
      <Feedback loading={resource.loading} error={resource.error} retry={resource.reload} />
      {resource.data && <SettingsForm initial={resource.data} />}
    </>
  );
}
function SettingsForm({ initial }: { initial: Settings }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setValue(
        await api(
          '/user/v1/me/settings',
          json('PATCH', {
            is_private: value.is_private,
            party_search_enabled: value.party_search_enabled,
          }),
        ),
      );
      setMessage('공개 설정을 저장했어요.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Feedback error={error} />
      {value && (
        <View style={styles.card}>
          <Text style={styles.heading}>프로필 공개 범위</Text>
          <Choices
            options={[
              { value: 1, label: '비공개' },
              { value: 0, label: '공개' },
            ]}
            selected={[value.is_private ? 1 : 0]}
            onChange={(v) => setValue({ ...value, is_private: v === 1 })}
          />
          <Text style={styles.muted}>
            비공개 계정은 승인된 팔로워에게 기록과 목록을 공개해요. 공개로 바꾸면 대기 중인 요청도
            승인돼요.
          </Text>
          <Text style={styles.heading}>팔로워의 일행 검색 허용</Text>
          <Choices
            options={[
              { value: 1, label: '허용' },
              { value: 0, label: '허용 안 함' },
            ]}
            selected={[value.party_search_enabled ? 1 : 0]}
            onChange={(v) => setValue({ ...value, party_search_enabled: v === 1 })}
          />
          <Button title="설정 저장" disabled={busy} onPress={save} />
          {!!message && (
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              {message}
            </Text>
          )}
        </View>
      )}
    </>
  );
}

function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <Feedback error={error} />
      <Button
        secondary
        title={busy ? '로그아웃 중…' : '로그아웃'}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setError('');
          try {
            await logout();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
