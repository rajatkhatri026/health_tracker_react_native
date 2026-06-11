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
        borderColor: '#E0F7FA',
        padding: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#0891B2',
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
          shadowColor: '#0891B2',
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
        shadowColor: '#0891B2',
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
export const DashboardSkeleton: React.FC = () => (
  <View style={{ paddingHorizontal: 20, paddingBottom: 110 }}>
    <StatusBar barStyle="dark-content" />
    {/* Hero progress ring card */}
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#E0F7FA',
        marginTop: 20,
        padding: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#0891B2',
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
export const WorkoutSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
    <GradientHero>
      {/* Week bar chart preview */}
      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'flex-end', height: 70 }}>
        {[55, 80, 40, 100, 65, 90, 50].map((h, i) => (
          <View key={i} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View
              style={{
                width: '100%',
                height: Math.max(4, (h / 100) * 60),
                borderRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
          </View>
        ))}
      </View>
    </GradientHero>
    <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12, marginTop: HERO_H }}>
      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Skeleton width={40} height={22} borderRadius={11} />
            <Skeleton width={55} height={10} borderRadius={5} />
          </View>
        ))}
      </View>
      <SkeletonListItem />
      <SkeletonListItem />
      <SkeletonListItem />
    </View>
  </View>
);

// ── ProfileSkeleton ───────────────────────────────────────────────────────────
export const ProfileSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
    {/* Hero — gradient with avatar centred */}
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HERO_H, zIndex: 10 }}>
      <LinearGradient
        colors={['#0C2340', '#0891B2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: HERO_H,
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Top row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.15)',
            }}
          />
          <View
            style={{
              width: 120,
              height: 16,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          />
          <View
            style={{
              width: 70,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.15)',
            }}
          />
        </View>
        {/* Avatar + name */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          />
          <View
            style={{
              width: 130,
              height: 16,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          />
          {/* Pills */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[60, 80, 60, 70].map((w, i) => (
              <View
                key={i}
                style={{
                  width: w,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </View>
        </View>
        {/* Edit button */}
        <View
          style={{
            width: 140,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)',
          }}
        />
      </LinearGradient>
    </View>
    <ScrollView
      style={{ marginTop: HERO_H }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 80, gap: 20 }}
    >
      <SkeletonMenuSection items={3} />
      <SkeletonMenuSection items={2} />
      <SkeletonMenuSection items={3} />
    </ScrollView>
  </View>
);

// ── GoalsSkeleton ─────────────────────────────────────────────────────────────
export const GoalsSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
    <GradientHero>
      {/* 3 stat chips */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </View>
    </GradientHero>
    <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12, marginTop: HERO_H }}>
      <SkeletonGoalCard />
      <SkeletonGoalCard />
      <SkeletonGoalCard />
    </View>
  </View>
);

// ── MetricsSkeleton ───────────────────────────────────────────────────────────
export const MetricsSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
    <GradientHero>
      {/* Filter chips row */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[60, 80, 70, 90, 65].map((w, i) => (
          <View
            key={i}
            style={{
              width: w,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </View>
    </GradientHero>
    <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12, marginTop: HERO_H }}>
      <ContentCard height={160} bars={7} />
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Shared hero skeleton helpers — match the fixed 280px #0C2340→#0891B2 gradient
// hero used on all tracker screens.
// ─────────────────────────────────────────────────────────────────────────────
const HERO_H = 280;

const SkeletonFrost: React.FC<{ size?: number; borderRadius?: number; style?: ViewStyle }> = ({
  size = 120,
  borderRadius = 14,
  style,
}) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius,
        backgroundColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
      },
      style,
    ]}
  >
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.06)' }} />
  </View>
);

const SkeletonChip: React.FC<{ wide?: boolean }> = ({ wide }) => (
  <View
    style={{
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 10,
      height: 42,
      width: wide ? '100%' : '100%',
    }}
  />
);

const GradientHero: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HERO_H, zIndex: 10 }}>
    <LinearGradient
      colors={['#0C2340', '#0891B2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        height: HERO_H,
        paddingTop: 56,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
        justifyContent: 'space-between',
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.15)',
          }}
        />
        <View
          style={{
            width: 120,
            height: 16,
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />
        <View
          style={{
            width: 60,
            height: 30,
            borderRadius: 15,
            backgroundColor: 'rgba(255,255,255,0.15)',
          }}
        />
      </View>
      {/* Content slot */}
      {children}
      {/* Bottom tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 12,
          padding: 3,
          gap: 3,
        }}
      >
        <View
          style={{
            flex: 1,
            height: 34,
            borderRadius: 9,
            backgroundColor: 'rgba(255,255,255,0.18)',
          }}
        />
        <View style={{ flex: 1, height: 34, borderRadius: 9 }} />
      </View>
    </LinearGradient>
  </View>
);

const ContentCard: React.FC<{ height?: number; bars?: number; chips?: number }> = ({
  height = 100,
  bars,
  chips,
}) => (
  <View
    style={{
      backgroundColor: '#fff',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 16,
      height,
      shadowColor: '#0891B2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
    }}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
      <Skeleton width={100} height={13} borderRadius={6} />
      <Skeleton width={50} height={22} borderRadius={11} />
    </View>
    {bars && (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, flex: 1 }}>
        {[55, 80, 40, 100, 65, 90, 50].slice(0, bars).map((h, i) => (
          <View key={i} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Skeleton
              width="100%"
              height={Math.max(4, (h / 100) * (height - 55))}
              borderRadius={5}
            />
          </View>
        ))}
      </View>
    )}
    {chips && (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        {Array.from({ length: chips }).map((_, i) => (
          <Skeleton key={i} width={64} height={32} borderRadius={RADIUS.full} />
        ))}
      </View>
    )}
  </View>
);

// ── StepsSkeleton ─────────────────────────────────────────────────────────────
export const StepsSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
    <GradientHero>
      {/* Ring left + 3 chips right */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <SkeletonFrost size={160} borderRadius={80} />
        <View style={{ flex: 1, gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonChip key={i} />
          ))}
        </View>
      </View>
    </GradientHero>
    <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14, marginTop: HERO_H }}>
      <ContentCard height={110} bars={7} />
      <ContentCard height={90} chips={6} />
    </View>
  </View>
);

