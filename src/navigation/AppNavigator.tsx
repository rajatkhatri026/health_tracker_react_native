import React from 'react';
import { ActivityIndicator, View, TouchableOpacity, StyleSheet } from 'react-native';
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
  IconSearch,
  IconMoon,
  IconUser,
  IconRun,
} from '../components/icons/Icons';

import AuthScreen from '../screens/Auth/AuthScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import WorkoutScreen from '../screens/Workout/WorkoutScreen';
import MealPlannerScreen from '../screens/MealPlanner/MealPlannerScreen';
import SleepScreen from '../screens/Sleep/SleepScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import WorkoutDetailScreen from '../screens/Workout/WorkoutDetailScreen';
import StepsScreen from '../screens/Steps/StepsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  Home: IconHome,
  Workout: IconActivity,
  Steps: IconRun,
  Meal: IconSearch,
  Sleep: IconMoon,
  Profile: IconUser,
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={s.bar}>
      <LinearGradient
        colors={['rgba(10,14,39,0.95)', 'rgba(10,14,39,0.98)']}
        style={StyleSheet.absoluteFillObject}
      />
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isCenter = index === 2; // Steps = center floating button
        const Icon = TAB_ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={s.centerWrap}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.centerBtn}
              >
                <Icon size={22} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={s.tabItem} activeOpacity={0.7}>
            <Icon
              size={22}
              color={isFocused ? '#A78BFA' : COLORS.textMuted}
              strokeWidth={isFocused ? 2.5 : 1.8}
            />
            {isFocused && <View style={s.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 72,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
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
    backgroundColor: '#A78BFA',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
});

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Steps" component={StepsScreen} />
      <Tab.Screen name="Meal" component={MealPlannerScreen} />
      <Tab.Screen name="Sleep" component={SleepScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, onboardingDone } = useAuth();

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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : !onboardingDone ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
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
