/* eslint-disable react-hooks/refs */
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Animated,
  StyleSheet,
  Dimensions,
  ViewStyle,
  DimensionValue,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Ellipse,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  ClipPath,
} from 'react-native-svg';
import { COLORS, RADIUS } from '../../utils/theme';

// ── Skeleton Glass — exact same geometry as WaterGlass SVG ───────────────────
const SkeletonGlass: React.FC = () => {
  // Shimmer animation
  const shimmer = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });

  // Exact same constants as WaterGlass
  const W = 220,
    H = 300,
    cx = W / 2;
  const oTopRx = 88,
    oTopRy = 14;
  const oBotRx = 56,
    oBotRy = 9;
  const rimY = 22,
    botY = 272;

  // Trapezoid outline path (outer wall)
  const outlineD = `M${cx - oTopRx} ${rimY} L${cx + oTopRx} ${rimY} L${cx + oBotRx} ${botY} L${cx - oBotRx} ${botY} Z`;

  return (
    <Animated.View style={{ width: W, height: H, opacity }}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgGrad id="sk_fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#E4E7F0" />
            <Stop offset="100%" stopColor="#CDD1E0" />
          </SvgGrad>
          <SvgGrad id="sk_base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#CDD1E0" />
            <Stop offset="100%" stopColor="#B8BDD0" />
          </SvgGrad>
          <ClipPath id="sk_clip">
            <Path d={outlineD} />
          </ClipPath>
        </Defs>

        {/* Glass body fill */}
        <Path d={outlineD} fill="url(#sk_fill)" />

        {/* Side outlines */}
        <Path
          d={`M${cx - oTopRx} ${rimY} L${cx - oBotRx} ${botY}`}
          stroke="#C8CCE0"
          strokeWidth="1.5"
          fill="none"
        />
        <Path
          d={`M${cx + oTopRx} ${rimY} L${cx + oBotRx} ${botY}`}
          stroke="#C8CCE0"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Base ellipse */}
        <Ellipse cx={cx} cy={botY} rx={oBotRx} ry={oBotRy + 2} fill="url(#sk_base)" />

        {/* Rim ellipse */}
        <Ellipse cx={cx} cy={rimY} rx={oTopRx} ry={oTopRy} fill="#D8DCF0" opacity={0.7} />
        <Ellipse
          cx={cx}
          cy={rimY - 2}
          rx={oTopRx - 5}
          ry={oTopRy - 3}
          fill="#ECEFFE"
          opacity={0.5}
        />

        {/* Level tick marks */}
        {[0.25, 0.5, 0.75].map((lvl) => {
          const innerH = botY - 4 - (rimY + oTopRy);
          const ty = botY - 4 - lvl * innerH;
          const t = (ty - rimY) / (botY - rimY);
          const rx = oTopRx + (oBotRx - oTopRx) * t;
          const lx = cx - rx + 4;
          return (
            <Path key={lvl} d={`M${lx} ${ty} L${lx + 14} ${ty}`} stroke="#C0C4D8" strokeWidth="1" />
          );
        })}
      </Svg>
    </Animated.View>
  );
};

// ── Fade transition wrapper ───────────────────────────────────────────────────
// Wraps content with a smooth opacity fade-in when `visible` flips to true.
// Use: <FadeIn visible={!loading}>{realContent}</FadeIn>
export const FadeIn: React.FC<{
  visible: boolean;
  duration?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ visible, duration = 350, children, style }) => {
  const [opacity] = useState(() => new Animated.Value(visible ? 1 : 0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration,
      useNativeDriver: true,
    }).start();
  }, [visible, duration, opacity]);

  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

// Base skeleton with shimmer effect
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  // useState keeps Animated.Value stable without triggering react-hooks/refs lint rule
  const [shimmerAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E8ECF4',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.6)',
            'rgba(255,255,255,0.9)',
            'rgba(255,255,255,0.6)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// Circle skeleton (for avatars, icons)
export const SkeletonCircle: React.FC<{ size?: number; style?: ViewStyle }> = ({
  size = 40,
  style,
}) => <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;

// Text line skeleton
export const SkeletonText: React.FC<{
  width?: DimensionValue;
  height?: number;
  lines?: number;
  spacing?: number;
  style?: ViewStyle;
}> = ({ width = '100%', height = 14, lines = 1, spacing = 8, style }) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        width={i === lines - 1 && lines > 1 ? '70%' : width}
        height={height}
        borderRadius={height / 2}
        style={i < lines - 1 ? { marginBottom: spacing } : undefined}
      />
    ))}
  </View>
);

