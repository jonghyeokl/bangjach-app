import { useCallback, useState } from 'react';
import { Image, type ImageProps, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { reviewPhotoData } from '@/lib/api';

export function ReviewImage({ path, ...props }: Omit<ImageProps, 'source'> & { path: string }) {
  const [source, setSource] = useState<{ path: string; uri: string } | null>(null);
  const [error, setError] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setSource(null);
      setError(false);
      reviewPhotoData(path)
        .then((uri) => {
          if (active) setSource({ path, uri });
        })
        .catch(() => {
          if (active) setError(true);
        });
      return () => {
        active = false;
        setSource(null);
      };
    }, [path]),
  );
  return source?.path === path ? (
    <Image {...props} source={{ uri: source.uri }} />
  ) : (
    <View style={props.style}>{error && <Text>사진을 불러올 수 없어요.</Text>}</View>
  );
}
