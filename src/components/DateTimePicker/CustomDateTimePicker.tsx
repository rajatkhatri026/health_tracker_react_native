import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../../utils/theme';
import { IconArrowLeft, IconChevronRight } from '../icons/Icons';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
type DateStep = 'year' | 'month' | 'day';

interface Props {
  visible: boolean;
  value: Date;
  mode: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  yearMonthFlow?: boolean;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const CustomDateTimePicker: React.FC<Props> = ({
  visible,
  value,
  mode,
  minimumDate,
  maximumDate,
  yearMonthFlow = false,
  onConfirm,
  onCancel,
}) => {
  const [selected, setSelected] = useState(new Date(value));
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [step, setStep] = useState<DateStep>('day');
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  useEffect(() => {
    if (visible) {
      const v = new Date(value);
      setSelected(v);
      setViewMonth(v.getMonth());
      setViewYear(v.getFullYear());
      setStep('day');
      setHour(v.getHours());
      setMinute(v.getMinutes());
    }
  }, [visible, value]);

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (m: number, y: number) => new Date(y, m, 1).getDay();

  const prevMonth = () =>
    viewMonth === 0 ? (setViewMonth(11), setViewYear((y) => y - 1)) : setViewMonth((m) => m - 1);
  const nextMonth = () =>
    viewMonth === 11 ? (setViewMonth(0), setViewYear((y) => y + 1)) : setViewMonth((m) => m + 1);

  const selectDay = (day: number) => {
    const d = new Date(selected);
    d.setFullYear(viewYear, viewMonth, day);
    setSelected(d);
  };

  const isSelected = (day: number) =>
    selected.getDate() === day &&
    selected.getMonth() === viewMonth &&
    selected.getFullYear() === viewYear;

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (minimumDate) {
      const min = new Date(minimumDate);
      min.setHours(0, 0, 0, 0);
      if (d < min) return true;
    }
    if (maximumDate) {
      const max = new Date(maximumDate);
      max.setHours(0, 0, 0, 0);
      if (d > max) return true;
    }
    return false;
  };

  const isToday = (day: number) => {
    const t = new Date();
    return t.getDate() === day && t.getMonth() === viewMonth && t.getFullYear() === viewYear;
  };