// Card skeleton (glass card style)
export const SkeletonCard: React.FC<{
  height?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}> = ({ height = 120, children, style }) => (
  <View
    style={[
      {
        height,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        overflow: 'hidden',
      },
      style,
    ]}
  >
    {children || (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <SkeletonCircle size={40} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Skeleton width="60%" height={14} borderRadius={7} />
            <Skeleton width="40%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
          </View>
        </View>
        <Skeleton width="100%" height={10} borderRadius={5} />
        <Skeleton width="80%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
      </>
    )}
  </View>
);

// Stats grid skeleton
export const SkeletonStatsGrid: React.FC<{ columns?: number; style?: ViewStyle }> = ({
  columns = 2,
  style,
}) => {
  const cardWidth = (SCREEN_WIDTH - 52) / columns;
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, style]}>
      {Array.from({ length: columns * 2 }).map((_, i) => (
        <SkeletonCard key={i} height={130} style={{ width: cardWidth }}>
          <SkeletonCircle size={36} style={{ marginBottom: 10 }} />
          <Skeleton width="50%" height={12} borderRadius={6} />
          <Skeleton width="70%" height={20} borderRadius={10} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={28} borderRadius={6} style={{ marginTop: 10 }} />
        </SkeletonCard>
      ))}
    </View>
  );
};

// List item skeleton
export const SkeletonListItem: React.FC<{ style?: ViewStyle; hasImage?: boolean }> = ({
  style,
  hasImage = true,
}) => (
  <View
    style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
      },
      style,
    ]}
  >
    {hasImage && <Skeleton width={50} height={50} borderRadius={14} style={{ marginRight: 14 }} />}
    <View style={{ flex: 1 }}>
      <Skeleton width="70%" height={14} borderRadius={7} />
      <Skeleton width="50%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
      <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 10 }} />
    </View>
    <Skeleton width={60} height={24} borderRadius={8} style={{ marginLeft: 10 }} />
  </View>
);

// Progress ring skeleton
export const SkeletonRing: React.FC<{ size?: number; style?: ViewStyle }> = ({
  size = 120,
  style,
}) => (
  <View
    style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}
  >
    <Skeleton width={size} height={size} borderRadius={size / 2} />
  </View>
);

// Hero card skeleton (dashboard main card)
export const SkeletonHeroCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View
    style={[
      {
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#EDE9FE',
        padding: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 4,
      },
      style,
    ]}
  >
    <View style={{ flex: 1 }}>
      <Skeleton width={100} height={10} borderRadius={5} style={{ marginBottom: 8 }} />
      <Skeleton width={140} height={28} borderRadius={14} style={{ marginBottom: 6 }} />
      <Skeleton width={120} height={12} borderRadius={6} style={{ marginBottom: 18 }} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View>
          <Skeleton width={50} height={16} borderRadius={8} />
          <Skeleton width={40} height={10} borderRadius={5} style={{ marginTop: 4 }} />
        </View>
        <View>
          <Skeleton width={70} height={16} borderRadius={8} />
          <Skeleton width={40} height={10} borderRadius={5} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
    <SkeletonRing size={120} />
  </View>
);

// Water card skeleton
export const SkeletonWaterCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View
    style={[
      {
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#DBEAFE',
        padding: 20,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
        elevation: 3,
      },
      style,
    ]}
  >
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Skeleton width={38} height={38} borderRadius={12} />
        <View>
          <Skeleton width={90} height={14} borderRadius={7} />
          <Skeleton width={70} height={10} borderRadius={5} style={{ marginTop: 4 }} />
        </View>
      </View>
      <Skeleton width={50} height={24} borderRadius={10} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
      <SkeletonRing size={110} />
      <View style={{ flex: 1, gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width={60} height={12} borderRadius={6} />
            <Skeleton width={50} height={12} borderRadius={6} />
          </View>
        ))}
        <Skeleton width="100%" height={5} borderRadius={3} style={{ marginTop: 4 }} />
      </View>
    </View>
  </View>
);

// Profile header skeleton
export const SkeletonProfileHeader: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View
    style={[
      { alignItems: 'center', paddingTop: 70, paddingBottom: 36, paddingHorizontal: 24 },
      style,
    ]}
  >
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 1,
          borderColor: 'rgba(124,58,237,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 108,
            height: 108,
            borderRadius: 54,
            borderWidth: 1,
            borderColor: 'rgba(124,58,237,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SkeletonCircle size={96} />
        </View>
      </View>
    </View>
    <Skeleton width={150} height={26} borderRadius={13} style={{ marginBottom: 8 }} />
    <Skeleton width={180} height={14} borderRadius={7} style={{ marginBottom: 14 }} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Skeleton width={70} height={28} borderRadius={14} />
      <Skeleton width={90} height={28} borderRadius={14} />
      <Skeleton width={50} height={28} borderRadius={14} />
    </View>
    <Skeleton width={130} height={44} borderRadius={22} style={{ marginTop: 20 }} />
  </View>
);

