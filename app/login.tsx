import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, json, login } from '@/lib/api';
import { Button, Feedback, Field, Screen, styles } from '@/components/ui';

export default function Login() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return <LoginForm key={mode ?? 'login'} initialSignup={mode === 'signup'} />;
}
function LoginForm({ initialSignup }: { initialSignup: boolean }) {
  const [signup, setSignup] = useState(initialSignup);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError('');
    try {
      if (signup)
        await api('/user/v1/sign-up', json('POST', { phone_number: phone, password, name }));
      await login(phone, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={signup ? '첫 발자국을 남겨볼까요?' : '다시 만나서 반가워요'}
      subtitle="함께한 순간을 발자국으로 남기세요."
    >
      <View style={styles.card}>
        {signup && (
          <Field
            label="닉네임"
            value={name}
            onChangeText={setName}
            maxLength={30}
            autoCapitalize="none"
          />
        )}
        <Field
          label="전화번호"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <Field
          label={signup ? '비밀번호 (8자 이상)' : '비밀번호'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={signup ? 'new-password' : 'current-password'}
          maxLength={128}
        />
        <Feedback error={error} />
        <Button
          title={busy ? '확인 중…' : signup ? '가입하고 시작하기' : '로그인'}
          disabled={busy}
          onPress={submit}
        />
        <Button
          secondary
          title={signup ? '이미 계정이 있어요' : '처음이에요 · 회원가입'}
          disabled={busy}
          onPress={() => {
            setSignup(!signup);
            setError('');
          }}
        />
        {signup && (
          <Text style={styles.muted}>
            닉네임은 중복 사용할 수 없어요. 첫 버전에서는 전화번호 인증과 비밀번호 재설정을 지원하지
            않아요.
          </Text>
        )}
      </View>
    </Screen>
  );
}