  const handleConfirm = () => {
    const result = new Date(selected);
    result.setHours(hour, minute, 0, 0);
    onConfirm(result);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <LinearGradient
          colors={['#7C3AED', '#4F46E5', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.gradientBorder}
        >
          <View style={s.sheet}>
            {/* ── Header ── */}
            <View style={s.header}>
              {/* Handle */}
              <View style={s.handle} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text style={s.headerTitle}>
                    {mode === 'date' ? '📅  Select Date' : '🕐  Select Time'}
                  </Text>
                  {mode === 'date' && step === 'day' && (
                    <Text style={s.headerSub}>
                      {MONTHS[viewMonth]} {viewYear}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={onCancel} style={s.closeBtn}>
                  <Text style={s.closeBtnTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── DATE MODE ── */}
            {mode === 'date' && (
              <View style={s.body}>
                {/* Month nav */}
                {step === 'day' && (
                  <View style={s.monthNav}>
                    <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
                      <IconArrowLeft size={18} color="#7C3AED" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => yearMonthFlow && setStep('year')}
                      disabled={!yearMonthFlow}
                      style={s.monthLabel}
                    >
                      <Text style={s.monthText}>
                        {MONTHS[viewMonth]} {viewYear}
                      </Text>
                      {yearMonthFlow && <Text style={{ color: '#7C3AED', fontSize: 12 }}>▾</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
                      <IconChevronRight size={18} color="#7C3AED" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Breadcrumb */}
                {yearMonthFlow && step !== 'day' && (
                  <View style={s.breadcrumb}>
                    <TouchableOpacity onPress={() => setStep('year')}>
                      <Text style={[s.crumbText, step === 'year' && s.crumbActive]}>
                        {viewYear}
                      </Text>
                    </TouchableOpacity>
                    {step === 'month' && (
                      <>
                        <Text style={s.crumbSep}>›</Text>
                        <Text style={[s.crumbText, s.crumbActive]}>Month</Text>
                      </>
                    )}
                  </View>
                )}

                {/* Year grid */}
                {yearMonthFlow &&
                  step === 'year' &&
                  (() => {
                    const currentYear = new Date().getFullYear();
                    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
                    return (
                      <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                        <View style={s.gridWrap}>
                          {years.map((y) => {
                            const sel = y === viewYear;
                            return (
                              <TouchableOpacity
                                key={y}
                                onPress={() => {
                                  setViewYear(y);
                                  setStep('month');
                                }}
                                style={s.gridCell}
                              >
                                {sel ? (
                                  <LinearGradient
                                    colors={['#7C3AED', '#0891B2']}
                                    style={s.gridCellActive}
                                  >
                                    <Text style={s.gridCellActiveText}>{y}</Text>
                                  </LinearGradient>
                                ) : (
                                  <View style={s.gridCellInactive}>
                                    <Text style={s.gridCellText}>{y}</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    );
                  })()}

                {/* Month grid */}
                {yearMonthFlow && step === 'month' && (
                  <View style={s.gridWrap}>
                    {MONTHS_SHORT.map((m, i) => {
                      const sel = i === viewMonth;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => {
                            setViewMonth(i);
                            setStep('day');
                          }}
                          style={{ width: '30%', alignItems: 'center', marginBottom: 8 }}
                        >
                          {sel ? (
                            <LinearGradient
                              colors={['#7C3AED', '#0891B2']}
                              style={[s.gridCellActive, { width: '100%', paddingVertical: 14 }]}
                            >
                              <Text style={s.gridCellActiveText}>{m}</Text>
                            </LinearGradient>
                          ) : (
                            <View
                              style={[s.gridCellInactive, { width: '100%', paddingVertical: 14 }]}
                            >
                              <Text style={s.gridCellText}>{m}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Day calendar */}
                {step === 'day' &&
                  (() => {
                    const dim = getDaysInMonth(viewMonth, viewYear);
                    const fd = getFirstDay(viewMonth, viewYear);
                    const cells = Array(fd)
                      .fill(null)
                      .concat(Array.from({ length: dim }, (_, i) => i + 1));
                    while (cells.length % 7 !== 0) cells.push(null);
                    return (
                      <>
                        {/* Day headers */}
                        <View style={s.dayHeaders}>
                          {DAYS.map((d) => (
                            <Text key={d} style={s.dayHeaderText}>
                              {d}
                            </Text>
                          ))}
                        </View>
                        {/* Day cells */}
                        {Array.from({ length: cells.length / 7 }, (_, row) => (
                          <View key={row} style={s.weekRow}>
                            {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                              if (!day) return <View key={col} style={{ flex: 1 }} />;
                              const sel = isSelected(day);
                              const dis = isDisabled(day);
                              const tod = isToday(day);
                              return (
                                <TouchableOpacity
                                  key={col}
                                  onPress={() => {
                                    if (!dis) selectDay(day);
                                  }}
                                  style={s.dayCell}
                                  disabled={dis}
                                >
                                  {sel ? (
                                    <LinearGradient
                                      colors={['#7C3AED', '#0891B2']}
                                      style={s.daySelected}
                                    >
                                      <Text style={s.daySelectedText}>{day}</Text>
                                    </LinearGradient>
                                  ) : tod ? (
                                    <View style={s.dayToday}>
                                      <Text style={s.dayTodayText}>{day}</Text>
                                    </View>
                                  ) : (
                                    <View style={s.dayNormal}>
                                      <Text style={[s.dayNormalText, dis && s.dayDisabled]}>
                                        {day}
                                      </Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ))}
                      </>
                    );
                  })()}
              </View>
            )}

            {/* ── TIME MODE ── */}
            {mode === 'time' && (
              <View style={[s.body, { alignItems: 'center' }]}>
                {/* Big time display */}
                <View style={s.timeDisplay}>
                  <Text style={s.timeHour}>{pad(hour)}</Text>
                  <Text style={s.timeColon}>:</Text>
                  <Text style={s.timeMinute}>{pad(minute)}</Text>
                </View>

                {/* Hour */}
                <Text style={s.timeLabel}>HOUR</Text>
                <View style={s.timeGrid}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity key={i} onPress={() => setHour(i)}>
                      {hour === i ? (
                        <LinearGradient colors={['#7C3AED', '#0891B2']} style={s.timeChipActive}>
                          <Text style={s.timeChipActiveText}>{pad(i)}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={s.timeChip}>
                          <Text style={s.timeChipText}>{pad(i)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Minute */}
                <Text style={[s.timeLabel, { marginTop: 12 }]}>MINUTE</Text>
                <View style={s.timeGrid}>
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                    const active = minute === m || (minute > m && minute < m + 5 && m === 55);
                    return (
                      <TouchableOpacity key={m} onPress={() => setMinute(m)}>
                        {active ? (
                          <LinearGradient
                            colors={['#7C3AED', '#0891B2']}
                            style={[s.timeChipActive, { width: 48 }]}
                          >
                            <Text style={s.timeChipActiveText}>{pad(m)}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={[s.timeChip, { width: 48 }]}>
                            <Text style={s.timeChipText}>{pad(m)}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Actions ── */}
            <View style={s.actions}>
              <TouchableOpacity onPress={onCancel} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={{ flex: 1 }}>
                <LinearGradient
                  colors={['#7C3AED', '#0891B2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.confirmBtn}
                >
                  <Text style={s.confirmText}>Confirm</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,26,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gradientBorder: {
    borderRadius: 30,
    padding: 2,
    width: '100%',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 24,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFE',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F8',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F8',
    borderWidth: 1,
    borderColor: '#E4E7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnTxt: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F0F1A',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  body: {
    padding: 16,
  },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F0F1A',
    letterSpacing: -0.3,
  },

  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 6,
  },
  crumbText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  crumbActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  crumbSep: {
    color: '#9CA3AF',
    fontSize: 15,
  },

  // Grid (year / month)
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  gridCell: {
    width: '22%',
    alignItems: 'center',
  },
  gridCellActive: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  gridCellActiveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  gridCellInactive: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F8',
  },
  gridCellText: {
    color: '#6B7280',
    fontSize: 14,
  },

  // Day calendar
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  daySelected: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelectedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  dayToday: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },
  dayTodayText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '700',
  },
  dayNormal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNormalText: {
    color: '#0F0F1A',
    fontSize: 14,
  },
  dayDisabled: {
    color: '#D1D5DB',
  },

  // Time picker
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F8F6FF',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  timeHour: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0F0F1A',
    letterSpacing: -2,
  },
  timeColon: {
    fontSize: 48,
    fontWeight: '900',
    color: '#7C3AED',
    marginHorizontal: 4,
    letterSpacing: -2,
  },
  timeMinute: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0F0F1A',
    letterSpacing: -2,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    width: '100%',
  },
  timeChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F8',
    borderWidth: 1,
    borderColor: '#E4E7F0',
  },
  timeChipText: {
    color: '#6B7280',
    fontSize: 13,
  },
  timeChipActive: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipActiveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EEFF',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F8',
    borderWidth: 1,
    borderColor: '#E4E7F0',
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CustomDateTimePicker;
