import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

const RunnerIllustration: React.FC<Props> = ({ width = 280, height = 200 }) => (
  <Svg width={width} height={height} viewBox="0 0 280 200">
    {/* Ground shadow */}
    <Ellipse cx="140" cy="188" rx="80" ry="8" fill="#6C63FF" opacity="0.1" />

    {/* Background circle */}
    <Circle cx="140" cy="95" r="80" fill="#EEF0FF" />
    <Circle cx="140" cy="95" r="65" fill="#E4E1FF" />

    {/* Track lines */}
    <Path
      d="M60 160 Q140 150 220 160"
      stroke="#6C63FF"
      strokeWidth="2"
      strokeDasharray="6,4"
      opacity="0.3"
      fill="none"
    />

    {/* Runner body */}
    {/* Head */}
    <Circle cx="158" cy="62" r="16" fill="#FFB89A" />
    {/* Hair */}
    <Path d="M143 58 Q150 48 165 52 Q170 58 165 58 Q158 52 150 58Z" fill="#3D2C2C" />

    {/* Torso - running vest */}
    <Path d="M148 78 Q155 75 168 78 L172 110 Q160 115 148 110Z" fill="#6C63FF" />
    {/* Vest stripe */}
    <Path d="M155 78 L153 110" stroke="#9B8FFF" strokeWidth="3" opacity="0.6" />

    {/* Left arm (forward) */}
    <Path
      d="M150 82 Q138 90 132 98"
      stroke="#FFB89A"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx="130" cy="100" r="5" fill="#FFB89A" />

    {/* Right arm (back) */}
    <Path
      d="M166 82 Q178 90 182 100"
      stroke="#FFB89A"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx="183" cy="102" r="5" fill="#FFB89A" />

    {/* Shorts */}
    <Path d="M148 108 L150 128 L160 128 L160 108Z" fill="#FF6584" />
    <Path d="M160 108 L160 128 L170 128 L172 108Z" fill="#E8415E" />

    {/* Left leg (forward stride) */}
    <Path
      d="M152 128 Q148 145 138 158"
      stroke="#FFB89A"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
    />
    {/* Left shoe */}
    <Ellipse cx="134" cy="160" rx="12" ry="6" fill="#1A1A2E" />
    <Path d="M124 158 Q134 154 146 158" stroke="#6C63FF" strokeWidth="3" fill="none" />

    {/* Right leg (back stride) */}
    <Path
      d="M166 128 Q172 142 178 152"
      stroke="#FFB89A"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
    />
    {/* Right shoe */}
    <Ellipse cx="180" cy="155" rx="12" ry="6" fill="#1A1A2E" />
    <Path d="M170 153 Q180 149 192 153" stroke="#FF6584" strokeWidth="3" fill="none" />

    {/* Speed lines */}
    <Path
      d="M100 80 L118 80"
      stroke="#6C63FF"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.4"
    />
    <Path d="M95 90 L115 90" stroke="#FF6584" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    <Path
      d="M100 100 L116 100"
      stroke="#43D9AD"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.3"
    />

    {/* Floating stats */}
    <Rect x="32" y="55" width="56" height="28" rx="14" fill="white" opacity="0.95" />
    <G>
      <Path
        d="M44 65 L44 75 M48 62 L48 75 M52 68 L52 75"
        stroke="#6C63FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </G>
    <Rect x="55" y="61" width="24" height="10" rx="4" fill="none" />

    <Rect x="192" y="45" width="56" height="28" rx="14" fill="white" opacity="0.95" />
    <Circle cx="207" cy="59" r="6" fill="#FF658420" />
    <Path
      d="M204 62 Q207 56 210 62"
      stroke="#FF6584"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);

export default RunnerIllustration;
