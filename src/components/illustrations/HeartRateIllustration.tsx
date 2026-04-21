import React from 'react';
import Svg, { Circle, Path, Polyline, G } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

const HeartRateIllustration: React.FC<Props> = ({ width = 200, height = 140 }) => (
  <Svg width={width} height={height} viewBox="0 0 200 140">
    <Circle cx="100" cy="70" r="60" fill="#FFF0F5" />
    <Circle cx="100" cy="70" r="48" fill="#FFE0EB" opacity="0.5" />

    {/* Heart */}
    <Path
      d="M100 95 C80 80 55 65 55 48 C55 36 64 28 74 28 C82 28 90 33 100 42 C110 33 118 28 126 28 C136 28 145 36 145 48 C145 65 120 80 100 95Z"
      fill="#FF6584"
    />
    <Path
      d="M100 88 C84 75 63 62 63 48 C63 39 69 34 76 34 C83 34 90 38 100 47"
      fill="#FF8FA3"
      opacity="0.5"
    />

    {/* ECG line across heart */}
    <Polyline
      points="55,70 68,70 74,58 80,82 86,62 92,70 108,70 114,58 120,82 126,62 132,70 145,70"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Pulse rings */}
    <Circle cx="100" cy="70" r="52" stroke="#FF6584" strokeWidth="1.5" fill="none" opacity="0.3" />
    <Circle cx="100" cy="70" r="58" stroke="#FF6584" strokeWidth="1" fill="none" opacity="0.15" />

    {/* BPM label */}
    <G>
      <Circle cx="100" cy="115" r="16" fill="white" opacity="0.9" />
    </G>
  </Svg>
);

export default HeartRateIllustration;