// Body stats skeleton
export const SkeletonBodyStats: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[{ flexDirection: 'row', gap: 10, marginBottom: 28 }, style]}>
    {[1, 2, 3].map((i) => (
      <View
        key={i}
        style={{
          flex: 1,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#E4E7F0',
          backgroundColor: '#FFFFFF',
          padding: 16,
          alignItems: 'center',
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <Skeleton width={40} height={40} borderRadius={12} style={{ marginBottom: 10 }} />
        <Skeleton width={60} height={22} borderRadius={11} style={{ marginBottom: 4 }} />
        <Skeleton width={30} height={10} borderRadius={5} />
      </View>
    ))}
  </View>
);

// Menu section skeleton
export const SkeletonMenuSection: React.FC<{ items?: number; style?: ViewStyle }> = ({
  items = 3,
  style,
}) => (
  <View style={style}>
    <Skeleton width={80} height={12} borderRadius={6} style={{ marginBottom: 12 }} />
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E4E7F0',
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {Array.from({ length: items }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: i < items - 1 ? 1 : 0,
            borderColor: '#F0EEFF',
          }}
        >
          <Skeleton width={38} height={38} borderRadius={12} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={14} borderRadius={7} />
            <Skeleton width="40%" height={10} borderRadius={5} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={20} height={20} borderRadius={8} />
        </View>
      ))}
    </View>
  </View>
);

const WEEK_CHART_HEIGHTS = [22, 35, 18, 40, 28, 38, 15];

// Workout week chart skeleton
export const SkeletonWeekChart: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[{ flexDirection: 'row', gap: 4, paddingHorizontal: 10 }, style]}>
    {WEEK_CHART_HEIGHTS.map((barH, i) => (
      <View key={i} style={{ flex: 1, alignItems: 'center' }}>
        <Skeleton width={20} height={10} borderRadius={5} style={{ marginBottom: 3 }} />
        <Skeleton width={30} height={30} borderRadius={15} style={{ marginBottom: 6 }} />
        <View style={{ width: '80%', height: 44, justifyContent: 'flex-end' }}>
          <Skeleton width="100%" height={barH} borderRadius={4} />
        </View>
      </View>
    ))}
  </View>
);

// Goals stats skeleton (light theme)
export const SkeletonGoalsStats: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[{ flexDirection: 'row', gap: 12 }, style]}>
    {[1, 2, 3].map((i) => (
      <View
        key={i}
        style={{
          flex: 1,
          backgroundColor: '#fff',
          borderRadius: 18,
          padding: 16,
          alignItems: 'center',
          shadowColor: '#6C63FF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <SkeletonLight width={40} height={40} borderRadius={13} style={{ marginBottom: 8 }} />
        <SkeletonLight width={30} height={24} borderRadius={12} style={{ marginBottom: 2 }} />
        <SkeletonLight width={45} height={10} borderRadius={5} />
      </View>
    ))}
  </View>
);

// Skeleton for light backgrounds
const SkeletonLight: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const [shimmerAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });
  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: '#E8ECF4', overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(0,0,0,0.04)',
            'rgba(0,0,0,0.07)',
            'rgba(0,0,0,0.04)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// Goal card skeleton (light theme)
export const SkeletonGoalCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View
    style={[
      {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      },
      style,
    ]}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <SkeletonLight width={44} height={44} borderRadius={12} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <SkeletonLight width="60%" height={16} borderRadius={8} />
        <SkeletonLight width="40%" height={12} borderRadius={6} style={{ marginTop: 4 }} />
      </View>
      <SkeletonLight width={60} height={24} borderRadius={12} />
    </View>
    <SkeletonLight width="100%" height={8} borderRadius={4} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
      <SkeletonLight width={80} height={12} borderRadius={6} />
      <SkeletonLight width={60} height={12} borderRadius={6} />
    </View>
  </View>
);

// Metric screen header skeleton
export const SkeletonMetricHeader: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[{ alignItems: 'center', paddingVertical: 20 }, style]}>
    <Skeleton width={160} height={48} borderRadius={24} style={{ marginBottom: 8 }} />
    <Skeleton width={100} height={14} borderRadius={7} style={{ marginBottom: 20 }} />
    <View style={{ flexDirection: 'row', gap: 20 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ alignItems: 'center' }}>
          <Skeleton width={50} height={20} borderRadius={10} />
          <Skeleton width={40} height={12} borderRadius={6} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  </View>
);

