import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import { Button, colors } from '@/components/ui';

export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView style={welcome.page}>
      <View style={welcome.content}>
        <View style={welcome.intro}>
          <View accessible={false} style={welcome.mark}>
            <View style={welcome.door}>
              <View style={welcome.handle} />
            </View>
          </View>
          <Text accessibilityRole="header" style={welcome.title}>
            방자취
          </Text>
          <Text style={welcome.description}>방을 탈출하고, 나만의 발자국을 남겨요.</Text>
        </View>
        <View style={welcome.actions}>
          <Button
            title="회원가입"
            onPress={() => router.push({ pathname: '/login', params: { mode: 'signup' } })}
          />
          <Button title="로그인" secondary onPress={() => router.push('/login')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const welcome = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  title: { fontSize: 44, fontWeight: '800', color: colors.ink, letterSpacing: -2 },
  description: { fontSize: 15, color: colors.muted, lineHeight: 24, textAlign: 'center' },
  actions: { gap: 12, paddingBottom: 12 },
  mark: {
    width: 96,
    height: 96,
    backgroundColor: colors.light,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  door: {
    width: 36,
    height: 52,
    borderWidth: 3,
    borderColor: colors.green,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 5,
  },
  handle: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green },
});
