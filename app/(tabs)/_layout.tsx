import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '@/components/ui';

export default function MainTabs() {
  return (
    <Tabs
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarPosition: 'bottom',
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line },
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarLabel: ({ focused, color, children }) => (
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: focused ? colors.light : 'transparent',
            }}
          >
            <Text style={{ color, fontSize: 13, fontWeight: focused ? '700' : '500' }}>
              {children}
            </Text>
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: '테마 검색' }} />
      <Tabs.Screen name="feed" options={{ title: '피드' }} />
      <Tabs.Screen name="me" options={{ title: '마이페이지' }} />
    </Tabs>
  );
}