// Chart skeleton
export const SkeletonChart: React.FC<{ height?: number; style?: ViewStyle }> = ({
  height = 200,
  style,
}) => (
  <View
    style={[
      {
        height,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        justifyContent: 'flex-end',
      },
      style,
    ]}
  >
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: height - 60 }}>
      {[0.55, 0.85, 0.4, 1.0, 0.7, 0.9, 0.5].map((ratio, i) => (
        <View key={i} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Skeleton width="100%" height={Math.max(30, ratio * (height - 100))} borderRadius={4} />
        </View>
      ))}
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((_, i) => (
        <Skeleton key={i} width={20} height={10} borderRadius={5} />
      ))}
    </View>
  </View>
);

// Steps screen skeleton
export const SkeletonStepsScreen: React.FC = () => (
  <View style={{ padding: 20 }}>
    <SkeletonMetricHeader />
    <Skeleton width={120} height={16} borderRadius={8} style={{ marginBottom: 12 }} />
    <SkeletonChart height={220} style={{ marginBottom: 20 }} />
    <Skeleton width={140} height={16} borderRadius={8} style={{ marginBottom: 12 }} />
    <SkeletonCard height={100} style={{ marginBottom: 12 }} />
    <SkeletonCard height={100} />
  </View>
);

// Water screen header skeleton
export const SkeletonWaterHeader: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[{ alignItems: 'center', paddingTop: 20 }, style]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <Skeleton width={36} height={36} borderRadius={18} />
      <Skeleton width={80} height={20} borderRadius={10} />
      <Skeleton width={36} height={36} borderRadius={18} />
    </View>
    <SkeletonRing size={220} style={{ marginVertical: 20 }} />
    <Skeleton width={120} height={12} borderRadius={6} style={{ marginBottom: 10 }} />
    <Skeleton width={80} height={28} borderRadius={14} />
  </View>
);

// ── Full Dashboard skeleton ───────────────────────────────────────────────────
// Mirrors every section of DashboardScreen's ScrollView content exactly.
export const DashboardSkeleton: React.FC = () => (
  <View style={{ paddingHorizontal: 20, paddingBottom: 110 }}>
    <StatusBar barStyle="dark-content" />
    {/* Hero progress ring card */}
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#EDE9FE',
        marginTop: 20,
        padding: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 4,
      }}
    >
      <View style={{ flex: 1 }}>
        <Skeleton width={100} height={10} borderRadius={5} style={{ marginBottom: 10 }} />
        <Skeleton width={150} height={28} borderRadius={14} style={{ marginBottom: 6 }} />
        <Skeleton width={180} height={13} borderRadius={6} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View>
            <Skeleton width={46} height={16} borderRadius={8} />
            <Skeleton width={38} height={10} borderRadius={5} style={{ marginTop: 5 }} />
          </View>
          <View>
            <Skeleton width={70} height={16} borderRadius={8} />
            <Skeleton width={38} height={10} borderRadius={5} style={{ marginTop: 5 }} />
          </View>
        </View>
      </View>
      <SkeletonRing size={120} />
    </View>

    {/* Water card */}
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#DBEAFE',
        padding: 20,
        marginTop: 16,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Skeleton width={38} height={38} borderRadius={12} />
          <View>
            <Skeleton width={90} height={14} borderRadius={7} />
            <Skeleton width={70} height={10} borderRadius={5} style={{ marginTop: 5 }} />
          </View>
        </View>
        <Skeleton width={48} height={26} borderRadius={10} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <SkeletonRing size={110} />
        <View style={{ flex: 1, gap: 11 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={60} height={12} borderRadius={6} />
              <Skeleton width={50} height={12} borderRadius={6} />
            </View>
          ))}
          <Skeleton width="100%" height={5} borderRadius={3} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>

    {/* Today Target card */}
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginTop: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <View>
          <Skeleton width={90} height={14} borderRadius={7} />
          <Skeleton width={130} height={11} borderRadius={5} style={{ marginTop: 5 }} />
        </View>
      </View>
      <Skeleton width={72} height={36} borderRadius={RADIUS.full} />
    </View>

    {/* Section title: Activity Status */}
    <Skeleton
      width={130}
      height={17}
      borderRadius={8}
      style={{ marginTop: 28, marginBottom: 14 }}
    />

    {/* Stats 2×2 grid */}
    <SkeletonStatsGrid />

    {/* Section title: Workout Progress */}
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 28,
        marginBottom: 14,
      }}
    >
      <Skeleton width={150} height={17} borderRadius={8} />
      <Skeleton width={60} height={26} borderRadius={RADIUS.full} />
    </View>

    {/* Weekly bar chart card */}
    <View
      style={{
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
        {[55, 80, 35, 100, 65, 90, 45].map((h, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ width: '100%', height: 80, justifyContent: 'flex-end' }}>
              <Skeleton width="100%" height={(h / 100) * 80} borderRadius={8} />
            </View>
            <Skeleton width={10} height={10} borderRadius={5} />
          </View>
        ))}
      </View>
    </View>

    {/* Section title: Upcoming Workouts */}
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 28,
        marginBottom: 14,
      }}
    >
      <Skeleton width={160} height={17} borderRadius={8} />
      <Skeleton width={55} height={14} borderRadius={7} />
    </View>

    {/* Workout list items */}
    <SkeletonListItem style={{ marginBottom: 12 }} />
    <SkeletonListItem style={{ marginBottom: 12 }} />
    <SkeletonListItem />
  </View>
);

