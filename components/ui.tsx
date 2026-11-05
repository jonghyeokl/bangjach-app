import { ReviewImage } from './review-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { router, useRouter } from 'expo-router';
import { useSession } from '@/lib/session';
import { useState } from 'react';
import { peopleText } from '@/lib/review-form';
import { API_URL } from '@/lib/api';
import type { Option, Photo, Review, Theme } from '@/lib/types';

export const colors = {
  bg: '#F6F5F0',
  ink: '#213F36',
  muted: '#718078',
  line: '#DCE2DB',
  green: '#285C49',
  light: '#E7EFE8',
  white: '#FFFFFF',
  error: '#A23C35',
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 22,
    gap: 18,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 60,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  heading: { fontSize: 19, fontWeight: '700', color: colors.ink },
  text: { fontSize: 15, color: colors.ink, lineHeight: 23 },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BECBC1',
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 13,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
  },
  button: {
    backgroundColor: colors.green,
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondary: { backgroundColor: colors.light },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 30,
    backgroundColor: colors.white,
  },
  active: { backgroundColor: colors.green, borderColor: colors.green },
});
export function Screen({
  title,
  subtitle,
  compact = false,
  tabScreen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  tabScreen?: boolean;
  children: ReactNode;
}) {
  const navigation = useRouter();
  const inTabs = tabScreen;
  const { user } = useSession();
  return (
    <SafeAreaView
      style={styles.page}
      edges={inTabs ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            compact && { padding: 16, gap: 12, paddingBottom: 32 },
          ]}
        >
          {!compact && (
            <>
              <View testID={tabScreen ? 'tab-header' : 'page-header'} style={styles.row}>
                {inTabs ? (
                  <Text style={[styles.heading, { flex: 1 }]}>방자취</Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="뒤로"
                    onPress={() =>
                      navigation.canGoBack()
                        ? navigation.back()
                        : navigation.replace(user ? '/' : '/welcome')
                    }
                    style={{
                      paddingVertical: 8,
                      paddingRight: 16,
                      minHeight: 44,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={styles.text}>← 뒤로</Text>
                  </Pressable>
                )}
              </View>
              <View style={{ gap: 7, marginVertical: 8 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
              </View>
            </>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={[styles.buttonText, secondary && { color: colors.green }]}>{title}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8E9992"
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 120, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export function Choices({
  options,
  selected,
  onChange,
}: {
  options: Option[];
  selected: number[];
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((o) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selected.includes(o.value) }}
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.chip, selected.includes(o.value) && styles.active]}
        >
          <Text style={{ color: selected.includes(o.value) ? colors.white : colors.ink }}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Feedback({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  return (
    <>
      {loading && <ActivityIndicator color={colors.green} style={{ margin: 20 }} />}
      {!!error && (
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={{ color: colors.error }}>
            {error}
          </Text>
          {retry && <Button title="다시 시도" onPress={retry} secondary />}
        </View>
      )}
    </>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}
export function Guard({ children }: { children: ReactNode }) {
  const { user, ready } = useSession();
  if (!ready) return <Feedback loading />;
  if (!user)
    return (
      <View style={styles.card}>
        <Text style={styles.text}>로그인하고 방탈출의 순간을 모아보세요.</Text>
        <Button title="로그인 / 회원가입" onPress={() => router.push('/login')} />
      </View>
    );
  return <>{children}</>;
}
export function Pager({
  page,
  total,
  size = 20,
  onChange,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (p: number) => void;
}) {
  if (total <= size) return null;
  return (
    <View style={styles.row}>
      <Button secondary title="이전" disabled={page === 1} onPress={() => onChange(page - 1)} />
      <Text style={styles.muted}>
        {page} / {Math.ceil(total / size)}
      </Text>
      <Button
        secondary
        title="다음"
        disabled={page * size >= total}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}
export const scoreText = (v: number | null | undefined) =>
  v == null ? '아직 집계 전' : v.toFixed(2);
export function ThemeCard({ theme, compact = false }: { theme: Theme; compact?: boolean }) {
  if (compact)
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/theme/[id]', params: { id: theme.id } })}
        style={{
          flexDirection: 'row',
          gap: 14,
          paddingVertical: 16,
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
          backgroundColor: theme.is_played ? colors.light : 'transparent',
          borderRadius: theme.is_played ? 12 : 0,
        }}
      >
        {theme.image_url ? (
          <Image
            source={{ uri: photoUrl(theme.image_url) }}
            style={{ width: 96, height: 128, borderRadius: 10 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{ width: 96, height: 128, borderRadius: 10, backgroundColor: colors.line }}
          />
        )}
        <View style={{ flex: 1, gap: 7, paddingVertical: 2 }}>
          <Text style={styles.muted} numberOfLines={1}>
            {theme.cafe.name}
          </Text>
          <Text style={[styles.heading, { fontSize: 17, lineHeight: 23 }]} numberOfLines={2}>
            {theme.name}
          </Text>
          <View style={[styles.row, { gap: 8 }]}>
            {theme.statistics.normalized_rating != null && (
              <Text style={{ color: colors.green, fontSize: 14, fontWeight: '700' }}>
                ★ {scoreText(theme.statistics.normalized_rating)}
              </Text>
            )}
            <Text style={styles.muted}>{theme.length}분</Text>
            <Text style={styles.muted}>리뷰 {theme.statistics.review_count}</Text>
          </View>
          {(theme.statistics.avg_difficulty != null || theme.statistics.avg_horrorness != null) && (
            <Text style={styles.muted}>
              {[
                theme.statistics.avg_difficulty == null
                  ? null
                  : `난이도 ${scoreText(theme.statistics.avg_difficulty)}`,
                theme.statistics.avg_horrorness == null
                  ? null
                  : `공포도 ${scoreText(theme.statistics.avg_horrorness)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
          {theme.is_played && (
            <Text style={{ color: colors.green, fontWeight: '700', fontSize: 12 }}>
              ✓ 플레이 완료
            </Text>
          )}
        </View>
      </Pressable>
    );
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/theme/[id]', params: { id: theme.id } })}
      style={[
        styles.card,
        { padding: 0, overflow: 'hidden' },
        theme.is_played && { backgroundColor: colors.light, borderColor: colors.green },
      ]}
    >
      {theme.image_url ? (
        <Image
          source={{ uri: photoUrl(theme.image_url) }}
          style={{ width: '100%', height: 190 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            height: 100,
            backgroundColor: colors.light,
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <Text style={{ color: colors.green, fontSize: 30 }}>↗</Text>
        </View>
      )}
      <View style={{ padding: 18, gap: 7 }}>
        <Text style={styles.muted}>
          {theme.cafe.name} · {theme.length}분
        </Text>
        <Text style={styles.heading}>{theme.name}</Text>
        {theme.is_played && (
          <Text style={{ color: colors.green, fontWeight: '700' }}>✓ 플레이 완료</Text>
        )}
        <View style={styles.row}>
          {theme.statistics.normalized_rating != null && (
            <Text style={styles.text}>★ {scoreText(theme.statistics.normalized_rating)}</Text>
          )}
          <Text style={styles.muted}>리뷰 {theme.statistics.review_count}개</Text>
        </View>
        {(theme.statistics.avg_difficulty != null || theme.statistics.avg_horrorness != null) && (
          <Text style={styles.muted}>
            {[
              theme.statistics.avg_difficulty == null
                ? null
                : `난이도 ${scoreText(theme.statistics.avg_difficulty)}`,
              theme.statistics.avg_horrorness == null
                ? null
                : `공포도 ${scoreText(theme.statistics.avg_horrorness)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
export function ReviewCard({ review, keywords = [] }: { review: Review; keywords?: Option[] }) {
  const { user } = useSession();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable
          style={{ flex: 1 }}
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/profile/[id]', params: { id: review.author.id } })
          }
        >
          <Text style={styles.heading}>{review.author.name}</Text>
        </Pressable>
        <Text style={styles.heading}>★ {review.rating.toFixed(1)}</Text>
      </View>
      <Text style={styles.muted}>
        {review.theme_name} · {review.date}
        {review.people_size ? ` · ${peopleText(review.people_size)}` : ''}
        {review.is_success !== null ? ` · ${review.is_success ? '탈출 성공' : '탈출 실패'}` : ''}
      </Text>
      <ReviewPhotos photos={review.photos ?? []} />
      {!!review.content && <Text style={styles.text}>{review.content}</Text>}
      <Text style={styles.muted}>
        {review.review_keyword_list
          .map((k) => keywords.find((o) => o.value === k)?.label)
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {user?.id === review.author.id && (
        <Button
          secondary
          title="내 리뷰 수정"
          onPress={() =>
            router.push({
              pathname: '/review',
              params: { reviewId: review.id, themeId: review.theme_id },
            })
          }
        />
      )}
    </View>
  );
}

export const photoUrl = (url: string) => (url.startsWith('/') ? API_URL + url : url);

export function ReviewPhotos({ photos }: { photos: Photo[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!photos.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.muted}>리뷰 사진 · {photos.length}장</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {photos.map((photo, index) => (
          <Pressable
            key={photo.id}
            accessibilityRole="button"
            accessibilityLabel={`리뷰 사진 ${index + 1} 크게 보기`}
            onPress={() => setSelected(photoUrl(photo.url))}
          >
            <ReviewImage
              path={photo.url}
              accessibilityLabel={`리뷰 사진 ${index + 1}`}
              style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: colors.light }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={selected !== null} transparent onRequestClose={() => setSelected(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#000E',
            justifyContent: 'center',
            padding: 24,
            gap: 20,
          }}
        >
          {selected && (
            <ReviewImage
              path={selected}
              style={{ width: '100%', height: '70%' }}
              resizeMode="contain"
              accessibilityLabel="리뷰 사진 확대"
            />
          )}
          <Button title="사진 닫기" onPress={() => setSelected(null)} />
        </View>
      </Modal>
    </View>
  );
}
