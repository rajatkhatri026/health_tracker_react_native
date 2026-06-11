import { useRef, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export function useScrollToTopOnTabPress() {
  const scrollRef = useRef<ScrollView>(null);
  const prevStackDepth = useRef<number | null>(null);

  let navigation: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigation = useNavigation();
  } catch {
    // Navigator not mounted yet — safe to ignore
  }

  useFocusEffect(
    useCallback(() => {
      if (!navigation) return;
      try {
        // Walk up to the root stack navigator
        let nav: any = navigation;
        while (nav.getParent?.()) {
          nav = nav.getParent();
        }
        const stackDepth = nav?.getState?.()?.routes?.length ?? 1;
        const isBackNavigation =
          prevStackDepth.current !== null && stackDepth < prevStackDepth.current;

        if (!isBackNavigation) {
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        }
        prevStackDepth.current = stackDepth;
      } catch {
        // Navigation state not ready — scroll to top as safe default
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    }, [navigation])
  );

  return scrollRef;
}