// ── WorkoutSkeleton ───────────────────────────────────────────────────────────
// Mirrors: header gradient (title + week nav + week chart) + stats row + tabs + list items
export const WorkoutSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: '#F4F5FA' }}>
    <StatusBar barStyle="dark-content" />
    {/* Header area */}
    <View
      style={{
        backgroundColor: '#EEF0FF',
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 28,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
      }}
    >
      {/* Title row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Skeleton width={140} height={18} borderRadius={9} />
        <Skeleton width={40} height={40} borderRadius={12} />
      </View>
      {/* Week nav */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <Skeleton width={32} height={32} borderRadius={10} />
        <Skeleton width={120} height={12} borderRadius={6} />
        <Skeleton width={32} height={32} borderRadius={10} />
      </View>
      {/* Week chart */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {WEEK_CHART_HEIGHTS.map((barH, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Skeleton width={20} height={10} borderRadius={5} style={{ marginBottom: 3 }} />
            <Skeleton width={30} height={30} borderRadius={15} style={{ marginBottom: 6 }} />
            <View style={{ width: '80%', height: 44, justifyContent: 'flex-end' }}>
              <Skeleton width="100%" height={barH} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>

    {/* Stats row */}
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, paddingHorizontal: 20 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: COLORS.bgCard,
            borderRadius: RADIUS.lg,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 14,
            alignItems: 'center',
          }}
        >
          <Skeleton width={40} height={20} borderRadius={10} style={{ marginBottom: 6 }} />
          <Skeleton width={50} height={10} borderRadius={5} />
          <Skeleton width={35} height={10} borderRadius={5} style={{ marginTop: 3 }} />
        </View>
      ))}
    </View>

    {/* Tabs */}
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        marginTop: 24,
        paddingHorizontal: 20,
        marginBottom: 16,
      }}
    >
      <Skeleton width="50%" height={40} borderRadius={RADIUS.full} />
      <Skeleton width="50%" height={40} borderRadius={RADIUS.full} />
    </View>

    {/* List items */}
    <View style={{ paddingHorizontal: 20 }}>
      <SkeletonListItem style={{ marginBottom: 12 }} />
      <SkeletonListItem style={{ marginBottom: 12 }} />
      <SkeletonListItem style={{ marginBottom: 12 }} />
    </View>
  </View>
);

// ── ProfileSkeleton ───────────────────────────────────────────────────────────
// Mirrors: decorative bg + hero avatar/name/pills/button + body stats + info card + menu sections
export const ProfileSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: '#F4F5FA' }}>
    <StatusBar barStyle="dark-content" />
    {/* Hero */}
    <View
      style={{ alignItems: 'center', paddingTop: 70, paddingBottom: 36, paddingHorizontal: 24 }}
    >
      {/* Avatar rings */}
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 1,
          borderColor: '#DDD6FE',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <View
          style={{
            width: 108,
            height: 108,
            borderRadius: 54,
            borderWidth: 1,
            borderColor: '#C4B5FD',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SkeletonCircle size={96} />
        </View>
      </View>
      <Skeleton width={160} height={26} borderRadius={13} style={{ marginBottom: 8 }} />
      <Skeleton width={160} height={14} borderRadius={7} style={{ marginBottom: 14 }} />
      {/* Pills */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <Skeleton width={70} height={28} borderRadius={14} />
        <Skeleton width={90} height={28} borderRadius={14} />
        <Skeleton width={55} height={28} borderRadius={14} />
      </View>
      <Skeleton width={140} height={44} borderRadius={22} />
    </View>

    {/* Body */}
    <View style={{ paddingHorizontal: 20 }}>
      <Skeleton width={80} height={12} borderRadius={6} style={{ marginBottom: 12 }} />
      <SkeletonBodyStats />
      <Skeleton width={100} height={12} borderRadius={6} style={{ marginBottom: 12 }} />
      <SkeletonMenuSection items={4} style={{ marginBottom: 24 }} />
      <SkeletonMenuSection items={2} style={{ marginBottom: 24 }} />
      <SkeletonMenuSection items={3} style={{ marginBottom: 24 }} />
    </View>
  </View>
);

// ── GoalsSkeleton ─────────────────────────────────────────────────────────────
// Mirrors: dark header + stats row + goal cards list (light bg theme)
export const GoalsSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: '#F4F5FA' }}>
    <StatusBar barStyle="dark-content" />
    {/* Header */}
    <View
      style={{
        backgroundColor: '#F4F5FA',
        paddingTop: 56,
        paddingBottom: 16,
        paddingHorizontal: 24,
      }}
    >
      <Skeleton width={100} height={26} borderRadius={13} style={{ marginBottom: 6 }} />
      <Skeleton width={180} height={13} borderRadius={6} />
    </View>

    <View style={{ paddingHorizontal: 20 }}>
      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 12, marginVertical: 16 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 18,
              padding: 16,
              alignItems: 'center',
              shadowColor: '#6C63FF',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <SkeletonLight width={40} height={40} borderRadius={13} style={{ marginBottom: 8 }} />
            <SkeletonLight width={28} height={24} borderRadius={12} style={{ marginBottom: 4 }} />
            <SkeletonLight width={44} height={10} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Goal cards */}
      <SkeletonGoalCard />
      <SkeletonGoalCard />
      <SkeletonGoalCard />
    </View>
  </View>
);

