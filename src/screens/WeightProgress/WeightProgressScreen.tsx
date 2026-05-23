import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  Circle,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getMetrics, createMetric, deleteMetric } from '../../api/metrics';
import type { Metric } from '../../types';
import { COLORS, RADIUS } from '../../utils/theme';

const { width: W } = Dimensions.get('window');
const CHART_W = W - 48;
const CHART_H = 200;
const PAD = { l: 44, r: 16, t: 16, b: 36 };

type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL';

// ── BMI helpers ───────────────────────────────────────────────────────────────
const calcBMI = (weightKg: number, heightCm: number) =>
  heightCm > 0 ? weightKg / Math.pow(heightCm / 100, 2) : 0;

const bmiCategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6', bg: '#EFF6FF' };
  if (bmi < 25) return { label: 'Normal', color: '#10B981', bg: '#F0FDF4' };
  if (bmi < 30) return { label: 'Overweight', color: '#F59E0B', bg: '#FFFBEB' };
  return { label: 'Obese', color: '#EF4444', bg: '#FEF2F2' };
};

// Estimate body fat % via US Navy / BMI method (simple approximation)
const estimateBodyFat = (bmi: number, age: number, isMale: boolean) => {
  // Deurenberg formula
  const bf = 1.2 * bmi + 0.23 * age - (isMale ? 16.2 : 5.4);
  return Math.max(0, Math.round(bf * 10) / 10);
};

const idealWeight = (heightCm: number) => {
  // Hamwi formula
  const base = heightCm > 152 ? (heightCm - 152) * 0.9 : 0;
  return { min: Math.round(48 + base), max: Math.round(58 + base) };
};

