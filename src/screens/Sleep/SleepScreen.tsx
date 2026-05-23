import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  StatusBar,
  Dimensions,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  Circle,
  G,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSleep } from '../../hooks/useSleep';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import RingProgress from '../../components/RingProgress/RingProgress';
import { SleepSkeleton } from '../../components/Skeleton/Skeleton';
import {
  IconMoon,
  IconAlarm,
  IconPlus,
  IconTrash,
  IconBed,
  IconStar,
  IconChevronDown,
  IconChevronUp,
} from '../../components/icons/Icons';
import type { SleepSchedule, SleepEntry } from '../../api/local';
import {
  requestNotificationPermission,
  scheduleAlarmNotification,
  cancelAlarmNotification,
} from '../../utils/alarmNotifications';

const { width } = Dimensions.get('window');
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LABEL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_SLEEP = 10;
const SLEEP_GOAL_HRS = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt12 = (time24: string) => {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

const calcDuration = (bed: string, wake: string): number => {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
};

const durationLabel = (hrs: number) => {
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const sleepCycleSuggestions = (wakeTime: string): string[] => {
  const [wh, wm] = wakeTime.split(':').map(Number);
  const wakeMin = wh * 60 + wm;
  return [6, 5, 4].map((cycles) => {
    let bed = wakeMin - cycles * 90 - 15;
    if (bed < 0) bed += 24 * 60;
    return `${pad(Math.floor(bed / 60))}:${pad(bed % 60)}`;
  });
};

const qualityLabel = (score: number) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
};

// ── Sleep Wave Chart ──────────────────────────────────────────────────────────

const SleepWave: React.FC<{ data: number[] }> = ({ data }) => {
  const chartW = width - 80;
  const chartH = 80;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * chartW,
    y: chartH - (Math.min(v, MAX_SLEEP) / MAX_SLEEP) * chartH,
  }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i].x - pts[i - 1].x) / 3;
    d += ` C ${pts[i - 1].x + cpx} ${pts[i - 1].y} ${pts[i].x - cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const fill = `${d} L ${pts[pts.length - 1].x} ${chartH} L 0 ${chartH} Z`;
  const todayIdx = new Date().getDay();
  return (
    <Svg width={chartW} height={chartH + 20}>
      <Defs>
        <SvgGrad id="swFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
        </SvgGrad>
        <SvgGrad id="swLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#7C3AED" />
          <Stop offset="100%" stopColor="#06B6D4" />
        </SvgGrad>
      </Defs>
      <Path d={fill} fill="url(#swFill)" />
      <Path d={d} fill="none" stroke="url(#swLine)" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === todayIdx ? 5 : 3}
          fill={i === todayIdx ? '#7C3AED' : COLORS.border}
          stroke={i === todayIdx ? '#A78BFA' : 'none'}
          strokeWidth={2}
        />
      ))}
      {pts.map((p, i) => (
        <SvgText
          key={`l${i}`}
          x={p.x}
          y={chartH + 16}
          fontSize="9"
          fill={i === todayIdx ? COLORS.primary : COLORS.textMuted}
          textAnchor="middle"
        >
          {DAYS_LABEL[i]}
        </SvgText>
      ))}
    </Svg>
  );
};

// ── iOS-style scroll wheel picker ────────────────────────────────────────────

// Native iOS/Android time picker — exact same component the iPhone Clock app uses
const ClockPicker: React.FC<{
  time: string; // "HH:MM" 24h
  onChange: (t: string) => void;
  accentColor: string;
}> = ({ time, onChange }) => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);

  return (
    <DateTimePicker
      value={date}
      mode="time"
      display="spinner"
      is24Hour={false}
      onChange={(_, selected) => {
        if (!selected) return;
        const hh = selected.getHours();
        const mm = selected.getMinutes();
        onChange(`${pad(hh)}:${pad(mm)}`);
      }}
      style={{ width: 280, height: 180 }}
      textColor={COLORS.text}
      themeVariant="light"
    />
  );
};

// ── Add / Edit Alarm Modal ────────────────────────────────────────────────────

type AlarmFormData = {
  type: 'bedtime' | 'alarm';
  time: string;
  label: string;
  days: number[];
  repeat: boolean;
  vibrate: boolean;
  snoozeMin: number;
};

const defaultForm = (type: 'bedtime' | 'alarm'): AlarmFormData => ({
  type,
  time: type === 'bedtime' ? '22:30' : '07:00',
  label: type === 'bedtime' ? 'Bedtime' : 'Wake Up',
  days: [],
  repeat: true,
  vibrate: true,
  snoozeMin: 5,
});

const AlarmModal: React.FC<{
  visible: boolean;
  initial?: Partial<AlarmFormData> & { id?: string };
  onSave: (data: AlarmFormData, id?: string) => void;
  onClose: () => void;
}> = ({ visible, initial, onSave, onClose }) => {
  const [form, setForm] = useState<AlarmFormData>(() =>
    initial ? { ...defaultForm(initial.type ?? 'alarm'), ...initial } : defaultForm('alarm')
  );

  React.useEffect(() => {
    if (visible) {
      const base = defaultForm(initial?.type ?? 'alarm');
      setForm(
        initial
          ? {
              ...base,
              ...initial,
              days: initial.days ?? [],
              repeat: initial.repeat ?? true,
              vibrate: initial.vibrate ?? false,
              snoozeMin: initial.snoozeMin ?? 5,
            }
          : base
      );
    }
  }, [visible, initial]);

  const accent = form.type === 'bedtime' ? '#7C3AED' : '#F59E0B';
  const isEditing = !!initial?.id;
  const modalScrollRef = useRef<ScrollView>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          {/* Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {isEditing ? 'Edit' : 'New'} {form.type === 'bedtime' ? 'Bedtime' : 'Alarm'}
            </Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Type toggle */}
          <View style={s.typeToggleRow}>
            {(['bedtime', 'alarm'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() =>
                  setForm((f) => ({
                    ...f,
                    type: t,
                    label: t === 'bedtime' ? 'Bedtime' : 'Wake Up',
                  }))
                }
                style={[
                  s.typeBtn,
                  form.type === t && { backgroundColor: accent + '33', borderColor: accent },
                ]}
              >
                {t === 'bedtime' ? (
                  <IconMoon size={14} color={form.type === t ? accent : COLORS.textMuted} />
                ) : (
                  <IconAlarm size={14} color={form.type === t ? accent : COLORS.textMuted} />
                )}
                <Text
                  style={[s.typeBtnTxt, { color: form.type === t ? accent : COLORS.textMuted }]}
                >
                  {t === 'bedtime' ? 'Bedtime' : 'Wake Alarm'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView ref={modalScrollRef} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ alignItems: 'center', marginVertical: 4 }}>
              <ClockPicker
                time={form.time}
                onChange={(t) => setForm((f) => ({ ...f, time: t }))}
                accentColor={accent}
              />
            </View>

            {/* Label */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Label</Text>
              <TextInput
                value={form.label}
                onChangeText={(v) => setForm((f) => ({ ...f, label: v }))}
                style={s.fieldInput}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* Days repeat */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Repeat</Text>
              <Switch
                value={form.repeat}
                onValueChange={(v) => setForm((f) => ({ ...f, repeat: v, days: v ? f.days : [] }))}
                trackColor={{ false: COLORS.border, true: accent + '99' }}
                thumbColor={form.repeat ? accent : '#888'}
              />
            </View>

            {form.repeat && (
              <View style={s.daysRow}>
                {DAYS_SHORT.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i],
                      }))
                    }
                    style={[
                      s.dayChip,
                      form.days.includes(i) && {
                        backgroundColor: accent + '33',
                        borderColor: accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.dayChipTxt,
                        { color: form.days.includes(i) ? accent : COLORS.textMuted },
                      ]}
                    >
                      {d.slice(0, 2)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Vibrate */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Vibrate</Text>
              <Switch
                value={form.vibrate}
                onValueChange={(v) => setForm((f) => ({ ...f, vibrate: v }))}
                trackColor={{ false: COLORS.border, true: accent + '99' }}
                thumbColor={form.vibrate ? accent : '#888'}
              />
            </View>

            {/* Snooze */}
            {form.type === 'alarm' && (
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Snooze</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[5, 10, 15].map((min) => (
                    <TouchableOpacity
                      key={min}
                      onPress={() => setForm((f) => ({ ...f, snoozeMin: min }))}
                      style={[
                        s.snoozeChip,
                        form.snoozeMin === min && {
                          backgroundColor: accent + '33',
                          borderColor: accent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.snoozeChipTxt,
                          { color: form.snoozeMin === min ? accent : COLORS.textMuted },
                        ]}
                      >
                        {min}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Bedtime suggestions */}
            {form.type === 'bedtime' && (
              <View style={{ marginTop: 8, marginBottom: 4 }}>
                <Text style={[s.fieldLabel, { marginBottom: 8 }]}>
                  Sleep cycle suggestions (wake at {fmt12(form.time.replace(form.time, '07:00'))})
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {sleepCycleSuggestions('07:00').map((t, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setForm((f) => ({ ...f, time: t }))}
                      style={[s.snoozeChip, { paddingHorizontal: 12 }]}
                    >
                      <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{fmt12(t)}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>
                        {' '}
                        · {6 - i * 1} cycles
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Save */}
          <TouchableOpacity
            onPress={() => onSave(form, initial?.id)}
            style={[s.saveBtn, { backgroundColor: accent }]}
          >
            <Text style={s.saveBtnTxt}>{isEditing ? 'Save Changes' : 'Add Alarm'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Sleep Arc (mini arc showing bedtime → wake visually) ─────────────────────

const SleepArc: React.FC<{ bedtime: string; wakeTime: string; durationHrs: number }> = ({
  durationHrs,
}) => {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const R = 72;
  const stroke = 13;
  const circumference = 2 * Math.PI * R;
  const maxHrs = 12;
  const progress = Math.min(durationHrs / maxHrs, 1);
  const dashLen = circumference * progress;

  const qualColor = durationHrs >= 7 ? '#10B981' : durationHrs >= 5 ? '#F59E0B' : '#EF4444';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGrad id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#7C3AED" />
            <Stop offset="100%" stopColor={qualColor} />
          </SvgGrad>
          <SvgGrad id="trackArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#EDE9FE" />
            <Stop offset="100%" stopColor="#EDE9FE" />
          </SvgGrad>
        </Defs>
        {/* Track */}
        <Circle cx={cx} cy={cy} r={R} stroke="#EDE9FE" strokeWidth={stroke} fill="none" />
        {/* Progress arc */}
        <Circle
          cx={cx}
          cy={cy}
          r={R}
          stroke="url(#arcGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dashLen} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx},${cy}`}
        />
        {/* Moon icon dot at start */}
        <Circle cx={cx} cy={cy - R} r={6} fill="#7C3AED" />
        {/* Wake dot at end */}
        {(() => {
          const angle = (progress * 360 - 90) * (Math.PI / 180);
          const dotX = cx + R * Math.cos(angle);
          const dotY = cy + R * Math.sin(angle);
          return <Circle cx={dotX} cy={dotY} r={6} fill={qualColor} />;
        })()}
      </Svg>
      {/* Center text */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 36, fontWeight: '900', color: COLORS.text, letterSpacing: -1.5 }}>
          {durationLabel(durationHrs)}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
          {durationHrs >= 7 ? '😴 Great sleep!' : durationHrs >= 5 ? '😐 Okay' : '😩 Too short'}
        </Text>
      </View>
    </View>
  );
};

