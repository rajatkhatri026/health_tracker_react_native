import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Path } from 'react-native-svg';

type Props = {
  size?: number; // icon mark size
  showText?: boolean; // show "Nexara" wordmark beside icon
  textSize?: number;
  variant?: 'full' | 'icon'; // full = icon + text, icon = icon only
};

/**
 * Nexara Logo Mark
 *
 * Design concept: An "N" formed by two rising pulse/heartbeat arcs
 * enclosed in a soft hexagonal shield — representing vitality (pulse),
 * forward motion (N for Nexara), and protection (shield = your health guardian).
 * The purple → cyan gradient echoes the app's primary brand gradient.
 */
const NexaraLogo: React.FC<Props> = ({
  size = 48,
  showText = false,
  textSize,
  variant = 'icon',
}) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.44; // shield radius

  // Hexagon-ish shield path (6-sided with rounded top/bottom)
  const hex = (R: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return [cx + R * Math.cos(angle), cy + R * Math.sin(angle)];
    });
    return (
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') +
      ' Z'
    );
  };

  // "N" pulse path: left pillar up → diagonal down-right → right pillar up
  // with a small heartbeat spike in the middle diagonal
  const unit = s / 48;
  const left = cx - s * 0.14;
  const right = cx + s * 0.14;
  const top = cy - s * 0.155;
  const bot = cy + s * 0.155;
  const midX = cx;
  const spikeUp = cy - s * 0.22;
  const spikeDn = cy + s * 0.12;

  // Path: left-bottom → left-top → spike-down → spike-up → right-bottom → right-top
  const nPath = [
    `M ${left} ${bot}`,
    `L ${left} ${top}`,
    `L ${midX - unit * 3} ${spikeDn}`,
    `L ${midX} ${spikeUp}`,
    `L ${midX + unit * 3} ${spikeDn}`,
    `L ${right} ${top}`,
    `L ${right} ${bot}`,
  ].join(' ');

  const fontSize = textSize ?? size * 0.58;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.22 }}>
      {/* Icon mark */}
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          {/* Shield gradient: deep purple → cyan */}
          <LinearGradient id="nx_shield" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#5B21B6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0891B2" stopOpacity="1" />
          </LinearGradient>
          {/* Shield border glow */}
          <LinearGradient id="nx_border" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#67E8F9" stopOpacity="0.9" />
          </LinearGradient>
          {/* N-pulse stroke gradient */}
          <LinearGradient id="nx_pulse" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#C4B5FD" />
            <Stop offset="50%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#A5F3FC" />
          </LinearGradient>
          {/* Subtle inner glow circle */}
          <LinearGradient id="nx_glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0.08" />
          </LinearGradient>
        </Defs>

        {/* Shield background */}
        <Path d={hex(r)} fill="url(#nx_shield)" />

        {/* Inner glow layer */}
        <Circle cx={cx} cy={cy} r={r * 0.78} fill="url(#nx_glow)" />

        {/* Shield border */}
        <Path d={hex(r)} fill="none" stroke="url(#nx_border)" strokeWidth={s * 0.025} />

        {/* N + pulse mark */}
        <Path
          d={nPath}
          fill="none"
          stroke="url(#nx_pulse)"
          strokeWidth={s * 0.072}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Small dot accent at spike peak */}
        <Circle cx={midX} cy={spikeUp} r={s * 0.04} fill="#FFFFFF" fillOpacity="0.9" />
      </Svg>

      {/* Wordmark */}
      {(showText || variant === 'full') && (
        <Text
          style={{
            fontSize,
            fontWeight: '800',
            color: '#FFFFFF',
            letterSpacing: -0.5,
            includeFontPadding: false,
          }}
        >
          Nex<Text style={{ color: '#A78BFA' }}>ara</Text>
        </Text>
      )}
    </View>
  );
};

export default NexaraLogo;
