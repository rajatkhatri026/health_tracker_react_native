import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { styles } from './MetricChart.styles';

interface DataPoint {
  label: string;
  value: number;
}

interface MetricChartProps {
  data: DataPoint[];
  color?: string;
  unit?: string;
}

const MetricChart: React.FC<MetricChartProps> = ({ data, color = '#92A3FD' }) => {
  if (data.length < 2) return null;

  const width = Dimensions.get('window').width - 64;
  const height = 180;
  const padL = 36,
    padR = 12,
    padT = 12,
    padB = 32;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padT + chartH - ((v - minV) / range) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');

  return (
    <View style={styles.wrapper}>
      <Svg width={width} height={height}>
        {/* Y axis labels */}
        <SvgText x={padL - 4} y={padT + 4} fontSize={9} fill="#ADB5BD" textAnchor="end">
          {Math.round(maxV)}
        </SvgText>
        <SvgText x={padL - 4} y={padT + chartH} fontSize={9} fill="#ADB5BD" textAnchor="end">
          {Math.round(minV)}
        </SvgText>

        {/* Grid line */}
        <Line
          x1={padL}
          y1={padT + chartH / 2}
          x2={width - padR}
          y2={padT + chartH / 2}
          stroke="#F0F0F0"
          strokeWidth={1}
        />

        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {data.map((d, i) => (
          <Circle key={i} cx={toX(i)} cy={toY(d.value)} r={3} fill={color} />
        ))}

        {/* X labels — show first, middle, last */}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => (
          <SvgText
            key={i}
            x={toX(i)}
            y={height - 6}
            fontSize={9}
            fill="#ADB5BD"
            textAnchor="middle"
          >
            {data[i].label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

export default MetricChart;