// ── Log Sleep Modal ───────────────────────────────────────────────────────────

const QUALITY_CONFIG = [
  { label: 'Terrible', emoji: '😩', color: '#EF4444', score: 20 },
  { label: 'Poor', emoji: '😞', color: '#F97316', score: 40 },
  { label: 'Okay', emoji: '😐', color: '#F59E0B', score: 60 },
  { label: 'Good', emoji: '😊', color: '#10B981', score: 80 },
  { label: 'Perfect', emoji: '🤩', color: '#7C3AED', score: 100 },
];

const LogSleepModal: React.FC<{
  visible: boolean;
  onSave: (entry: Omit<SleepEntry, 'id'>) => void;
  onClose: () => void;
}> = ({ visible, onSave, onClose }) => {
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(3); // 1-5 index into QUALITY_CONFIG
  const [activeSection, setActiveSection] = useState<'bedtime' | 'wake' | null>(null);

  const durHrs = calcDuration(bedtime, wakeTime);
  const selected = QUALITY_CONFIG[quality - 1];

  const save = () => {
    const today = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`;
    onSave({
      date: dateStr,
      bedtime: new Date().toISOString(),
      wakeTime: new Date().toISOString(),
      durationHrs: durHrs,
      qualityScore: selected.score,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ls.overlay}>
        <View style={ls.sheet}>
          {/* Handle */}
          <View style={ls.handle} />

          {/* Header */}
          <View style={ls.header}>
            <View>
              <Text style={ls.title}>Log Last Night</Text>
              <Text style={ls.subtitle}>How did you sleep?</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ls.closeBtn}>
              <Text style={ls.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* ── Sleep Arc ── */}
            <View style={ls.arcWrap}>
              <SleepArc bedtime={bedtime} wakeTime={wakeTime} durationHrs={durHrs} />
            </View>

            {/* ── Time row ── */}
            <View style={ls.timeRow}>
              {/* Bedtime */}
              <TouchableOpacity
                style={[ls.timeCard, activeSection === 'bedtime' && ls.timeCardActive]}
                onPress={() => setActiveSection(activeSection === 'bedtime' ? null : 'bedtime')}
                activeOpacity={0.8}
              >
                <View style={ls.timeCardIcon}>
                  <IconMoon size={16} color="#7C3AED" />
                </View>
                <Text style={ls.timeCardLabel}>Bedtime</Text>
                <Text style={ls.timeCardValue}>{fmt12(bedtime)}</Text>
                {activeSection === 'bedtime' ? (
                  <IconChevronUp size={14} color={COLORS.primary} />
                ) : (
                  <IconChevronDown size={14} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>

              {/* Arrow */}
              <View style={ls.timeArrow}>
                <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>→</Text>
              </View>

              {/* Wake */}
              <TouchableOpacity
                style={[ls.timeCard, activeSection === 'wake' && ls.timeCardActiveAmber]}
                onPress={() => setActiveSection(activeSection === 'wake' ? null : 'wake')}
                activeOpacity={0.8}
              >
                <View style={[ls.timeCardIcon, { backgroundColor: '#FEF3C7' }]}>
                  <IconAlarm size={16} color="#F59E0B" />
                </View>
                <Text style={ls.timeCardLabel}>Wake Up</Text>
                <Text style={[ls.timeCardValue, { color: '#F59E0B' }]}>{fmt12(wakeTime)}</Text>
                {activeSection === 'wake' ? (
                  <IconChevronUp size={14} color="#F59E0B" />
                ) : (
                  <IconChevronDown size={14} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            {/* ── Inline clock pickers ── */}
            {activeSection === 'bedtime' && (
              <View style={ls.pickerWrap}>
                <LinearGradient colors={['#EDE9FE', '#F8F6FF']} style={ls.pickerGrad}>
                  <Text style={ls.pickerTitle}>Select Bedtime</Text>
                  <ClockPicker time={bedtime} onChange={setBedtime} accentColor="#7C3AED" />
                </LinearGradient>
              </View>
            )}
            {activeSection === 'wake' && (
              <View style={ls.pickerWrap}>
                <LinearGradient colors={['#FEF3C7', '#FFFBEB']} style={ls.pickerGrad}>
                  <Text style={[ls.pickerTitle, { color: '#D97706' }]}>Select Wake Time</Text>
                  <ClockPicker time={wakeTime} onChange={setWakeTime} accentColor="#F59E0B" />
                </LinearGradient>
              </View>
            )}

            {/* ── Quality ── */}
            <View style={ls.qualitySection}>
              <Text style={ls.sectionLabel}>SLEEP QUALITY</Text>
              <View style={ls.qualityRow}>
                {QUALITY_CONFIG.map((q, i) => {
                  const idx = i + 1;
                  const active = quality === idx;
                  return (
                    <TouchableOpacity
                      key={q.label}
                      onPress={() => setQuality(idx)}
                      style={[
                        ls.qualityBtn,
                        active && { borderColor: q.color, backgroundColor: q.color + '15' },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 22 }}>{q.emoji}</Text>
                      <Text
                        style={[
                          ls.qualityBtnLabel,
                          active && { color: q.color, fontWeight: '700' },
                        ]}
                      >
                        {q.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Selected quality summary */}
              <View
                style={[
                  ls.qualitySummary,
                  { borderColor: selected.color + '40', backgroundColor: selected.color + '0D' },
                ]}
              >
                <Text style={{ fontSize: 24 }}>{selected.emoji}</Text>
                <View>
                  <Text style={[ls.qualitySummaryLabel, { color: selected.color }]}>
                    {selected.label} Sleep
                  </Text>
                  <Text style={ls.qualitySummaryScore}>Quality score: {selected.score}/100</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* ── Save button ── */}
          <View style={ls.footer}>
            <TouchableOpacity onPress={save} activeOpacity={0.9}>
              <LinearGradient
                colors={['#7C3AED', '#0891B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={ls.saveBtn}
              >
                <IconBed size={18} color="#fff" />
                <Text style={ls.saveBtnTxt}>Save Sleep Log</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── LogSleepModal styles ──────────────────────────────────────────────────────
const ls = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,26,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '95%',
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: COLORS.textSub, fontSize: 13, fontWeight: '600' },

  arcWrap: { alignItems: 'center', paddingVertical: 12 },

  // Time row
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  timeCard: {
    flex: 1,
    backgroundColor: '#F8F6FF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    alignItems: 'center',
    gap: 4,
  },
  timeCardActive: { borderColor: '#7C3AED', backgroundColor: '#F3EEFF' },
  timeCardActiveAmber: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  timeCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeCardLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  timeCardValue: { fontSize: 18, fontWeight: '800', color: '#7C3AED', letterSpacing: -0.5 },
  timeArrow: { alignItems: 'center', justifyContent: 'center', paddingBottom: 8 },

  // Picker
  pickerWrap: { marginVertical: 8, borderRadius: RADIUS.lg, overflow: 'hidden' },
  pickerGrad: { borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center' },
  pickerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  // Quality
  qualitySection: { marginTop: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  qualityRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  qualityBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  qualityBtnLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', fontWeight: '500' },
  qualitySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  qualitySummaryLabel: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  qualitySummaryScore: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  // Footer
  footer: { paddingVertical: 16, paddingBottom: 28 },
  saveBtn: {
    borderRadius: RADIUS.full,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
});

// ── Alarm Card ────────────────────────────────────────────────────────────────

const AlarmCard: React.FC<{
  item: SleepSchedule;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ item, onToggle, onDelete, onEdit }) => {
  const grad: [string, string] =
    item.type === 'bedtime' ? ['#7C3AED', '#4F46E5'] : ['#F59E0B', '#EF4444'];
  const Icon = item.type === 'bedtime' ? IconMoon : IconAlarm;
  const days = item.days ?? [];
  const daysLabel =
    days.length === 0 || days.length === 7
      ? 'Every day'
      : days.map((d) => DAYS_SHORT[d].slice(0, 2)).join(', ');

  return (
    <TouchableOpacity onPress={onEdit} activeOpacity={0.8}>
      <GlassCard style={s.alarmCard} padding={14} glow={grad[0]}>
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.alarmIcon}
        >
          <Icon size={20} color="#fff" />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.alarmTime}>{fmt12(item.time)}</Text>
            {!item.enabled && (
              <View style={s.offBadge}>
                <Text style={s.offBadgeTxt}>OFF</Text>
              </View>
            )}
          </View>
          <Text style={s.alarmLabel}>{item.label}</Text>
          <Text style={s.alarmDays}>
            {(item.repeat ?? true) ? daysLabel : 'Once'}
            {item.vibrate ? ' · Vibrate' : ''}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconTrash size={16} color={COLORS.textMuted} strokeWidth={1.8} />
          </TouchableOpacity>
          {/* Toggle */}
          <TouchableOpacity
            onPress={onToggle}
            style={[s.toggle, { backgroundColor: item.enabled ? 'transparent' : COLORS.border }]}
          >
            {item.enabled && (
              <LinearGradient
                colors={grad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ ...StyleSheet.absoluteFillObject, borderRadius: 13 }}
              />
            )}
            <View
              style={[s.toggleThumb, { alignSelf: item.enabled ? 'flex-end' : 'flex-start' }]}
            />
          </TouchableOpacity>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

const SleepScreen: React.FC = () => {
  const mainScrollRef = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );
  const [slp0, slp1, slp2, slp3] = useEntranceAnimation(4, { initialDelay: 60, stagger: 110 });
  const {
    schedules,
    loading,
    toggle,
    logSleep,
    addSchedule,
    deleteSchedule,
    updateSchedule,
    lastNight,
    weeklyHours,
  } = useSleep();

  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editItem, setEditItem] = useState<
    (Partial<AlarmFormData> & { id?: string }) | undefined
  >();

  // Request notification permission on first load
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const bedtimeSchedule = schedules.find((s) => s.type === 'bedtime');
  const alarmSchedule = schedules.find((s) => s.type === 'alarm');

  const sleepDuration =
    bedtimeSchedule && alarmSchedule
      ? calcDuration(bedtimeSchedule.time, alarmSchedule.time)
      : null;

  const lastHrs = lastNight?.durationHrs ?? 0;
  const sleepProgress = Math.min(lastHrs / SLEEP_GOAL_HRS, 1);
  const hrs = Math.floor(lastHrs);
  const mins = Math.round((lastHrs - hrs) * 60);

  const weekAvg =
    weeklyHours.filter((h) => h > 0).length > 0
      ? weeklyHours.filter((h) => h > 0).reduce((a, b) => a + b, 0) /
        weeklyHours.filter((h) => h > 0).length
      : 0;

  const handleSaveAlarm = async (data: AlarmFormData, id?: string) => {
    try {
      if (id) {
        await updateSchedule(id, data);
        const updated = {
          ...data,
          id,
          enabled: schedules.find((s) => s.id === id)?.enabled ?? true,
        };
        scheduleAlarmNotification(updated as SleepSchedule).catch(() => {});
      } else {
        await addSchedule({ ...data, enabled: true });
      }
      setShowAlarmModal(false);
    } catch {
      Alert.alert('Error', 'Failed to save alarm. Please try again.');
    }
  };

  // Sync notifications whenever schedules list changes (non-blocking)
  useEffect(() => {
    schedules.forEach((s) => {
      scheduleAlarmNotification(s).catch(() => {});
    });
  }, [schedules]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Alarm', 'Remove this alarm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAlarmNotification(id).catch(() => {});
            await deleteSchedule(id);
          } catch {
            Alert.alert('Error', 'Failed to delete alarm. Please try again.');
          }
        },
      },
    ]);
  };

  const openEdit = (item: SleepSchedule) => {
    setEditItem({ ...item });
    setShowAlarmModal(true);
  };

  if (loading) {
    return <SleepSkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Animated.View style={entranceStyle(slp0)}>
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Sleep Tracker</Text>
            <Text style={s.headerSub}>Track your rest & alarms</Text>
          </View>
          <TouchableOpacity onPress={() => setShowLogModal(true)} style={s.logBtn}>
            <IconBed size={15} color="#7C3AED" strokeWidth={2} />
            <Text style={s.logBtnTxt}>Log Sleep</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 20 }}
      >
        {/* ── Bedtime / Wake summary ── */}
        <Animated.View style={entranceStyle(slp1)}>
          {bedtimeSchedule && alarmSchedule && (
            <View style={s.summaryCard}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={[s.summaryIconWrap, { backgroundColor: COLORS.tintPurple }]}>
                  <IconMoon size={18} color="#A78BFA" />
                </View>
                <Text style={s.summaryLabel}>BEDTIME</Text>
                <Text style={s.summaryTime}>{fmt12(bedtimeSchedule.time)}</Text>
              </View>

              <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
                <View style={s.durationPill}>
                  <Text style={s.durationPillTxt}>
                    {sleepDuration ? durationLabel(sleepDuration) : '--'}
                  </Text>
                </View>

                <Text style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 4 }}>planned</Text>
              </View>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={[s.summaryIconWrap, { backgroundColor: COLORS.tintAmber }]}>
                  <IconAlarm size={18} color="#FCD34D" />
                </View>
                <Text style={s.summaryLabel}>WAKE UP</Text>
                <Text style={[s.summaryTime, { color: '#F59E0B' }]}>
                  {fmt12(alarmSchedule.time)}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
        {/* ── Last night stats ── */}
        <Animated.View style={entranceStyle(slp2)}>
          {/* Stats: ring left + two stat cells right */}
          <View style={s.statsCard}>
            {/* Ring */}
            <View style={s.statsRingWrap}>
              <RingProgress
                size={96}
                strokeWidth={9}
                progress={sleepProgress}
                gradientColors={['#7C3AED', '#A78BFA']}
                trackColor="#EDE9FE"
                centerContent={
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>
                      {lastNight ? `${Math.round(sleepProgress * 100)}%` : '—'}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 1 }}>
                      of goal
                    </Text>
                  </View>
                }
              />
              <Text style={s.statsRingLabel}>Goal: {SLEEP_GOAL_HRS}h</Text>
            </View>

            {/* Divider */}
            <View style={s.statsDivider} />

            {/* Two stat cells stacked */}
            <View style={s.statsCells}>
              {/* Last Night */}
              <View style={s.statsCell}>
                <Text style={s.statsCellLabel}>LAST NIGHT</Text>
                {lastNight ? (
                  <>
                    <Text style={s.statsCellValue} numberOfLines={1}>
                      {hrs}
                      <Text style={s.statsCellUnit}>h </Text>
                      {mins}
                      <Text style={s.statsCellUnit}>m</Text>
                    </Text>
                    <Text style={s.statsCellSub}>{qualityLabel(lastNight.qualityScore)}</Text>
                  </>
                ) : (
                  <Text style={s.statsCellEmpty}>Not logged</Text>
                )}
              </View>

              {/* Horizontal divider */}
              <View style={s.statsCellDivider} />

              {/* Avg / Week */}
              <View style={s.statsCell}>
                <Text style={s.statsCellLabel}>AVG / WEEK</Text>
                <Text style={s.statsCellValue} numberOfLines={1}>
                  {weekAvg.toFixed(1)}
                  <Text style={s.statsCellUnit}>h</Text>
                </Text>
                <Text style={s.statsCellSub}>
                  {weekAvg >= SLEEP_GOAL_HRS ? '✓ On target' : 'Below goal'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Weekly chart ── */}
          <GlassCard style={{ marginTop: 4 }} padding={20}>
            <Text style={s.sectionTitle}>Weekly Sleep</Text>
            <SleepWave data={weeklyHours} />
          </GlassCard>

          {/* ── Alarms ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Alarms & Schedules</Text>
            <TouchableOpacity
              onPress={() => {
                setEditItem(undefined);
                setShowAlarmModal(true);
              }}
              style={s.addBtn}
            >
              <IconPlus size={14} color="#A78BFA" strokeWidth={2.5} />
              <Text style={s.addBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        <Animated.View style={entranceStyle(slp3)}>
          {schedules.length === 0 ? (
            <GlassCard padding={20}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center' }}>
                No alarms set. Tap Add to create one.
              </Text>
            </GlassCard>
          ) : (
            schedules.map((item) => (
              <AlarmCard
                key={item.id}
                item={item}
                onToggle={() => toggle(item.id)}
                onDelete={() => handleDelete(item.id)}
                onEdit={() => openEdit(item)}
              />
            ))
          )}

          {/* ── Sleep tips ── */}
          <GlassCard style={{ marginTop: 8 }} padding={16}>
            <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Sleep Tips</Text>
            {[
              { emoji: '📵', tip: 'Avoid screens 30 min before bed' },
              { emoji: '🌡️', tip: 'Keep room cool — 65–68°F is optimal' },
              { emoji: '☕', tip: 'No caffeine after 2 PM' },
              { emoji: '🔄', tip: 'Stick to consistent sleep/wake times' },
            ].map((t, i) => (
              <View key={i} style={s.tipRow}>
                <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                <Text style={s.tipTxt}>{t.tip}</Text>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      </ScrollView>

      <AlarmModal
        visible={showAlarmModal}
        initial={editItem}
        onSave={handleSaveAlarm}
        onClose={() => setShowAlarmModal(false)}
      />
      <LogSleepModal
        visible={showLogModal}
        onSave={logSleep}
        onClose={() => setShowLogModal(false)}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.tintPurple,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logBtnTxt: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  summaryCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: COLORS.bgCard,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryTime: { fontSize: 20, fontWeight: '800', color: '#A78BFA', letterSpacing: -0.5 },
  durationPill: {
    backgroundColor: COLORS.tintPurple,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationPillTxt: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  // Stats unified card
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    padding: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  statsRingWrap: { alignItems: 'center', gap: 6 },
  statsRingLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  statsDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border,
    marginHorizontal: 18,
  },
  statsCells: { flex: 1, gap: 0 },
  statsCell: { paddingVertical: 6 },
  statsCellDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  statsCellLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 3,
  },
  statsCellValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  statsCellUnit: { fontSize: 13, fontWeight: '600', color: '#A78BFA' },
  statsCellSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  statsCellEmpty: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.tintPurple,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addBtnTxt: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  alarmCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  alarmIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alarmTime: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  alarmLabel: { fontSize: 12, color: COLORS.textSub, marginTop: 1 },
  alarmDays: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  offBadge: {
    backgroundColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  offBadgeTxt: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700' },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    padding: 2,
    overflow: 'hidden',
  },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },

  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  tipTxt: { fontSize: 13, color: COLORS.textSub, flex: 1 },

  // Clock
  timeBtn: { padding: 4 },
  timeDigit: { fontSize: 32, fontWeight: '800', lineHeight: 38, minWidth: 48, textAlign: 'center' },
  timeInput: { borderBottomWidth: 2, paddingVertical: 0, textAlign: 'center', minWidth: 48 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalClose: { padding: 4 },
  typeToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBtnTxt: { fontSize: 13, fontWeight: '600' },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fieldLabel: { fontSize: 14, color: COLORS.textSub, fontWeight: '500' },
  fieldInput: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  daysRow: { flexDirection: 'row', gap: 6, marginBottom: 8, marginTop: 4, flexWrap: 'wrap' },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipTxt: { fontSize: 11, fontWeight: '700' },

  snoozeChip: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  snoozeChipTxt: { fontSize: 13, fontWeight: '600' },

  durationPreview: { alignItems: 'center', paddingVertical: 20 },
  durationBig: { fontSize: 42, fontWeight: '800', color: COLORS.text, letterSpacing: -1 },
  durationSub: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },

  saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default SleepScreen;
