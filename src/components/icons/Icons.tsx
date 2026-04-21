import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

const d = (size: number, color: string, sw: number, children: React.ReactNode) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </Svg>
);

export const IconHome = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <Polyline points="9,22 9,12 15,12 15,22" />
    </>
  );

export const IconActivity = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </>
  );

export const IconSearch = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  );

export const IconCamera = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <Circle cx="12" cy="13" r="4" />
    </>
  );

export const IconUser = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </>
  );

export const IconBell = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 01-3.46 0" />
    </>
  );

export const IconSettings = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  );

export const IconHeart = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </>
  );

export const IconDroplet = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
    </>
  );

export const IconMoon = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </>
  );

export const IconFlame = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </>
  );

export const IconDumbbell = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M6.5 6.5h11M6.5 17.5h11M3 12h18" />
      <Rect x="2" y="9.5" width="2" height="5" rx="1" />
      <Rect x="20" y="9.5" width="2" height="5" rx="1" />
      <Rect x="5" y="7.5" width="2" height="9" rx="1" />
      <Rect x="17" y="7.5" width="2" height="9" rx="1" />
    </>
  );

export const IconRun = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Circle cx="17" cy="4" r="1.5" />
      <Path d="M11 6l-1.5 4.5 3 3-1 5 2-1 1.5-4.5-2.5-2.5z" />
      <Path d="M8 17l-2 2M14 8l2 2-1 3" />
    </>
  );

export const IconApple = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M12 3c1.5-1.5 4-1 5 1-1 .5-2.5 2-2 4-2-1.5-4 0-4-2.5 0-1 .5-1.5 1-2.5z" />
      <Path d="M6 8c-2 1.5-3 4-2.5 7s2 5 4 6c.5.5 1 .5 1.5.5s1-.5 2.5-.5 2 .5 2.5.5 1 0 1.5-.5c2-1 3.5-3 4-6s0-5.5-2.5-7c-1-1-2-1.5-3-1.5s-1.5.5-3 .5S7 7 6 8z" />
    </>
  );

export const IconChevronRight = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(size, color, strokeWidth, <Polyline points="9,18 15,12 9,6" />);

export const IconPlus = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </>
  );

export const IconArrowLeft = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Line x1="19" y1="12" x2="5" y2="12" />
      <Polyline points="12,19 5,12 12,5" />
    </>
  );

export const IconCheck = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(size, color, strokeWidth, <Polyline points="20,6 9,17 4,12" />);

export const IconTrophy = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <Path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <Path d="M4 22h16" />
      <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <Path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </>
  );

export const IconLogOut = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <Polyline points="16,17 21,12 16,7" />
      <Line x1="21" y1="12" x2="9" y2="12" />
    </>
  );

export const IconLock = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path d="M7 11V7a5 5 0 0110 0v4" />
    </>
  );

export const IconMail = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <Polyline points="22,6 12,13 2,6" />
    </>
  );

export const IconPhone = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </>
  );

export const IconEye = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  );

export const IconMoreVertical = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Circle cx="12" cy="5" r="1" fill={color} />
      <Circle cx="12" cy="12" r="1" fill={color} />
      <Circle cx="12" cy="19" r="1" fill={color} />
    </>
  );

export const IconAlarm = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Circle cx="12" cy="13" r="8" />
      <Path d="M12 9v4l2 2" />
      <Path d="M5 3L2 6M22 6l-3-3" />
    </>
  );

export const IconTarget = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Circle cx="12" cy="12" r="10" />
      <Circle cx="12" cy="12" r="6" />
      <Circle cx="12" cy="12" r="2" />
    </>
  );

export const IconTrash = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Path d="M10 11v6M14 11v6" />
      <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  );

export const IconEdit = ({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) =>
  d(
    size,
    color,
    strokeWidth,
    <>
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  );
