import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type Props = {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0-1
  gradientColors?: [string, string];
  trackColor?: string;
  label?: string;
  sublabel?: string;
  centerContent?: React.ReactNode;
};

const RingProgress: React.FC<Props> = ({
  size = 160,
  strokeWidth = 14,
  progress,
  gradientColors = ['#7C3AED', '#06B6D4'],
  trackColor = 'rgba(255,255,255,0.08)',
  label,
  sublabel,
  centerContent,
}) => {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const gradId = `ring_${size}_${gradientColors[0].replace('#', '')}`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors[0]} />
            <Stop offset="100%" stopColor={gradientColors[1]} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {/* Progress arc */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx},${cy}`}
        />
      </Svg>
      {/* Center content */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {centerContent ?? (
          <>
            {label && (
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
                {label}
              </Text>
            )}
            {sublabel && (
              <Text
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 12,
                  fontWeight: '500',
                  marginTop: 2,
                }}
              >
                {sublabel}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default RingProgress;
