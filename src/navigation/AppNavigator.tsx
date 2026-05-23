import React from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRef, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { createNotification } from '../api/notifications';
import { scheduleAllSmartNotifications } from '../utils/smartNotifications';
import { resetPremiumStatus } from '../hooks/usePremium';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';
import type { RootStackParamList, MainTabParamList } from './types';
import { COLORS } from '../utils/theme';
import {
  IconHome,
  IconActivity,
  IconWater,
  IconMoon,
  IconUser,
  IconRun,
  IconFlame,
} from '../components/icons/Icons';

import AuthScreen from '../screens/Auth/AuthScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import WelcomeBackScreen from '../screens/WelcomeBack/WelcomeBackScreen';
import AICoachScreen from '../screens/AICoach/AICoachScreen';
import WeightProgressScreen from '../screens/WeightProgress/WeightProgressScreen';
import FastingTimerScreen from '../screens/FastingTimer/FastingTimerScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibrary/ExerciseLibraryScreen';
import BarcodeScannerScreen from '../screens/BarcodeScanner/BarcodeScannerScreen';
import PaywallScreen from '../screens/Paywall/PaywallScreen';
import WorkoutProgramsScreen from '../screens/WorkoutPrograms/WorkoutProgramsScreen';
import WeeklyReportScreen from '../screens/WeeklyReport/WeeklyReportScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import WorkoutScreen from '../screens/Workout/WorkoutScreen';
import MealPlannerScreen from '../screens/MealPlanner/MealPlannerScreen';
import WaterIntakeScreen from '../screens/Water/WaterIntakeScreen';
import SleepScreen from '../screens/Sleep/SleepScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import WorkoutDetailScreen from '../screens/Workout/WorkoutDetailScreen';
import StepsScreen from '../screens/Steps/StepsScreen';
import CaloriesScreen from '../screens/Calories/CaloriesScreen';
import { withPremiumGate } from '../components/PremiumGate/withPremiumGate';

