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
            calendar_publicity: value!.calendar_publicity,
            party_search_publicity: value!.party_search_publicity,
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
          {(['calendar_publicity', 'party_search_publicity'] as const).map((key, i) => (
            <View key={key} style={{ gap: 12, marginBottom: 16 }}>
              <Text style={styles.heading}>{i === 0 ? '내 캘린더' : '일행 검색 허용'}</Text>
              <Choices
                options={[
                  { value: 2, label: '친구만' },
                  { value: 3, label: '전체' },
                  { value: 1, label: '비공개' },
                ]}
                selected={[value[key]]}
                onChange={(v) => {
                  setValue({ ...value, [key]: v });
                  setMessage('');
                }}
              />
            </View>
          ))}
          <Text style={styles.muted}>
            리뷰와 리뷰에 적은 플레이 날짜는 항상 공개돼요. 이 설정은 캘린더 조회와 일행 검색에
            적용돼요.
          </Text>
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
