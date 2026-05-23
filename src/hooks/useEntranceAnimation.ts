import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export interface EntranceSection {
  opacity: Animated.Value;
  translateY: Animated.Value;
  scale?: Animated.Value;
}

interface Options {
  /** Delay before the very first section starts (ms). Default 80. */
  initialDelay?: number;
  /** Gap between each section's start (ms). Default 90. */
  stagger?: number;
  /** translateY start offset. Default 28. */
  fromY?: number;
  /** Duration for opacity/translateY timing. Default 420. */
  duration?: number;
  /** Whether the first section uses a spring scale-in. Default false. */
  firstSpring?: boolean;
}

/**
 * Returns an array of `count` animation sections, each with opacity +
 * translateY (and optionally scale for the first section).
 *
 * All sections animate in sequentially with a stagger, starting after
 * `initialDelay` ms. Uses the same pattern as WelcomeBackScreen.
 *
 * Usage:
 *   const sections = useEntranceAnimation(4);
 *   // In JSX:
 *   <Animated.View style={{ opacity: sections[0].opacity, transform: [{ translateY: sections[0].translateY }] }}>
 */
export const useEntranceAnimation = (count: number, options: Options = {}): EntranceSection[] => {
  const {
    initialDelay = 80,
    stagger = 90,
    fromY = 28,
    duration = 420,
    firstSpring = false,
  } = options;

  const [sections] = useState<EntranceSection[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(fromY),
      scale: i === 0 && firstSpring ? new Animated.Value(0.88) : undefined,
    }))
  );

  // Track whether animations have already run (avoids re-firing on re-render)
  const didAnimate = useRef(false);

  useEffect(() => {
    if (didAnimate.current) return;
    didAnimate.current = true;

    sections.forEach((sec, i) => {
      const delay = initialDelay + i * stagger;

      if (i === 0 && firstSpring && sec.scale) {
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.spring(sec.scale, {
              toValue: 1,
              useNativeDriver: true,
              damping: 12,
              stiffness: 140,
            }),
            Animated.timing(sec.opacity, { toValue: 1, duration, useNativeDriver: true }),
            Animated.timing(sec.translateY, { toValue: 0, duration, useNativeDriver: true }),
          ]),
        ]).start();
      } else {
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(sec.opacity, { toValue: 1, duration, useNativeDriver: true }),
            Animated.timing(sec.translateY, { toValue: 0, duration, useNativeDriver: true }),
          ]),
        ]).start();
      }
    });
  }, [sections, initialDelay, stagger, duration, firstSpring]);

  return sections;
};

/** Convenience style builder */
export const entranceStyle = (sec: EntranceSection) => ({
  opacity: sec.opacity,
  transform: [{ translateY: sec.translateY }, ...(sec.scale ? [{ scale: sec.scale }] : [])],
});