// ── MetricsSkeleton ───────────────────────────────────────────────────────────
// Mirrors: dark header + filter chips row + chart card + list items (light bg)
export const MetricsSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: '#F4F5FA' }}>
    <StatusBar barStyle="dark-content" />
    {/* Header */}
    <View
      style={{
        backgroundColor: '#F4F5FA',
        paddingTop: 56,
        paddingBottom: 16,
        paddingHorizontal: 24,
      }}
    >
      <Skeleton width={90} height={26} borderRadius={13} style={{ marginBottom: 6 }} />
      <Skeleton width={180} height={13} borderRadius={6} />
    </View>

    <View style={{ paddingHorizontal: 16 }}>
      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 16 }}>
        {[60, 80, 70, 90, 65].map((w, i) => (
          <SkeletonLight key={i} width={w} height={34} borderRadius={17} />
        ))}
      </View>

      {/* Chart card */}
      <SkeletonChart height={180} style={{ marginBottom: 16 }} />

      {/* List title */}
      <SkeletonLight width={60} height={14} borderRadius={7} style={{ marginBottom: 12 }} />

      {/* List items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <SkeletonLight width={44} height={44} borderRadius={12} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <SkeletonLight width="60%" height={14} borderRadius={7} />
            <SkeletonLight width="40%" height={10} borderRadius={5} style={{ marginTop: 4 }} />
          </View>
          <SkeletonLight width={40} height={18} borderRadius={9} />
        </View>
      ))}
    </View>
  </View>
);

// ── StepsSkeleton ─────────────────────────────────────────────────────────────
// Mirrors: dark gradient header (title + big ring + goal row) + stats cards + bar chart card + goal setter
export const StepsSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="dark-content" />
    {/* Header */}
    <View
      style={{
        backgroundColor: COLORS.bg,
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
      }}
    >
      <Skeleton width={130} height={18} borderRadius={9} style={{ marginBottom: 24 }} />
      {/* Big ring */}
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <SkeletonRing size={220} />
      </View>
      {/* Goal row */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <Skeleton width={70} height={13} borderRadius={6} />
        <Skeleton width={90} height={13} borderRadius={6} />
      </View>
    </View>

    <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
      {/* Weekly stats row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
              alignItems: 'center',
            }}
          >
            <Skeleton width={44} height={20} borderRadius={10} style={{ marginBottom: 6 }} />
            <Skeleton width={55} height={10} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Bar chart card */}
      <View
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <Skeleton width={80} height={13} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 156 }}>
          {[55, 80, 35, 100, 65, 90, 45].map((h, i) => (
            <View key={i} style={{ flex: 1, justifyContent: 'flex-end' }}>
              <Skeleton width="100%" height={(h / 100) * 120} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>

      {/* Goal setter card */}
      <View
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 16,
        }}
      >
        <Skeleton width={80} height={13} borderRadius={6} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} width={70} height={34} borderRadius={RADIUS.full} />
          ))}
        </View>
      </View>
    </View>
  </View>
);

