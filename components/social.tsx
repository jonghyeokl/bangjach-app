import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Feedback, Field, Pager, styles } from './ui';
import { api, json, query } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import type { Page, Profile, PublicUser } from '@/lib/types';

export function FollowButton({ profile, onChange }: { profile: Profile; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (profile.is_self) return null;
  return (
    <View style={{ gap: 8 }}>
      <Button
        secondary={profile.relationship !== 'none'}
        disabled={busy}
        title={
          profile.relationship === 'following'
            ? '팔로우 취소'
            : profile.relationship === 'pending'
              ? '요청 취소'
              : '팔로우'
        }
        onPress={async () => {
          setBusy(true);
          setError('');
          try {
            if (profile.follow_id) await api(`/follow/v1/${profile.follow_id}`, json('DELETE'));
            else await api('/follow/v1', json('POST', { user_id: profile.id }));
            onChange();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {profile.relationship === 'pending' && <Text style={styles.muted}>승인 대기 중</Text>}
      <Feedback error={error} />
    </View>
  );
}
function SearchResult({ user, onChange }: { user: PublicUser; onChange?: () => void }) {
  const data = useResource<Profile>(`/user/v1/${user.id}/profile`);
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: user.id } })}
      >
        <Text style={styles.heading}>{user.name}</Text>
      </Pressable>
      {data.data && (
        <FollowButton
          profile={data.data}
          onChange={() => {
            data.reload();
            onChange?.();
          }}
        />
      )}
      <Feedback error={data.error} />
    </View>
  );
}
export function UserSearch({ onChange }: { onChange?: () => void }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const data = useResource<Page<PublicUser>>(
    q ? `/user/v1/search?${query({ q, purpose: 'follow', page })}` : null,
  );
  const search = () => {
    setQ(text.trim());
    setPage(1);
    data.reload();
  };
  return (
    <View style={styles.card}>
      <Field
        label="닉네임 검색"
        value={text}
        onChangeText={setText}
        onSubmitEditing={search}
        maxLength={30}
      />
      <Button title="검색" onPress={search} />
      <Feedback loading={data.loading} error={data.error} retry={data.reload} />
      {data.data?.items.map((user) => (
        <SearchResult key={user.id} user={user} onChange={onChange} />
      ))}
      {data.data?.total === 0 && <Text style={styles.muted}>검색 결과가 없어요.</Text>}
      {data.data && <Pager page={page} total={data.data.total} onChange={setPage} />}
    </View>
  );
}
