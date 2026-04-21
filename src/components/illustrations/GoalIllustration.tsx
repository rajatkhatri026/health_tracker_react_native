import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

const GoalIllustration: React.FC<Props> = ({ width = 200, height = 160 }) => (
  <Svg width={width} height={height} viewBox="0 0 200 160">
    {/* Background */}
    <Circle cx="100" cy="80" r="65" fill="#EEF0FF" />

    {/* Target/bullseye */}
    <Circle cx="100" cy="80" r="50" fill="white" />
    <Circle cx="100" cy="80" r="40" fill="#FF658420" />
    <Circle cx="100" cy="80" r="28" fill="#FF658440" />
    <Circle cx="100" cy="80" r="16" fill="#FF6584" />
    <Circle cx="100" cy="80" r="6" fill="white" />

    {/* Arrow */}
    <Path d="M148 32 L104 76" stroke="#6C63FF" strokeWidth="4" strokeLinecap="round" />
    <Path
      d="M140 28 L150 28 L150 38"
      stroke="#6C63FF"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Arrow head at target */}
    <Circle cx="100" cy="80" r="3" fill="#6C63FF" />

    {/* Trophy */}
    <Path d="M75 115 Q75 108 80 105 L80 98 L88 98 L88 105 Q93 108 93 115Z" fill="#FF9F43" />
    <Rect x="79" y="115" width="10" height="4" rx="2" fill="#FF9F43" />
    <Rect x="75" y="119" width="18" height="3" rx="1.5" fill="#FFB85C" />
    <Path
      d="M80 104 Q74 104 72 98 Q70 92 76 90"
      stroke="#FF9F43"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    <Path
      d="M88 104 Q94 104 96 98 Q98 92 92 90"
      stroke="#FF9F43"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />

    {/* Stars */}
    <Path d="M52 55 L53.5 51 L55 55 L59 56 L55 57 L53.5 61 L52 57 L48 56Z" fill="#FF9F43" />
    <Path
      d="M148 110 L149 107 L150 110 L153 111 L150 112 L149 115 L148 112 L145 111Z"
      fill="#43D9AD"
    />
    <Circle cx="58" cy="110" r="4" fill="#6C63FF" opacity="0.3" />
    <Circle cx="155" cy="48" r="3" fill="#FF6584" opacity="0.4" />

    {/* Confetti */}
    <Rect
      x="38"
      y="65"
      width="6"
      height="6"
      rx="1"
      fill="#6C63FF"
      opacity="0.5"
      transform="rotate(20,41,68)"
    />
    <Rect
      x="155"
      y="70"
      width="6"
      height="6"
      rx="1"
      fill="#FF6584"
      opacity="0.5"
      transform="rotate(-15,158,73)"
    />
    <Rect
      x="130"
      y="120"
      width="5"
      height="5"
      rx="1"
      fill="#FF9F43"
      opacity="0.5"
      transform="rotate(10,132,122)"
    />
  </Svg>
);

export default GoalIllustration;
