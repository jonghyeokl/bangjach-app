import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Empty, Feedback, Pager, Screen, styles } from '@/components/ui';
import { api, json, query } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Follow, Page } from '@/lib/types';

export default function FollowsScreen() {
  const params = useLocalSearchParams<{ userId?: string; direction?: string }>();
  const { user } = useSession();
  const target = params.userId ?? user?.id;
  const own = target === user?.id;
  const [direction, setDirection] = useState(
    params.direction === 'followers'
      ? 'followers'
      : params.direction === 'requests' && own
        ? 'requests'
        : 'following',
  );
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rows = useResource<Page<Follow>>(
    `/follow/v1?${query({ user_id: target, direction, page })}`,
  );
  async function action(id: string, accept = false) {
    setBusy(true);
    setError('');
    try {
      await api(`/follow/v1/${id}${accept ? '/accept' : ''}`, json(accept ? 'POST' : 'DELETE'));
      rows.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="팔로우">
      <View style={styles.row}>
        {(own ? ['followers', 'following', 'requests'] : ['followers', 'following']).map(
          (key, i) => (
            <Button
              key={key}
              title={['팔로워', '팔로잉', '받은 요청'][i]}
              secondary={key !== direction}
              onPress={() => {
                setDirection(key);
                setPage(1);
              }}
            />
          ),
        )}
      </View>
      <Feedback loading={rows.loading} error={error || rows.error} retry={rows.reload} />
      {rows.data?.items.map((row) => (
        <View key={row.id} style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: row.user.id } })}
          >
            <Text style={styles.heading}>{row.user.name}</Text>
          </Pressable>
          {own && (
            <View style={styles.row}>
              {direction === 'requests' && (
                <Button title="승인" disabled={busy} onPress={() => action(row.id, true)} />
              )}
              <Button
                secondary
                disabled={busy}
                title={
                  direction === 'requests'
                    ? '거절'
                    : direction === 'followers'
                      ? '팔로워 삭제'
                      : '팔로우 취소'
                }
                onPress={() => action(row.id)}
              />
            </View>
          )}
        </View>
      ))}
      {rows.data?.total === 0 && (
        <Empty
          text={direction === 'requests' ? '받은 요청이 없어요.' : '아직 목록이 비어 있어요.'}
        />
      )}
      {rows.data && <Pager page={page} total={rows.data.total} onChange={setPage} />}
    </Screen>
  );
}