// ── SVG line chart ────────────────────────────────────────────────────────────
const WeightChart: React.FC<{ data: { date: string; value: number }[] }> = ({ data }) => {
  if (data.length < 2)
    return (
      <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
          Log at least 2 entries to see the chart
        </Text>
      </View>
    );

  const cW = CHART_W - PAD.l - PAD.r;
  const cH = CHART_H - PAD.t - PAD.b;
  const vals = data.map((d) => d.value);
  const minV = Math.min(...vals) - 1;
  const maxV = Math.max(...vals) + 1;
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD.l + (i / (data.length - 1)) * cW;
  const toY = (v: number) => PAD.t + cH - ((v - minV) / range) * cH;

  // Smooth bezier path
  const pathD = data.reduce((acc, d, i) => {
    const x = toX(i);
    const y = toY(d.value);
    if (i === 0) return `M${x},${y}`;
    const px = toX(i - 1);
    const py = toY(data[i - 1].value);
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, '');

  // Area fill path
  const areaD = `${pathD} L${toX(data.length - 1)},${PAD.t + cH} L${PAD.l},${PAD.t + cH} Z`;

  // Trend: down = good (weight loss), up = gain
  const trend = data[data.length - 1].value - data[0].value;
  const trendColor = trend < 0 ? '#10B981' : trend > 0 ? '#EF4444' : '#7C3AED';

  // X labels — show up to 5 evenly spaced
  const labelIdx =
    data.length <= 5
      ? data.map((_, i) => i)
      : [
          0,
          Math.floor(data.length * 0.25),
          Math.floor(data.length * 0.5),
          Math.floor(data.length * 0.75),
          data.length - 1,
        ];

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <SvgGrad id="areafill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={trendColor} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={trendColor} stopOpacity="0.01" />
        </SvgGrad>
      </Defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = PAD.t + cH * t;
        const v = Math.round(maxV - t * range);
        return (
          <React.Fragment key={i}>
            <Line x1={PAD.l} y1={y} x2={CHART_W - PAD.r} y2={y} stroke="#F0EEFF" strokeWidth={1} />
            <SvgText x={PAD.l - 6} y={y + 4} fontSize={9} fill="#ADB5BD" textAnchor="end">
              {v}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Area fill */}
      <Path d={areaD} fill="url(#areafill)" />

      {/* Line */}
      <Path
        d={pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots — show first, last, and min/max */}
      {data.map((d, i) => {
        const isKey =
          i === 0 ||
          i === data.length - 1 ||
          d.value === Math.min(...vals) ||
          d.value === Math.max(...vals);
        return isKey ? (
          <React.Fragment key={i}>
            <Circle
              cx={toX(i)}
              cy={toY(d.value)}
              r={5}
              fill="#fff"
              stroke={trendColor}
              strokeWidth={2}
            />
            <SvgText
              x={toX(i)}
              y={toY(d.value) - 10}
              fontSize={9}
              fill={trendColor}
              textAnchor="middle"
              fontWeight="700"
            >
              {d.value}
            </SvgText>
          </React.Fragment>
        ) : null;
      })}

      {/* X labels */}
      {labelIdx.map((i) => (
        <SvgText key={i} x={toX(i)} y={CHART_H - 6} fontSize={9} fill="#ADB5BD" textAnchor="middle">
          {data[i].date}
        </SvgText>
      ))}
    </Svg>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const WeightProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('3M');
  const [weightInput, setWeightInput] = useState('');
  const [logging, setLogging] = useState(false);

  // Profile data for BMI (from onboarding saved in profile)
  const [heightCm, setHeightCm] = useState(170);
  const [age, setAge] = useState(25);
  const [isMale, setIsMale] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const from = rangeFrom(range);
      const data = await getMetrics(user.user_id, { type: 'weight', from });
      setMetrics(
        data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      );
    } catch {
      Alert.alert('Error', 'Failed to load weight data.');
    } finally {
      setLoading(false);
    }
  }, [user, range]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = metrics.map((m) => ({
    date: new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: Math.round(m.value * 10) / 10,
  }));

  const latest = metrics.length > 0 ? metrics[metrics.length - 1].value : 0;
  const first = metrics.length > 0 ? metrics[0].value : 0;
  const change = latest - first;
  const bmi = calcBMI(latest, heightCm);
  const bmiCat = bmiCategory(bmi);
  const bodyFat = latest > 0 ? estimateBodyFat(bmi, age, isMale) : 0;
  const ideal = idealWeight(heightCm);
  const toIdeal = latest > 0 ? Math.round((latest - (ideal.min + ideal.max) / 2) * 10) / 10 : 0;

  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 20 || w > 500) {
      Alert.alert('Invalid', 'Enter a valid weight (20–500 kg)');
      return;
    }
    if (!user) return;
    setLogging(true);
    try {
      await createMetric(user.user_id, {
        type: 'weight',
        value: w,
        unit: 'kg',
        timestamp: new Date().toISOString(),
        source: 'manual',
      });
      setWeightInput('');
      await load();
    } catch {
      Alert.alert('Error', 'Failed to log weight.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Weight Progress</Text>
          <Text style={s.headerSub}>Track your journey</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 32 }}
      >
        {/* Stats row */}
        {latest > 0 && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statVal}>{latest} kg</Text>
              <Text style={s.statLabel}>Current</Text>
            </View>
            <View
              style={[
                s.statCard,
                { borderColor: change < 0 ? '#A7F3D0' : change > 0 ? '#FCA5A5' : COLORS.border },
              ]}
            >
              <Text
                style={[
                  s.statVal,
                  { color: change < 0 ? '#10B981' : change > 0 ? '#EF4444' : COLORS.text },
                ]}
              >
                {change > 0 ? '+' : ''}
                {Math.round(change * 10) / 10} kg
              </Text>
              <Text style={s.statLabel}>Change</Text>
            </View>
            <View
              style={[s.statCard, { backgroundColor: bmiCat.bg, borderColor: bmiCat.color + '40' }]}
            >
              <Text style={[s.statVal, { color: bmiCat.color }]}>{bmi.toFixed(1)}</Text>
              <Text style={[s.statLabel, { color: bmiCat.color }]}>BMI · {bmiCat.label}</Text>
            </View>
          </View>
        )}

        {/* Chart card */}
        <View style={s.card}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={s.cardTitle}>Weight History</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['1M', '3M', '6M', '1Y', 'ALL'] as Range[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRange(r)}
                  style={[s.rangeChip, range === r && s.rangeChipActive]}
                >
                  <Text style={[s.rangeChipTxt, range === r && { color: '#7C3AED' }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ height: CHART_H }} />
          ) : (
            <WeightChart data={chartData} />
          )}
        </View>

        {/* Log weight */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Log Today&apos;s Weight</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TextInput
              style={s.input}
              placeholder="e.g. 72.5"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
            />
            <TouchableOpacity
              onPress={logWeight}
              disabled={logging}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={['#7C3AED', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: RADIUS.full,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {logging ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Log kg</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* BMI + Body Fat card */}
        {latest > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Body Analysis</Text>

            {/* BMI gauge */}
            <View style={s.bmiRow}>
              <View style={[s.bmiBadge, { backgroundColor: bmiCat.bg }]}>
                <Text style={[s.bmiNum, { color: bmiCat.color }]}>{bmi.toFixed(1)}</Text>
                <Text style={[s.bmiCat, { color: bmiCat.color }]}>{bmiCat.label}</Text>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                {/* BMI scale bar */}
                <View style={s.bmiScaleWrap}>
                  {[
                    { label: 'Under', color: '#3B82F6', range: [0, 18.5] },
                    { label: 'Normal', color: '#10B981', range: [18.5, 25] },
                    { label: 'Over', color: '#F59E0B', range: [25, 30] },
                    { label: 'Obese', color: '#EF4444', range: [30, 40] },
                  ].map((seg) => (
                    <View
                      key={seg.label}
                      style={[
                        s.bmiSeg,
                        { backgroundColor: seg.color + '30', flex: seg.range[1] - seg.range[0] },
                      ]}
                    >
                      <Text style={[s.bmiSegTxt, { color: seg.color }]}>{seg.label}</Text>
                    </View>
                  ))}
                </View>
                {/* Stats */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <View style={s.analysisStat}>
                    <Text style={s.analysisVal}>{bodyFat}%</Text>
                    <Text style={s.analysisLbl}>Est. Body Fat</Text>
                  </View>
                  <View style={s.analysisStat}>
                    <Text style={s.analysisVal}>
                      {ideal.min}–{ideal.max} kg
                    </Text>
                    <Text style={s.analysisLbl}>Ideal Weight</Text>
                  </View>
                  <View style={s.analysisStat}>
                    <Text
                      style={[
                        s.analysisVal,
                        { color: toIdeal < 0 ? '#10B981' : toIdeal > 0 ? '#F59E0B' : '#7C3AED' },
                      ]}
                    >
                      {toIdeal === 0 ? '✓ On target' : `${toIdeal > 0 ? '+' : ''}${toIdeal} kg`}
                    </Text>
                    <Text style={s.analysisLbl}>To Ideal</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={s.disclaimer}>
              <Text style={s.disclaimerTxt}>
                ⚕️ BMI and body fat % are estimates. Consult a healthcare professional for a full
                assessment.
              </Text>
            </View>
          </View>
        )}

        {/* Recent logs */}
        {metrics.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Recent Logs</Text>
            {metrics
              .slice(-10)
              .reverse()
              .map((m) => (
                <View key={m.metric_id} style={s.logRow}>
                  <View style={s.logDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.logVal}>{m.value} kg</Text>
                    <Text style={s.logDate}>
                      {new Date(m.timestamp).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!user) return;
                      await deleteMetric(user.user_id, m.metric_id);
                      setMetrics((prev) => prev.filter((x) => x.metric_id !== m.metric_id));
                    }}
                  >
                    <Text style={{ fontSize: 18, color: '#EF4444' }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const rangeFrom = (r: Range): string => {
  const d = new Date();
  if (r === '1M') d.setMonth(d.getMonth() - 1);
  else if (r === '3M') d.setMonth(d.getMonth() - 3);
  else if (r === '6M') d.setMonth(d.getMonth() - 6);
  else if (r === '1Y') d.setFullYear(d.getFullYear() - 1);
  else return new Date(0).toISOString();
  return d.toISOString();
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: COLORS.text, lineHeight: 24 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 0 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    margin: 20,
    marginBottom: 0,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  rangeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput,
  },
  rangeChipActive: { backgroundColor: '#EDE9FE' },
  rangeChipTxt: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
  },
  bmiRow: { flexDirection: 'row', gap: 16, marginTop: 14, alignItems: 'flex-start' },
  bmiBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bmiNum: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  bmiCat: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  bmiScaleWrap: { flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', gap: 2 },
  bmiSeg: { alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  bmiSegTxt: { fontSize: 8, fontWeight: '700' },
  analysisStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    padding: 8,
  },
  analysisVal: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  analysisLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED' },
  logVal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  logDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  disclaimer: {
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  disclaimerTxt: { fontSize: 11, color: '#065F46', lineHeight: 16 },
});

export default WeightProgressScreen;
