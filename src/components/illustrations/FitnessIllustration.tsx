import React from 'react';
import Svg, { Circle, Path, Rect, Ellipse } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

const FitnessIllustration: React.FC<Props> = ({ width = 240, height = 180 }) => (
  <Svg width={width} height={height} viewBox="0 0 240 180">
    {/* Background blobs */}
    <Circle cx="120" cy="85" r="70" fill="#EEF0FF" />
    <Circle cx="60" cy="50" r="20" fill="#6C63FF" opacity="0.08" />
    <Circle cx="190" cy="130" r="25" fill="#FF6584" opacity="0.08" />

    {/* Dumbbell */}
    <Rect x="60" y="82" width="120" height="16" rx="8" fill="#6C63FF" opacity="0.15" />
    <Rect x="72" y="82" width="96" height="16" rx="4" fill="#6C63FF" opacity="0.3" />

    {/* Left weight plate */}
    <Rect x="48" y="70" width="28" height="40" rx="8" fill="#4B44CC" />
    <Rect x="52" y="74" width="20" height="32" rx="6" fill="#6C63FF" />
    <Rect x="56" y="78" width="12" height="24" rx="4" fill="#9B8FFF" opacity="0.5" />

    {/* Right weight plate */}
    <Rect x="164" y="70" width="28" height="40" rx="8" fill="#4B44CC" />
    <Rect x="168" y="74" width="20" height="32" rx="6" fill="#6C63FF" />
    <Rect x="172" y="78" width="12" height="24" rx="4" fill="#9B8FFF" opacity="0.5" />

    {/* Person lifting */}
    {/* Head */}
    <Circle cx="120" cy="42" r="14" fill="#FFB89A" />
    <Path d="M108 38 Q112 30 124 32 Q130 36 126 40 Q120 34 112 40Z" fill="#3D2C2C" />

    {/* Body */}
    <Path d="M110 56 Q120 52 130 56 L132 80 Q120 84 108 80Z" fill="#FF6584" />

    {/* Arms up holding bar */}
    <Path
      d="M110 60 Q95 70 85 82"
      stroke="#FFB89A"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M130 60 Q145 70 155 82"
      stroke="#FFB89A"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />

    {/* Hands */}
    <Circle cx="82" cy="84" r="6" fill="#FFB89A" />
    <Circle cx="158" cy="84" r="6" fill="#FFB89A" />

    {/* Legs */}
    <Path
      d="M114 80 Q110 100 106 116"
      stroke="#FFB89A"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M126 80 Q130 100 134 116"
      stroke="#FFB89A"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
    />

    {/* Shoes */}
    <Ellipse cx="104" cy="118" rx="10" ry="5" fill="#1A1A2E" />
    <Ellipse cx="136" cy="118" rx="10" ry="5" fill="#1A1A2E" />

    {/* Sweat drops */}
    <Path d="M98 45 Q96 50 98 55 Q100 50 98 45Z" fill="#6C63FF" opacity="0.4" />
    <Path d="M143 40 Q141 44 143 48 Q145 44 143 40Z" fill="#6C63FF" opacity="0.3" />

    {/* Stars/energy */}
    <Path
      d="M168 48 L170 44 L172 48 L176 50 L172 52 L170 56 L168 52 L164 50Z"
      fill="#FF9F43"
      opacity="0.8"
    />
    <Path
      d="M62 52 L63.5 49 L65 52 L68 53 L65 54 L63.5 57 L62 54 L59 53Z"
      fill="#43D9AD"
      opacity="0.8"
    />
  </Svg>
);

export default FitnessIllustration;
