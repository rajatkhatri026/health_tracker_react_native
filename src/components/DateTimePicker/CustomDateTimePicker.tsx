import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
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
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface Props {
  visible: boolean;
  value: Date;
  mode: 'date' | 'time';
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const CustomDateTimePicker: React.FC<Props> = ({
  visible,
  value,
  mode,
  minimumDate,
  onConfirm,
  onCancel,
}) => {
  const [selected, setSelected] = useState(new Date(value));
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  // Re-sync internal state every time the picker opens

  useEffect(() => {
    if (visible) {
      const v = new Date(value);
      setSelected(v);
      setViewMonth(v.getMonth());
      setViewYear(v.getFullYear());
      setHour(v.getHours());
      setMinute(v.getMinutes());
    }
  }, [visible, value]);

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (m: number, y: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

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
    if (!minimumDate) return false;
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const min = new Date(minimumDate);
    min.setHours(0, 0, 0, 0);
    return d < min;
  };

  const isToday = (day: number) => {
    const t = new Date();
    return t.getDate() === day && t.getMonth() === viewMonth && t.getFullYear() === viewYear;
  };

  const handleConfirm = () => {
    const result = new Date(selected);
    // Always apply hour/minute so both date and time are preserved
    result.setHours(hour, minute, 0, 0);
    onConfirm(result);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDay(viewMonth, viewYear);
  const cells = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: '#16103A',
            borderRadius: 24,
            width: '100%',
            borderWidth: 1,
            borderColor: 'rgba(124,58,237,0.5)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <LinearGradient
            colors={['#1A0A3C', '#0D1230']}
            style={{ padding: 18, alignItems: 'center' }}
          >
            <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>
              {mode === 'date' ? 'SELECT DATE' : 'SELECT TIME'}
            </Text>
          </LinearGradient>

          {mode === 'date' && (
            <View style={{ padding: 16 }}>
              {/* Month navigation */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
                  <IconArrowLeft size={20} color="#A78BFA" />
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                  {MONTHS[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
                  <IconChevronRight size={20} color="#A78BFA" />
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {DAYS.map((d) => (
                  <Text
                    key={d}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      color: COLORS.textMuted,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {d}
                  </Text>
                ))}
              </View>

              {/* Calendar grid */}
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <View key={row} style={{ flexDirection: 'row', marginBottom: 4 }}>
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                    if (!day) return <View key={col} style={{ flex: 1 }} />;
                    const sel = isSelected(day);
                    const dis = isDisabled(day);
                    const tod = isToday(day);
                    return (
                      <TouchableOpacity
                        key={col}
                        onPress={() => !dis && selectDay(day)}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 6,
                        }}
                        disabled={dis}
                      >
                        {sel ? (
                          <LinearGradient
                            colors={['#7C3AED', '#06B6D4']}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>
                              {day}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: tod ? 1 : 0,
                              borderColor: '#7C3AED',
                            }}
                          >
                            <Text
                              style={{
                                color: dis ? COLORS.textMuted : tod ? '#A78BFA' : '#fff',
                                fontSize: 14,
                                fontWeight: tod ? '700' : '400',
                                opacity: dis ? 0.35 : 1,
                              }}
                            >
                              {day}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {mode === 'time' && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              {/* Display */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 52, fontWeight: '800', color: '#fff', letterSpacing: -2 }}>
                  {pad(hour)}
                  <Text style={{ color: '#7C3AED' }}>:</Text>
                  {pad(minute)}
                </Text>
              </View>

              {/* Hour scroll */}
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                HOUR
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <TouchableOpacity key={i} onPress={() => setHour(i)}>
                    {hour === i ? (
                      <LinearGradient
                        colors={['#7C3AED', '#06B6D4']}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                          {pad(i)}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: COLORS.bgCard,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      >
                        <Text style={{ color: COLORS.textSub, fontSize: 13 }}>{pad(i)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Minute scroll — steps of 5 */}
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                MINUTE
              </Text>
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <TouchableOpacity key={m} onPress={() => setMinute(m)}>
                    {minute === m || (minute > m && minute < m + 5 && m === 55) ? (
                      <LinearGradient
                        colors={['#7C3AED', '#06B6D4']}
                        style={{
                          width: 44,
                          height: 38,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                          {pad(m)}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          width: 44,
                          height: 38,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: COLORS.bgCard,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      >
                        <Text style={{ color: COLORS.textSub, fontSize: 13 }}>{pad(m)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Actions */}
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              padding: 16,
              borderTopWidth: 1,
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                backgroundColor: COLORS.bgCard,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.full,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: COLORS.textSub, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={{ flex: 1 }}>
              <LinearGradient
                colors={['#7C3AED', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Confirm</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomDateTimePicker;
