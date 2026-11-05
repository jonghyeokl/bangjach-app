import { useCallback, useLayoutEffect, useRef, useState, type ElementRef } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, styles } from './ui';

type Range = [number, number];
type Bound = 0 | 1;
const INSET = 22;
const position = (value: number, width: number) =>
  INSET + ((value - 1) / 4) * Math.max(0, width - INSET * 2);
const integer = (value: number) => Math.max(1, Math.min(5, Math.round(value)));

export function RangeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Range;
  onChange: (next: Range) => void;
}) {
  const track = useRef<ElementRef<typeof View>>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<Bound | null>(null);
  const current = useRef({ value, onChange, width });
  useLayoutEffect(() => {
    current.current = { value, onChange, width };
  }, [value, onChange, width]);
  const drag = useRef<{
    origin: number | null;
    start: number;
    x: number;
    bound: Bound | null;
  } | null>(null);
  const change = useCallback((bound: Bound, score: number) => {
    const { value: latest, onChange: notify } = current.current;
    const next: Range =
      bound === 0
        ? [Math.min(integer(score), latest[1]), latest[1]]
        : [latest[0], Math.max(integer(score), latest[0])];
    if (next[0] !== latest[0] || next[1] !== latest[1]) {
      current.current.value = next;
      notify(next);
    }
  }, []);
  const move = useCallback(() => {
    const gesture = drag.current;
    if (!gesture || gesture.origin == null || current.current.width <= INSET * 2) return;
    const { width: trackWidth } = current.current;
    const x = gesture.x - gesture.origin;
    if (gesture.bound == null) {
      // Coincident handles separate in the direction of the drag.
      if (Math.abs(gesture.x - gesture.start) < 2) return;
      gesture.bound = gesture.x < gesture.start ? 0 : 1;
      setActive(gesture.bound);
    }
    const score = 1 + ((x - INSET) / (trackWidth - INSET * 2)) * 4;
    change(gesture.bound, score);
  }, [change]);
  // PanResponder stores callbacks; it does not read their refs during initialization.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const start = event.nativeEvent.pageX;
        const gesture = {
          origin: null as number | null,
          start,
          x: start,
          bound: null as Bound | null,
        };
        drag.current = gesture;
        track.current?.measureInWindow((x, _y, measuredWidth) => {
          if (drag.current !== gesture) return;
          current.current.width = measuredWidth;
          gesture.origin = x;
          const [low, high] = current.current.value;
          const offset = start - x;
          const lowDistance = Math.abs(offset - position(low, measuredWidth));
          const highDistance = Math.abs(offset - position(high, measuredWidth));
          if (low === high && lowDistance < INSET) {
            gesture.bound = null;
          } else {
            gesture.bound =
              lowDistance === highDistance
                ? offset < position(low, measuredWidth)
                  ? 0
                  : 1
                : lowDistance < highDistance
                  ? 0
                  : 1;
          }
          setActive(gesture.bound);
          move();
        });
      },
      onPanResponderMove: (event) => {
        if (drag.current) {
          drag.current.x = event.nativeEvent.pageX;
          move();
        }
      },
      onPanResponderRelease: () => {
        drag.current = null;
        setActive(null);
      },
      onPanResponderTerminate: () => {
        drag.current = null;
        setActive(null);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }),
  );
  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={styles.text}>{label}</Text>
        <Text style={{ color: colors.green, fontWeight: '700' }}>
          {value[0]}–{value[1]}
        </Text>
      </View>
      <View
        ref={track}
        testID={`${label}-range`}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={slider.track}
        {...responder.panHandlers}
      >
        <View pointerEvents="none" style={slider.rail} />
        <View
          pointerEvents="none"
          style={[
            slider.rail,
            {
              left: position(value[0], width),
              right: undefined,
              width: ((value[1] - value[0]) / 4) * Math.max(0, width - INSET * 2),
              backgroundColor: colors.green,
            },
          ]}
        />
        {[1, 2, 3, 4, 5].map((score) => (
          <View
            pointerEvents="none"
            key={score}
            style={[slider.tick, { left: position(score, width) - 2 }]}
          />
        ))}
        {([0, 1] as const).map((bound) => (
          <View
            key={bound}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`${label} ${bound === 0 ? '최소' : '최대'}`}
            accessibilityValue={{
              min: bound === 0 ? 1 : value[0],
              max: bound === 0 ? value[1] : 5,
              now: value[bound],
              text: `${value[bound]}점`,
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) =>
              change(bound, value[bound] + (event.nativeEvent.actionName === 'increment' ? 1 : -1))
            }
            {...(Platform.OS === 'web'
              ? {
                  tabIndex: 0,
                  'aria-valuemin': bound === 0 ? 1 : value[0],
                  'aria-valuemax': bound === 0 ? value[1] : 5,
                  'aria-valuenow': value[bound],
                  'aria-valuetext': `${value[bound]}점`,
                  onKeyDown: (event) => {
                    const delta = ['ArrowRight', 'ArrowUp'].includes(event.nativeEvent.key)
                      ? 1
                      : ['ArrowLeft', 'ArrowDown'].includes(event.nativeEvent.key)
                        ? -1
                        : 0;
                    if (
                      delta ||
                      event.nativeEvent.key === 'Home' ||
                      event.nativeEvent.key === 'End'
                    ) {
                      event.preventDefault();
                      change(
                        bound,
                        event.nativeEvent.key === 'Home'
                          ? 1
                          : event.nativeEvent.key === 'End'
                            ? 5
                            : current.current.value[bound] + delta,
                      );
                    }
                  },
                }
              : {})}
            style={[
              slider.handleTarget,
              { left: position(value[bound], width) - INSET, zIndex: active === bound ? 3 : 2 },
            ]}
          >
            <View
              style={[
                slider.handle,
                active === bound && { backgroundColor: colors.light, borderWidth: 3 },
              ]}
            />
          </View>
        ))}
      </View>
      <View pointerEvents="none" style={{ height: 20 }}>
        {[1, 2, 3, 4, 5].map((score) => (
          <Text
            key={score}
            style={[
              styles.muted,
              {
                position: 'absolute',
                width: 24,
                textAlign: 'center',
                left: position(score, width) - 12,
              },
            ]}
          >
            {score}
          </Text>
        ))}
      </View>
    </View>
  );
}
const slider = StyleSheet.create({
  track: { height: 48, width: '100%' },
  rail: {
    position: 'absolute',
    left: INSET,
    right: INSET,
    top: 21,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  tick: {
    position: 'absolute',
    top: 22,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  handleTarget: {
    position: 'absolute',
    top: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
  },
});