// ── SleepSkeleton ─────────────────────────────────────────────────────────────
// Mirrors: header row + bedtime/wake summary card + stats row + weekly chart card + alarm list
export const SleepSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="dark-content" />
    {/* Header */}
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 16,
      }}
    >
      <View>
        <Skeleton width={140} height={22} borderRadius={11} style={{ marginBottom: 6 }} />
        <Skeleton width={180} height={12} borderRadius={6} />
      </View>
      <Skeleton width={100} height={36} borderRadius={20} />
    </View>

    <View style={{ paddingHorizontal: 20 }}>
      {/* Bedtime / Wake summary card */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: '#EDE9FE',
          padding: 20,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07,
          shadowRadius: 14,
          elevation: 3,
        }}
      >
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 6 }} />
          <Skeleton width={50} height={9} borderRadius={5} style={{ marginBottom: 4 }} />
          <Skeleton width={70} height={20} borderRadius={10} />
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
          <Skeleton width={60} height={30} borderRadius={15} style={{ marginBottom: 4 }} />
          <Skeleton width={40} height={10} borderRadius={5} />
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 6 }} />
          <Skeleton width={50} height={9} borderRadius={5} style={{ marginBottom: 4 }} />
          <Skeleton width={70} height={20} borderRadius={10} />
        </View>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View
          style={{
            flex: 1.5,
            backgroundColor: '#FFFFFF',
            borderRadius: RADIUS.xl,
            borderWidth: 1,
            borderColor: '#EDE9FE',
            padding: 14,
            alignItems: 'center',
            minHeight: 90,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <Skeleton width={60} height={9} borderRadius={5} style={{ marginBottom: 8 }} />
          <Skeleton width={80} height={24} borderRadius={12} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={11} borderRadius={5} />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: RADIUS.xl,
            borderWidth: 1,
            borderColor: '#ECFEFF',
            padding: 14,
            alignItems: 'center',
            minHeight: 90,
            shadowColor: '#06B6D4',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <Skeleton width={55} height={9} borderRadius={5} style={{ marginBottom: 8 }} />
          <Skeleton width={50} height={24} borderRadius={12} style={{ marginBottom: 4 }} />
          <Skeleton width={55} height={11} borderRadius={5} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SkeletonRing size={90} />
        </View>
      </View>

      {/* Weekly chart card */}
      <View
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 20,
          marginBottom: 4,
        }}
      >
        <Skeleton width={100} height={15} borderRadius={7} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 }}>
          {[35, 50, 25, 65, 45, 55, 40].map((h, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Skeleton width="100%" height={h} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>

      {/* Alarms section header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 20,
          marginBottom: 12,
        }}
      >
        <Skeleton width={140} height={15} borderRadius={7} />
        <Skeleton width={60} height={30} borderRadius={16} />
      </View>

      {/* Alarm cards */}
      <SkeletonListItem style={{ marginBottom: 10 }} />
      <SkeletonListItem />
    </View>
  </View>
);

// ── CaloriesSkeleton ──────────────────────────────────────────────────────────
// Mirrors: dark gradient header (title + profile btn + ring) + macro stats + chart card + activity list
export const CaloriesSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="dark-content" />
    {/* Header */}
    <View
      style={{
        backgroundColor: COLORS.bg,
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
      }}
    >
      {/* Title + profile btn */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Skeleton width={150} height={18} borderRadius={9} />
        <Skeleton width={110} height={36} borderRadius={RADIUS.full} />
      </View>
      {/* Ring */}
      <View style={{ alignItems: 'center' }}>
        <SkeletonRing size={210} />
      </View>
    </View>

    <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
      {/* Macro stats row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
              alignItems: 'center',
            }}
          >
            <Skeleton width={40} height={20} borderRadius={10} style={{ marginBottom: 6 }} />
            <Skeleton width={50} height={10} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Weekly chart card */}
      <View
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <Skeleton width={80} height={13} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140 }}>
          {[55, 80, 35, 100, 65, 90, 45].map((h, i) => (
            <View key={i} style={{ flex: 1, justifyContent: 'flex-end' }}>
              <Skeleton width="100%" height={(h / 100) * 110} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>

      {/* Activity list */}
      <Skeleton width={120} height={13} borderRadius={6} style={{ marginBottom: 12 }} />
      <SkeletonListItem style={{ marginBottom: 12 }} />
      <SkeletonListItem style={{ marginBottom: 12 }} />
      <SkeletonListItem />
    </View>
  </View>
);

// ── MealPlannerSkeleton ───────────────────────────────────────────────────────
// Mirrors: header + macro card + category cards + filter chips + meal list
export const MealPlannerSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="dark-content" />
    {/* Header */}
    <View style={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16 }}>
      <Skeleton width={120} height={17} borderRadius={8} />
    </View>

    <View style={{ paddingHorizontal: 20 }}>
      {/* Macro progress card */}
      <View
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <Skeleton width={130} height={14} borderRadius={7} style={{ marginBottom: 16 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <Skeleton width={70} height={12} borderRadius={6} />
              <Skeleton width={60} height={12} borderRadius={6} />
            </View>
            <Skeleton width="100%" height={6} borderRadius={3} />
          </View>
        ))}
      </View>

      {/* Category grid */}
      <Skeleton width={100} height={14} borderRadius={7} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              width: '47%',
              backgroundColor: COLORS.bgCard,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 16,
            }}
          >
            <Skeleton width={40} height={40} borderRadius={12} style={{ marginBottom: 10 }} />
            <Skeleton width="70%" height={14} borderRadius={7} style={{ marginBottom: 4 }} />
            <Skeleton width="50%" height={10} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[50, 80, 55, 65, 70].map((w, i) => (
          <Skeleton key={i} width={w} height={34} borderRadius={RADIUS.full} />
        ))}
      </View>

      {/* Meal list */}
      <SkeletonListItem style={{ marginBottom: 12 }} hasImage />
      <SkeletonListItem style={{ marginBottom: 12 }} hasImage />
      <SkeletonListItem hasImage />
    </View>
  </View>
);

