import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Empty, Feedback, Field, Guard, Pager, Screen, styles } from '@/components/ui';
import { api, json, query } from '@/lib/api';
import { useResource } from '@/lib/hooks';
import type { Friend, FriendRequest, Page, PublicUser } from '@/lib/types';

export default function FriendsScreen() {
  return (
    <Screen title="함께 풀어갈 사람들" subtitle="닉네임으로 친구를 찾아보세요.">
      <Guard>
        <Friends />
      </Guard>
    </Screen>
  );
}
function Friends() {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'friends' | 'received' | 'sent'>('friends');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const search = useResource<Page<PublicUser>>(
    q ? `/user/v1/search?${query({ q, purpose: 'friend', page: searchPage })}` : null,
  );
  const friends = useResource<Page<Friend>>(tab === 'friends' ? `/friend/v1?page=${page}` : null);
  const requests = useResource<Page<FriendRequest>>(
    tab !== 'friends' ? `/friend-request/v1?direction=${tab}&page=${page}` : null,
  );
  async function action(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(path, json(method, body));
      friends.reload();
      requests.reload();
      setRemoveId(null);
      setMessage('처리했어요.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <View style={styles.card}>
        <Field
          label="친구 닉네임"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => {
            setQ(text);
            setSearchPage(1);
          }}
        />
        <Button
          title="검색"
          onPress={() => {
            setQ(text);
            setSearchPage(1);
          }}
        />
        <Feedback loading={search.loading} error={search.error} />
        {search.data?.items.map((u) => (
          <View key={u.id} style={styles.row}>
            <Text style={[styles.text, { flex: 1 }]}>{u.name}</Text>
            <Button
              secondary
              disabled={busy}
              title="친구 요청"
              onPress={() => action('/friend-request/v1', 'POST', { requested_user_name: u.name })}
            />
          </View>
        ))}
        {search.data?.total === 0 && <Text style={styles.muted}>검색 결과가 없어요.</Text>}
        {search.data && (
          <Pager page={searchPage} total={search.data.total} onChange={setSearchPage} />
        )}
      </View>
      <View style={styles.row}>
        {(['friends', 'received', 'sent'] as const).map((key, i) => (
          <Button
            key={key}
            title={['내 친구', '받은 요청', '보낸 요청'][i]}
            secondary={tab !== key}
            onPress={() => {
              setTab(key);
              setPage(1);
              setRemoveId(null);
            }}
          />
        ))}
      </View>
      <Feedback
        loading={friends.loading || requests.loading}
        error={error || friends.error || requests.error}
        retry={() => {
          friends.reload();
          requests.reload();
        }}
      />
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          {message}
        </Text>
      )}
      {friends.data?.items.map((f) => (
        <View key={f.id} style={styles.card}>
          <Text style={styles.heading}>{f.friend.name}</Text>
          <View style={styles.row}>
            <Button
              secondary
              title="캘린더"
              onPress={() =>
                router.push({ pathname: '/calendar', params: { userId: f.friend.id } })
              }
            />
            <Button
              secondary
              disabled={busy}
              title={removeId === f.id ? '친구 해제 확정' : '친구 해제'}
              onPress={() =>
                removeId === f.id ? action(`/friend/v1/${f.id}`, 'DELETE') : setRemoveId(f.id)
              }
            />
            {removeId === f.id && (
              <Button secondary title="취소" onPress={() => setRemoveId(null)} />
            )}
          </View>
        </View>
      ))}
      {requests.data?.items.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.heading}>
            {tab === 'received' ? r.requesting_user.name : r.requested_user.name}
          </Text>
          <View style={styles.row}>
            {tab === 'received' ? (
              <>
                <Button
                  disabled={busy}
                  title="수락"
                  onPress={() => action(`/friend-request/v1/${r.id}/accept`, 'POST')}
                />
                <Button
                  secondary
                  disabled={busy}
                  title="거절"
                  onPress={() => action(`/friend-request/v1/${r.id}/reject`, 'POST')}
                />
              </>
            ) : (
              <Button
                secondary
                disabled={busy}
                title="요청 취소"
                onPress={() => action(`/friend-request/v1/${r.id}`, 'DELETE')}
              />
            )}
          </View>
        </View>
      ))}
      {(friends.data?.total === 0 || requests.data?.total === 0) && (
        <Empty
          text={
            tab === 'friends'
              ? '아직 친구가 없어요. 함께 방탈출한 친구에게 요청해보세요.'
              : '대기 중인 요청이 없어요.'
          }
        />
      )}
      <Pager
        page={page}
        total={friends.data?.total ?? requests.data?.total ?? 0}
        onChange={setPage}
      />
    </>
  );
}