// ── Gated screens — PremiumGate shown if user is not premium ─────────────────
const GatedAICoach = withPremiumGate(AICoachScreen, 'AI Health Coach');
const GatedMealPlanner = withPremiumGate(MealPlannerScreen, 'Meal Planner');
const GatedBarcodeScanner = withPremiumGate(BarcodeScannerScreen, 'Barcode Food Scanner');
const GatedWorkoutPrograms = withPremiumGate(WorkoutProgramsScreen, 'Workout Programs');
const GatedWeeklyReport = withPremiumGate(WeeklyReportScreen, 'Weekly Report Card');

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  Home: IconHome,
  Workout: IconActivity,
  Steps: IconRun,
  Calories: IconFlame,
  Water: IconWater,
  Sleep: IconMoon,
  Profile: IconUser,
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const centerIndex = 3; // Calories

  return (
    <View style={s.barWrapper}>
      {/* Floating center button — sits above the bar */}
      {(() => {
        const route = state.routes[centerIndex];
        const isFocused = state.index === centerIndex;
        const Icon = TAB_ICONS[route.name];
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={s.centerWrap}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F59E0B', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.centerBtn, isFocused && s.centerBtnActive]}
            >
              <Icon size={24} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        );
      })()}

      {/* Tab bar */}
      <View style={s.bar}>
        {state.routes.map((route, index) => {
          if (index === centerIndex) {
            // Empty slot to preserve spacing
            return <View key={route.key} style={s.tabItem} />;
          }
          const isFocused = state.index === index;
          const Icon = TAB_ICONS[route.name];
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={s.tabItem}
              activeOpacity={0.7}
            >
              <Icon
                size={22}
                color={isFocused ? '#7C3AED' : COLORS.textMuted}
                strokeWidth={isFocused ? 2.5 : 1.8}
              />
              {isFocused && <View style={s.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  barWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  centerWrap: {
    position: 'absolute',
    top: -28, // half of button height (56/2) so it sits centred on the top edge
    alignSelf: 'center',
    zIndex: 10,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  centerBtnActive: {
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 18,
  },
  bar: {
    flexDirection: 'row',
    height: 72,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E7F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 6,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7C3AED',
  },
});

function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Workout" component={WorkoutScreen} />
        <Tab.Screen name="Steps" component={StepsScreen} />
        <Tab.Screen name="Calories" component={CaloriesScreen} />
        <Tab.Screen name="Water" component={WaterIntakeScreen} />
        <Tab.Screen name="Sleep" component={SleepScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, onboardingDone, isNewUser, user } = useAuth();

  // ── Schedule smart notifications on login ────────────────────────────────────
  // Clear any stale premium flag set by mock purchase during development
  useEffect(() => {
    resetPremiumStatus();
  }, []);

  useEffect(() => {
    if (!user?.user_id || !isAuthenticated) return;
    scheduleAllSmartNotifications(user.name ?? 'there').catch(() => {});
  }, [user?.user_id, isAuthenticated]);

  // ── Bridge: phone notification received → save to backend bell ──────────────
  useEffect(() => {
    if (!user?.user_id) return;

    // Fires when a notification is delivered while app is foregrounded
    const receivedSub = Notifications.addNotificationReceivedListener(async (notification) => {
      const { title, body, data } = notification.request.content;
      const type = (data?.type as string) ?? 'reminder';
      const isAlarm = type === 'alarm' || type === 'bedtime';
      if (!isAlarm) return; // only sync alarm/bedtime to bell

      try {
        await createNotification(user.user_id, {
          type: 'reminder',
          title: title ?? 'Reminder',
          body: body ?? '',
          metadata: { source: 'alarm', alarmType: type, scheduleId: data?.scheduleId },
        });
      } catch {}
    });

    // Fires when user taps the notification (app backgrounded/killed)
    const responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { title, body, data } = response.notification.request.content;
      const type = (data?.type as string) ?? 'reminder';
      const isAlarm = type === 'alarm' || type === 'bedtime';
      if (!isAlarm) return;

      try {
        await createNotification(user.user_id, {
          type: 'reminder',
          title: title ?? 'Reminder',
          body: body ?? '',
          metadata: { source: 'alarm', alarmType: type, scheduleId: data?.scheduleId },
        });
      } catch {}
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [user?.user_id]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : !onboardingDone && isNewUser ? (
        // Brand-new user: go through onboarding
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : !onboardingDone && !isNewUser ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
          <Stack.Screen
            name="AICoach"
            component={GatedAICoach}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="MealPlanner"
            component={GatedMealPlanner}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="WeightProgress"
            component={WeightProgressScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="FastingTimer"
            component={FastingTimerScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ExerciseLibrary"
            component={ExerciseLibraryScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="BarcodeScanner"
            component={GatedBarcodeScanner}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="WorkoutPrograms"
            component={GatedWorkoutPrograms}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="WeeklyReport"
            component={GatedWeeklyReport}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : isNewUser ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
          <Stack.Screen
            name="AICoach"
            component={GatedAICoach}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="MealPlanner"
            component={GatedMealPlanner}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="WeightProgress"
            component={WeightProgressScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="FastingTimer"
            component={FastingTimerScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ExerciseLibrary"
            component={ExerciseLibraryScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="BarcodeScanner"
            component={GatedBarcodeScanner}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="WorkoutPrograms"
            component={GatedWorkoutPrograms}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="WeeklyReport"
            component={GatedWeeklyReport}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="WelcomeBack" component={WelcomeBackScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
          <Stack.Screen
            name="AICoach"
            component={GatedAICoach}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="MealPlanner"
            component={GatedMealPlanner}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="WeightProgress"
            component={WeightProgressScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="FastingTimer"
            component={FastingTimerScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ExerciseLibrary"
            component={ExerciseLibraryScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="BarcodeScanner"
            component={GatedBarcodeScanner}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="WorkoutPrograms"
            component={GatedWorkoutPrograms}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="WeeklyReport"
            component={GatedWeeklyReport}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}
