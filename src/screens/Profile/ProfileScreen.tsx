import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { getProfile } from '../../api/profile';
import type { UserProfile } from '../../types';
import { COLORS, RADIUS } from '../../utils/theme';
import GlassCard from '../../components/GlassCard/GlassCard';
import {
  IconUser,
  IconBell,
  IconSettings,
  IconLogOut,
  IconLock,
  IconHeart,
  IconChevronRight,
  IconTrophy,
} from '../../components/icons/Icons';

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { label: 'Personal Data', Icon: IconUser, grad: ['#7C3AED', '#A78BFA'] as [string, string] },
      { label: 'Achievement', Icon: IconTrophy, grad: ['#F59E0B', '#FBBF24'] as [string, string] },
      {
        label: 'Workout Progress',
        Icon: IconHeart,
        grad: ['#EC4899', '#F43F5E'] as [string, string],
      },
    ],
  },
  {
    title: 'Notification',
    items: [
      {
        label: 'Notification Settings',
        Icon: IconBell,
        grad: ['#3B82F6', '#06B6D4'] as [string, string],
      },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Privacy Policy', Icon: IconLock, grad: ['#6B7280', '#9CA3AF'] as [string, string] },
      { label: 'Settings', Icon: IconSettings, grad: ['#6B7280', '#9CA3AF'] as [string, string] },
    ],
  },
];

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getProfile(user.user_id)
      .then((p) => setProfile(p))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [user]);

  const initials = (user?.name ?? 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const stats = [
    { label: 'Height', value: profile?.height ? `${profile.height} cm` : '—' },
    { label: 'Weight', value: profile?.baseline_weight ? `${profile.baseline_weight} kg` : '—' },
    {
      label: 'Phone',
      value: user?.phone ? user.phone.slice(-4).padStart(user.phone.length, '•') : '—',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1A0A3C', '#0D1F3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: 36,
            alignItems: 'center',
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
            borderBottomWidth: 1,
            borderColor: 'rgba(124,58,237,0.2)',
          }}
        >
          <LinearGradient
            colors={['#7C3AED', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff' }}>{initials}</Text>
          </LinearGradient>

          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: '#fff',
              marginTop: 14,
              letterSpacing: -0.5,
            }}
          >
            {user?.name || 'Athlete'}
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, marginTop: 4 }}>
            {user?.phone ?? user?.email ?? 'athlete@nexara.app'}
          </Text>

          <TouchableOpacity
            style={{
              marginTop: 14,
              borderRadius: RADIUS.full,
              borderWidth: 1,
              borderColor: 'rgba(124,58,237,0.5)',
              paddingHorizontal: 24,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '600' }}>Edit Profile</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          {profileLoading ? (
            <ActivityIndicator color="#7C3AED" style={{ marginVertical: 16 }} />
          ) : (
            <GlassCard style={{ flexDirection: 'row' }} padding={18}>
              {stats.map((stat, i) => (
                <React.Fragment key={stat.label}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                      {stat.value}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>
                      {stat.label}
                    </Text>
                  </View>
                  {i < stats.length - 1 && (
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  )}
                </React.Fragment>
              ))}
            </GlassCard>
          )}
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: COLORS.textMuted,
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              {section.title.toUpperCase()}
            </Text>
            <GlassCard padding={0}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderBottomWidth: i < section.items.length - 1 ? 1 : 0,
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <LinearGradient
                    colors={item.grad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <item.Icon size={17} color="#fff" />
                  </LinearGradient>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' }}>
                    {item.label}
                  </Text>
                  <IconChevronRight size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        ))}

        {/* Logout */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <TouchableOpacity onPress={logout} activeOpacity={0.85}>
            <GlassCard
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
              padding={16}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconLogOut size={17} color="#F43F5E" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#F43F5E' }}>Log Out</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