// ── WaterSkeleton ─────────────────────────────────────────────────────────────
// Mirrors: header (title + date nav + glass + stats) + quick-add row +
//          progress card + goal chips card + log header + 3 log rows + tip card
export const WaterSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="dark-content" />

    {/* ── Header (matches LinearGradient header in real screen) ── */}
    <View
      style={{
        backgroundColor: COLORS.bg,
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 28,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        borderBottomWidth: 1,
        borderBottomColor: '#DBEAFE',
      }}
    >
      {/* Title */}
      <Skeleton width={160} height={22} borderRadius={11} style={{ marginBottom: 16 }} />

      {/* Date nav row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Skeleton width={36} height={36} borderRadius={18} />
        <View style={{ alignItems: 'center', gap: 5 }}>
          <Skeleton width={80} height={16} borderRadius={8} />
          <Skeleton width={90} height={11} borderRadius={6} />
        </View>
        <Skeleton width={36} height={36} borderRadius={18} />
      </View>

      {/* Glass — exact SVG replica of WaterGlass */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <SkeletonGlass />
      </View>

      {/* Swipe hint + status badge */}
      <View style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Skeleton width={160} height={12} borderRadius={6} />
        <Skeleton width={120} height={30} borderRadius={15} />
      </View>

      {/* Stats row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          backgroundColor: COLORS.bgCard,
          borderRadius: 20,
          paddingVertical: 16,
          marginHorizontal: 20,
          marginTop: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 7 }}>
            <Skeleton width={54} height={18} borderRadius={9} />
            <Skeleton width={54} height={10} borderRadius={5} />
          </View>
        ))}
      </View>
    </View>

    {/* ── Body ── */}
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, marginTop: 20, paddingBottom: 110 }}
    >
      {/* Quick add title + 4 chips */}
      <Skeleton width={90} height={17} borderRadius={8} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={(SCREEN_WIDTH - 80) / 4} height={62} borderRadius={16} />
        ))}
      </View>

      {/* Progress card */}
      <View
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 18,
          marginBottom: 16,
          shadowColor: '#3B82F6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Skeleton width={100} height={13} borderRadius={6} />
          <Skeleton width={80} height={13} borderRadius={6} />
        </View>
        <Skeleton width="100%" height={12} borderRadius={99} style={{ marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width={32} height={10} borderRadius={5} />
          <Skeleton width={28} height={10} borderRadius={5} />
          <Skeleton width={50} height={10} borderRadius={5} />
        </View>
      </View>

      {/* Goal chips card */}
      <View
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 16,
          marginBottom: 20,
          shadowColor: '#3B82F6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <Skeleton width={80} height={13} borderRadius={6} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} width={56} height={34} borderRadius={RADIUS.full} />
          ))}
        </View>
      </View>

      {/* Log section */}
      <Skeleton width={100} height={17} borderRadius={8} style={{ marginBottom: 12 }} />
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: COLORS.bgCard,
            borderRadius: RADIUS.lg,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={8} height={8} borderRadius={4} />
            <Skeleton width={60} height={14} borderRadius={7} />
          </View>
          <Skeleton width={44} height={12} borderRadius={6} />
        </View>
      ))}

      {/* Tip card */}
      <View
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: '#DBEAFE',
          padding: 16,
          marginTop: 4,
        }}
      >
        <Skeleton width={120} height={12} borderRadius={6} style={{ marginBottom: 10 }} />
        <Skeleton width="100%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
        <Skeleton width="80%" height={12} borderRadius={6} />
      </View>
    </ScrollView>
  </View>
);

export default Skeleton;
