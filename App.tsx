import 'react-native-gesture-handler';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestNotificationPermission } from './src/utils/notifications';
import { setupAlarmChannel, playAlarmSound, stopAlarmSound } from './src/utils/alarmNotifications';

export default function App() {
  const [alarmRinging, setAlarmRinging] = useState(false);
  const [alarmLabel, setAlarmLabel] = useState('');
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    requestNotificationPermission();
    setupAlarmChannel();

    // Fires when notification arrives while app is in FOREGROUND
    notifListener.current = Notifications.addNotificationReceivedListener((notif) => {
      const data = notif.request.content.data as Record<string, string> | undefined;
      if (data?.scheduleId) {
        setAlarmLabel(notif.request.content.body ?? 'Alarm');
        setAlarmRinging(true);
        playAlarmSound((data.type as 'alarm' | 'bedtime') ?? 'alarm');
      }
    });

    // Fires when user TAPS the notification (app in background/killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as Record<string, string> | undefined;
      if (data?.scheduleId) {
        setAlarmLabel(resp.notification.request.content.body ?? 'Alarm');
        setAlarmRinging(true);
        playAlarmSound((data.type as 'alarm' | 'bedtime') ?? 'alarm');
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const dismiss = () => {
    stopAlarmSound();
    setAlarmRinging(false);
  };

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />

      {/* Alarm overlay */}
      <Modal visible={alarmRinging} animationType="fade" transparent>
        <View style={alarmStyles.overlay}>
          <View style={alarmStyles.card}>
            <Text style={alarmStyles.emoji}>⏰</Text>
            <Text style={alarmStyles.title}>Alarm</Text>
            <Text style={alarmStyles.label}>{alarmLabel}</Text>
            <TouchableOpacity style={alarmStyles.btn} onPress={dismiss}>
              <Text style={alarmStyles.btnTxt}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AuthProvider>
  );
}

const alarmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#0E1022',
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    width: 300,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  label: { fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 32, textAlign: 'center' },
  btn: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  btnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