// ── SleepSkeleton ─────────────────────────────────────────────────────────────
export const SleepSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
    <GradientHero>
      {/* Bedtime / Wake / Duration chips */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonFrost size={110} borderRadius={14} />
          <SkeletonFrost size={110} borderRadius={14} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </View>
      </View>
    </GradientHero>
    <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14, marginTop: HERO_H }}>
      <ContentCard height={110} bars={7} />
      <SkeletonListItem style={{ marginBottom: 0 }} />
      <SkeletonListItem />
    </View>
  </View>
);

// ── CaloriesSkeleton ──────────────────────────────────────────────────────────
export const CaloriesSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
    {/* Amber/red gradient hero — matches CaloriesScreen */}
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HERO_H, zIndex: 10 }}>
      <LinearGradient
        colors={['#7C2D12', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: HERO_H,
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          overflow: 'hidden',
          justifyContent: 'space-between',
        }}
      >
        {/* Top row */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
            <View
              style={{
                width: 130,
                height: 16,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
          </View>
          <View
            style={{
              width: 80,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}
          />
        </View>
        {/* Ring + chips */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingTop: 8 }}
        >
          <SkeletonFrost size={130} borderRadius={65} />
          <View style={{ flex: 1, gap: 7 }}>
            {[1, 2, 3].map((i) => (
              <SkeletonChip key={i} />
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
    <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14, marginTop: HERO_H }}>
      {/* Breakdown chips */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width="48%" height={62} borderRadius={16} />
        <Skeleton width="48%" height={62} borderRadius={16} />
      </View>
      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Skeleton width={40} height={22} borderRadius={11} />
            <Skeleton width={50} height={10} borderRadius={5} />
          </View>
        ))}
      </View>
      <ContentCard height={140} bars={7} />
    </View>
  </View>
);

// ── MealPlannerSkeleton ───────────────────────────────────────────────────────
export const MealPlannerSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
    <GradientHero>
      {/* Ring + GOAL/EATEN/REMAINING chips */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <SkeletonFrost size={118} borderRadius={59} />
        <View style={{ flex: 1, gap: 7 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonChip key={i} />
          ))}
        </View>
      </View>
    </GradientHero>
    <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14, marginTop: HERO_H }}>
      {/* Macro cards */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 12,
              alignItems: 'center',
              gap: 5,
            }}
          >
            <SkeletonRing size={64} />
            <Skeleton width={44} height={10} borderRadius={5} />
          </View>
        ))}
      </View>
      <ContentCard height={120} bars={7} />
      <SkeletonListItem />
      <SkeletonListItem />
      <SkeletonListItem />
    </View>
  </View>
);

// ── WaterSkeleton ─────────────────────────────────────────────────────────────
export const WaterSkeleton: React.FC = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

    <GradientHero>
      {/* Glass left + 3 chips right */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <SkeletonFrost size={99} borderRadius={14} style={{ height: 135 }} />
        <View style={{ flex: 1, gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonChip key={i} />
          ))}
        </View>
      </View>
    </GradientHero>
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ marginTop: HERO_H }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 110, gap: 14 }}
    >
      {/* Quick add chips */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={(SCREEN_WIDTH - 80) / 4} height={62} borderRadius={16} />
        ))}
      </View>
      <ContentCard height={80} />
      <ContentCard height={90} chips={6} />
      <SkeletonListItem />
      <SkeletonListItem />
      <SkeletonListItem />
    </ScrollView>
  </View>
);

export default Skeleton;
