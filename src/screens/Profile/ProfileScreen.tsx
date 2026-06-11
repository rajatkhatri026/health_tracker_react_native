import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
  Dimensions,
  Linking,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEntranceAnimation, entranceStyle } from '../../hooks/useEntranceAnimation';
import { useScrollToTopOnTabPress } from '../../hooks/useScrollToTopOnTabPress';

import Svg, { Defs, LinearGradient as SvgGrad, Stop, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import {
  getProfile,
  updateProfile,
  getAvatar,
  uploadAvatar,
  deleteAvatar,
  deleteAccount,
} from '../../api/profile';
import type { UserProfile } from '../../types';
import CustomDateTimePicker from '../../components/DateTimePicker/CustomDateTimePicker';
import LegalModal from '../../components/LegalModal/LegalModal';
import PreferencesModal from '../../components/PreferencesModal/PreferencesModal';
import { useAppPreferences } from '../../hooks/useAppPreferences';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_DATE,
  TERMS_SECTIONS,
  TERMS_DATE,
  ABOUT_SECTIONS,
} from '../../utils/legalContent';
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
  IconEdit,
  IconCalendar,
  IconShield,
  IconGlobe,
  IconInfo,
  IconRuler,
  IconTrash,
  IconStar,
  IconMail,
} from '../../components/icons/Icons';
import { ProfileSkeleton } from '../../components/Skeleton/Skeleton';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcAge = (dob?: string | Date | null) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob as string).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const calcBMI = (h?: number, w?: number) => {
  if (!h || !w) return null;
  return (w / (h / 100) ** 2).toFixed(1);
};

const bmiInfo = (bmi: string) => {
  const v = parseFloat(bmi);
  if (v < 18.5) return { label: 'Underweight', color: '#F59E0B' };
  if (v < 25) return { label: 'Normal', color: '#10B981' };
  if (v < 30) return { label: 'Overweight', color: '#F97316' };
  return { label: 'Obese', color: '#EF4444' };
};

type EditForm = {
  name: string;
  dob: string;
  gender: string;
  height: string;
  weight: string;
  bloodType: string;
};
const BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

// ── Edit Modal ────────────────────────────────────────────────────────────────
const EditModal: React.FC<{
  visible: boolean;
  form: EditForm;
  saving: boolean;
  onChange: (f: EditForm) => void;
  onSave: () => void;
  onClose: () => void;
}> = ({ visible, form, saving, onChange, onSave, onClose }) => {
  const [showDob, setShowDob] = useState(false);
  const dobDate = (() => {
    const d = new Date(form.dob);
    return isNaN(d.getTime()) ? new Date(2000, 0, 1) : d;
  })();

  const field = (label: string, key: keyof EditForm, ph: string, kb?: any) => (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 11,
          color: '#6B7280',
          fontWeight: '700',
          letterSpacing: 1,
          marginBottom: 7,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={form[key]}
        onChangeText={(v) => onChange({ ...form, [key]: v })}
        placeholder={ph}
        placeholderTextColor="#9CA3AF"
        keyboardType={kb ?? 'default'}
        style={{
          backgroundColor: '#F3F4F8',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#E4E7F0',
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          color: '#0F0F1A',
        }}
      />
    </View>
  );

  const chips = (label: string, opts: string[], key: keyof EditForm) => (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 11,
          color: '#6B7280',
          fontWeight: '700',
          letterSpacing: 1,
          marginBottom: 9,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((o) => {
          const active = form[key] === o;
          return (
            <TouchableOpacity key={o} onPress={() => onChange({ ...form, [key]: o })}>
              {active ? (
                <LinearGradient
                  colors={['#0891B2', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}
                >
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>{o}</Text>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: '#E4E7F0',
                    backgroundColor: '#F3F4F8',
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>{o}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderTopWidth: 1,
            borderColor: 'rgba(124,58,237,0.25)',
            maxHeight: '93%',
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#E4E7F0',
              }}
            />
          </View>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderColor: '#E4E7F0',
            }}
          >
            <View>
              <Text
                style={{ fontSize: 20, fontWeight: '900', color: '#0F0F1A', letterSpacing: -0.4 }}
              >
                Edit Profile
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Update your personal details
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#F3F4F8',
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {field('FULL NAME', 'name', 'Your name')}

            {/* DOB */}
            <View style={{ marginBottom: 18 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: '#6B7280',
                  fontWeight: '700',
                  letterSpacing: 1,
                  marginBottom: 7,
                }}
              >
                DATE OF BIRTH
              </Text>
              <TouchableOpacity
                onPress={() => setShowDob(true)}
                style={{
                  backgroundColor: '#F3F4F8',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E4E7F0',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 15, color: form.dob ? '#0F0F1A' : '#9CA3AF' }}>
                  {form.dob || 'Select your birthday'}
                </Text>
                <View style={{ backgroundColor: '#E0F7FA', padding: 6, borderRadius: 8 }}>
                  <IconCalendar size={16} color="#0891B2" />
                </View>
              </TouchableOpacity>
            </View>

            {chips('GENDER', GENDERS, 'gender')}

            {/* Height & Weight side by side */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: '#6B7280',
                    fontWeight: '700',
                    letterSpacing: 1,
                    marginBottom: 7,
                  }}
                >
                  HEIGHT
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F8',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#E4E7F0',
                    paddingHorizontal: 14,
                    overflow: 'hidden',
                  }}
                >
                  <TextInput
                    value={form.height}
                    onChangeText={(v) => onChange({ ...form, height: v })}
                    placeholder="170"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={{ flex: 1, fontSize: 15, color: '#0F0F1A', paddingVertical: 14 }}
                  />
                  <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>cm</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: '#6B7280',
                    fontWeight: '700',
                    letterSpacing: 1,
                    marginBottom: 7,
                  }}
                >
                  WEIGHT
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F3F4F8',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#E4E7F0',
                    paddingHorizontal: 14,
                    overflow: 'hidden',
                  }}
                >
                  <TextInput
                    value={form.weight}
                    onChangeText={(v) => onChange({ ...form, weight: v })}
                    placeholder="70"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={{ flex: 1, fontSize: 15, color: '#0F0F1A', paddingVertical: 14 }}
                  />
                  <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>kg</Text>
                </View>
              </View>
            </View>

            {chips('BLOOD TYPE', BLOOD_TYPES, 'bloodType')}

            <TouchableOpacity onPress={onSave} disabled={saving} style={{ marginTop: 8 }}>
              <LinearGradient
                colors={['#0891B2', '#0E7490', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  paddingVertical: 17,
                  alignItems: 'center',
                  shadowColor: '#0891B2',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.45,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 }}
                  >
                    Save Changes
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <CustomDateTimePicker
        visible={showDob}
        value={dobDate}
        mode="date"
        yearMonthFlow
        onConfirm={(d) => {
          const p = (n: number) => String(n).padStart(2, '0');
          onChange({ ...form, dob: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` });
          setShowDob(false);
        }}
        onCancel={() => setShowDob(false)}
      />
    </Modal>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────
const ProfileScreen: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollRef = useScrollToTopOnTabPress();
  const [ps0, ps1, ps2, ps3] = useEntranceAnimation(4, { initialDelay: 60, stagger: 110 });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const avatarSheetAnim = useState(() => new Animated.Value(0))[0];
  const sheetDragY = useState(() => new Animated.Value(0))[0];

  const sheetPanResponder = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_e, gs) => {
        if (gs.dy > 0) sheetDragY.setValue(gs.dy);
      },
      onPanResponderRelease: (_e, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          // Dismiss — slide out then reset
          Animated.timing(sheetDragY, { toValue: 600, duration: 220, useNativeDriver: true }).start(
            () => {
              setShowAvatarSheet(false);
              avatarSheetAnim.setValue(0);
              sheetDragY.setValue(0);
            }
          );
        } else {
          // Snap back
          Animated.spring(sheetDragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  )[0];
  const [notifs, setNotifs] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: '',
    dob: '',
    gender: '',
    height: '',
    weight: '',
    bloodType: '',
  });

  const { prefs, savePrefs } = useAppPreferences();

  // Load real notification permission state on mount
  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(({ status }) => {
        setNotifs(status === 'granted');
      })
      .catch(() => {});
  }, []);

  const handleNotifsToggle = async (val: boolean) => {
    if (val) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotifs(true);
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive alarms and reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotifs(false);
      Alert.alert('Notifications Off', 'All scheduled alarms and reminders have been cancelled.');
    }
  };

  const avatarCacheKey = user ? `avatar_cache_${user.user_id}` : null;

  const loadData = useCallback(async () => {
    if (!user) return;

    const avatarCacheKey2 = `avatar_cache_${user.user_id}`;
    const profileCacheKey = `profile_cache_${user.user_id}`;

    // ── Step 1: Show cached data instantly (zero wait) ───────────────────────
    try {
      const [cachedAvatar, cachedProfile] = await Promise.all([
        AsyncStorage.getItem(avatarCacheKey2),
        AsyncStorage.getItem(profileCacheKey),
      ]);
      if (cachedAvatar) setAvatarUri(cachedAvatar);
      if (cachedProfile) {
        const p: UserProfile = JSON.parse(cachedProfile);
        setProfile(p);
        setForm({
          name: user.name ?? '',
          dob: user.dob ? new Date(user.dob as string).toISOString().slice(0, 10) : '',
          gender: user.gender ?? '',
          height: p.height ? String(p.height) : '',
          weight: p.baseline_weight ? String(p.baseline_weight) : '',
          bloodType: p.blood_type ?? '',
        });
        setLoading(false); // show UI immediately from cache
      }
    } catch {
      // cache miss — continue to network fetch
    }

    // ── Step 2: Fetch fresh data from API in background ──────────────────────
    try {
      const p = await getProfile(user.user_id);
      setProfile(p);
      setForm({
        name: user.name ?? '',
        dob: user.dob ? new Date(user.dob as string).toISOString().slice(0, 10) : '',
        gender: user.gender ?? '',
        height: p.height ? String(p.height) : '',
        weight: p.baseline_weight ? String(p.baseline_weight) : '',
        bloodType: p.blood_type ?? '',
      });
      AsyncStorage.setItem(profileCacheKey, JSON.stringify(p)).catch(() => {});
    } catch {
      // Non-blocking
    }

    // ── Step 3: Fetch avatar in background ───────────────────────────────────
    getAvatar(user.user_id)
      .then(({ avatar_url }) => {
        setAvatarUri(avatar_url);
        if (avatar_url) {
          AsyncStorage.setItem(avatarCacheKey2, avatar_url).catch(() => {});
        } else {
          AsyncStorage.removeItem(avatarCacheKey2).catch(() => {});
        }
      })
      .catch(() => {});

    setLoading(false); // ensure loading is cleared even if no cache existed
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openAvatarSheet = () => {
    setShowAvatarSheet(true);
    Animated.spring(avatarSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  };

  const closeAvatarSheet = (cb?: () => void) => {
    Animated.timing(avatarSheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      () => {
        setShowAvatarSheet(false);
        sheetDragY.setValue(0);
        if (cb) cb();
      }
    );
  };

  const handleAvatarPress = () => openAvatarSheet();

  const pickFromCamera = () => {
    closeAvatarSheet(async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to take a photo.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) await processAndUpload(result.assets[0].uri);
    });
  };

  const pickFromLibrary = () => {
    closeAvatarSheet(async () => {
      const { status, accessPrivileges } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const canAccess = status === 'granted' || accessPrivileges === 'limited';
      if (!canAccess) {
        Alert.alert('Permission Required', 'Photo library access is needed to select a photo.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) await processAndUpload(result.assets[0].uri);
    });
  };

  const handleRemovePhoto = () => {
    closeAvatarSheet(async () => {
      if (!user) return;
      try {
        setAvatarUploading(true);
        await deleteAvatar(user.user_id);
        setAvatarUri(null);
        if (avatarCacheKey) AsyncStorage.removeItem(avatarCacheKey).catch(() => {});
      } catch {
        Alert.alert('Error', 'Failed to remove photo. Please try again.');
      } finally {
        setAvatarUploading(false);
      }
    });
  };

  const processAndUpload = async (uri: string) => {
    if (!user) return;
    try {
      setAvatarUploading(true);

      // Resize to 300×300 and compress to JPEG
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) throw new Error('Failed to encode image');
      const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;

      // Optimistic UI + cache update
      setAvatarUri(dataUri);
      if (avatarCacheKey) AsyncStorage.setItem(avatarCacheKey, dataUri).catch(() => {});

      await uploadAvatar(user.user_id, dataUri);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('too large') || msg.includes('413')) {
        Alert.alert('Image Too Large', 'Please choose a smaller image (under 500 KB).');
      } else {
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
      }
      // Revert optimistic update on failure
      if (avatarCacheKey) AsyncStorage.removeItem(avatarCacheKey).catch(() => {});
      await loadData();
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.user_id, {
        name: form.name || undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        baseline_weight: form.weight ? parseFloat(form.weight) : undefined,
        blood_type: form.bloodType || undefined,
      } as any);
      await refreshUser();
      await loadData();
      setEditOpen(false);
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const age = calcAge(user?.dob);
  const bmi = calcBMI(profile?.height, profile?.baseline_weight);
  const bmi_ = bmi ? bmiInfo(bmi) : null;
  const dobStr = user?.dob
    ? new Date(user.dob as string).toLocaleDateString([], {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleExportData = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      const url = `${baseUrl}/users/${user.user_id}/profile/export`;

      const firstName = (user.name ?? 'User').split(' ')[0];
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Nexara_Health_Report_${firstName}_${dateStr}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Delete any previous cached file first
      const existing = await FileSystem.getInfoAsync(fileUri);
      if (existing.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true });

      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (result.status !== 200) {
        // Read error body if any
        let msg = `Server returned ${result.status}.`;
        try {
          const body = await FileSystem.readAsStringAsync(result.uri);
          const parsed = JSON.parse(body);
          if (parsed.message) msg = parsed.message;
        } catch {}
        Alert.alert('Export Failed', msg);
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available', 'Your device does not support sharing files.');
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: fileName,
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      console.error('Export error:', err);
      Alert.alert('Error', err?.message ?? 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all health data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'Type DELETE to confirm.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, Delete',
                style: 'destructive',
                onPress: async () => {
                  if (!user) return;
                  try {
                    await deleteAccount(user.user_id);
                    await AsyncStorage.clear();
                    await logout();
                  } catch {
                    Alert.alert('Error', 'Failed to delete account. Please try again.');
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const MENU_SECTIONS = [
    {
      title: 'App',
      items: [
        {
          icon: IconBell,
          label: 'Notifications',
          sub: notifs ? 'Alarms & reminders on' : 'All notifications off',
          grad: ['#3B82F6', '#06B6D4'] as [string, string],
          toggle: true,
        },
        {
          icon: IconSettings,
          label: 'Preferences',
          sub: `${prefs.weightUnit} · ${prefs.heightUnit} · ${prefs.waterUnit}`,
          grad: ['#6366F1', '#8B5CF6'] as [string, string],
          onPress: () => setShowPrefs(true),
        },
      ],
    },
    {
      title: 'Data & Privacy',
      items: [
        {
          icon: IconShield,
          label: 'Export My Data',
          sub: 'Download your health data',
          grad: ['#0891B2', '#06B6D4'] as [string, string],
          onPress: handleExportData,
        },
        {
          icon: IconTrash,
          label: 'Delete Account',
          sub: 'Permanently remove all data',
          grad: ['#EF4444', '#DC2626'] as [string, string],
          onPress: handleDeleteAccount,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: IconStar,
          label: 'Rate the App',
          sub: 'Love Nexara? Leave a review',
          grad: ['#F59E0B', '#F97316'] as [string, string],
          onPress: () => Linking.openURL('https://apps.apple.com'),
        },
        {
          icon: IconMail,
          label: 'Send Feedback',
          sub: 'Report a bug or suggestion',
          grad: ['#10B981', '#06B6D4'] as [string, string],
          onPress: () => Linking.openURL('mailto:support@nexara.app?subject=Feedback'),
        },
        {
          icon: IconInfo,
          label: 'Help & FAQ',
          sub: 'Get answers to common questions',
          grad: ['#3B82F6', '#6366F1'] as [string, string],
          onPress: () => Linking.openURL('https://nexara.app/help'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: IconShield,
          label: 'Privacy Policy',
          sub: 'How we use your data',
          grad: ['#0EA5E9', '#6366F1'] as [string, string],
          onPress: () => setShowPrivacy(true),
        },
        {
          icon: IconLock,
          label: 'Terms of Service',
          sub: 'Usage agreement',
          grad: ['#F59E0B', '#EF4444'] as [string, string],
          onPress: () => setShowTerms(true),
        },
        {
          icon: IconInfo,
          label: 'About Nexara',
          sub: 'Version 1.0.0',
          grad: ['#10B981', '#06B6D4'] as [string, string],
          onPress: () => setShowAbout(true),
        },
      ],
    },
  ];

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F5FA' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Fixed hero */}
      <Animated.View style={entranceStyle(ps0)}>
        <LinearGradient
          colors={['#0C2340', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 280,
            paddingTop: 56,
            paddingHorizontal: 24,
            paddingBottom: 20,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Decorative circles */}
          <View
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: 100,
              top: -60,
              right: -50,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 60,
              bottom: -30,
              left: -30,
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          />

          <View style={{ alignItems: 'center' }}>
            {/* Avatar with rings */}
            <TouchableOpacity
              onPress={handleAvatarPress}
              activeOpacity={0.85}
              disabled={avatarUploading}
              style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}
            >
              {/* Outer ring */}
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Inner ring */}
                <View
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 39,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={{ width: 70, height: 70, borderRadius: 35 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={['#0891B2', '#0E7490', '#06B6D4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 35,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 28,
                          fontWeight: '900',
                          color: '#fff',
                          letterSpacing: -1,
                        }}
                      >
                        {initials}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
              </View>

              {/* Camera / uploading badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.3)',
                  overflow: 'hidden',
                  shadowColor: '#0891B2',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <LinearGradient
                  colors={['#0891B2', '#06B6D4']}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {avatarUploading ? (
                    <ActivityIndicator size={12} color="#fff" />
                  ) : (
                    <IconEdit size={13} color="#fff" />
                  )}
                </LinearGradient>
              </View>
            </TouchableOpacity>

            {/* Name */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: '900',
                color: '#fff',
                letterSpacing: -0.8,
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {user?.name || 'Athlete'}
            </Text>

            {/* Pills row */}
            <View
              style={{
                flexDirection: 'row',
                gap: 6,
                marginTop: 8,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {user?.gender && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.25)',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {user.gender}
                  </Text>
                </View>
              )}
              {age && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.25)',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {age} years old
                  </Text>
                </View>
              )}
              {profile?.blood_type && (
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.25)',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {profile.blood_type}
                  </Text>
                </View>
              )}
            </View>

            {/* Edit button */}
            <TouchableOpacity onPress={() => setEditOpen(true)} style={{ marginTop: 10 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  paddingHorizontal: 24,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
              >
                <IconEdit size={13} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Edit Profile</Text>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}
      >
        <Animated.View style={entranceStyle(ps1)}>
          <View style={{ paddingHorizontal: 20 }}>
            {/* ── Body Stats ───────────────────────────────────────────── */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#4B5563',
                letterSpacing: 1.2,
                marginBottom: 12,
              }}
            >
              BODY STATS
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, flex: 1, marginBottom: 28 }}>
              {[
                {
                  label: 'Height',
                  val: profile?.height
                    ? prefs.heightUnit === 'ft'
                      ? `${Math.floor(profile.height / 30.48)}'${Math.round((profile.height % 30.48) / 2.54)}"`
                      : `${profile.height}`
                    : '—',
                  unit: prefs.heightUnit === 'ft' ? 'ft/in' : 'cm',
                  grad: ['#3B82F6', '#06B6D4'] as [string, string],
                  Icon: IconRuler,
                },
                {
                  label: 'Weight',
                  val: profile?.baseline_weight
                    ? prefs.weightUnit === 'lbs'
                      ? `${(profile.baseline_weight * 2.20462).toFixed(1)}`
                      : `${profile.baseline_weight}`
                    : '—',
                  unit: prefs.weightUnit,
                  grad: ['#EC4899', '#F43F5E'] as [string, string],
                  Icon: IconHeart,
                },
                {
                  label: 'BMI',
                  val: bmi ?? '—',
                  unit: bmi_ ? bmi_.label : '',
                  grad: bmi_
                    ? ([bmi_.color, bmi_.color] as [string, string])
                    : (['#4B5563', '#6B7280'] as [string, string]),
                  Icon: IconInfo,
                },
              ].map((s) => (
                <View
                  key={s.label}
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#E4E7F0',
                    backgroundColor: '#FFFFFF',
                    shadowColor: '#0891B2',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.07,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <LinearGradient
                      colors={s.grad}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <s.Icon size={18} color="#fff" />
                    </LinearGradient>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: '900',
                        color: '#0F0F1A',
                        letterSpacing: -0.5,
                      }}
                    >
                      {s.val}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                      {s.unit || s.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
        {/* ── Menu sections ────────────────────────────────────────── */}
        <Animated.View style={entranceStyle(ps2)}>
          <View style={{ paddingHorizontal: 20 }}>
            {MENU_SECTIONS.map((section) => (
              <View key={section.title} style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#4B5563',
                    letterSpacing: 1.2,
                    marginBottom: 12,
                  }}
                >
                  {section.title.toUpperCase()}
                </Text>
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#E4E7F0',
                    overflow: 'hidden',
                    shadowColor: '#0891B2',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  {section.items.map((item, i) => (
                    <TouchableOpacity
                      key={item.label}
                      activeOpacity={0.7}
                      onPress={'onPress' in item ? item.onPress : undefined}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: i < section.items.length - 1 ? 1 : 0,
                        borderColor: '#F3F4F8',
                      }}
                    >
                      <LinearGradient
                        colors={item.grad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        <item.icon size={16} color="#fff" />
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F0F1A' }}>
                          {item.label}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                          {item.sub}
                        </Text>
                      </View>
                      {'toggle' in item && item.toggle ? (
                        <Switch
                          value={notifs}
                          onValueChange={handleNotifsToggle}
                          trackColor={{ false: '#E4E7F0', true: '#0891B2' }}
                          thumbColor="#fff"
                          ios_backgroundColor="#E4E7F0"
                        />
                      ) : item.label === 'Export My Data' && exporting ? (
                        <ActivityIndicator size={16} color="#0891B2" />
                      ) : (
                        <View style={{ backgroundColor: '#F3F4F8', borderRadius: 8, padding: 5 }}>
                          <IconChevronRight size={14} color="#6B7280" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
        {/* ── Logout ───────────────────────────────────────────────── */}
        <Animated.View style={entranceStyle(ps3)}>
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity
              onPress={() => setShowLogout(true)}
              activeOpacity={0.85}
              style={{ marginBottom: 12 }}
            >
              <LinearGradient
                colors={['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.06)']}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.25)',
                  paddingVertical: 17,
                }}
              >
                <IconLogOut size={18} color="#F87171" />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#F87171',
                    letterSpacing: 0.2,
                  }}
                >
                  Log Out
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
              Nexara v1.0.0
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <EditModal
        visible={editOpen}
        form={form}
        saving={saving}
        onChange={setForm}
        onSave={handleSave}
        onClose={() => setEditOpen(false)}
      />

      <PreferencesModal
        visible={showPrefs}
        prefs={prefs}
        onClose={() => setShowPrefs(false)}
        onSave={savePrefs}
      />

      {/* ── Logout confirmation modal ───────────────────────────────────── */}
      <Modal
        visible={showLogout}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLogout(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderTopWidth: 1,
              borderColor: 'rgba(239,68,68,0.25)',
              paddingBottom: 40,
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#E4E7F0',
                }}
              />
            </View>

            {/* Icon + text */}
            <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 32 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: '#FEE2E2',
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <IconLogOut size={28} color="#F87171" />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: '#0F0F1A',
                  letterSpacing: -0.4,
                  marginBottom: 8,
                }}
              >
                Log Out?
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 }}>
                You&apos;ll need to verify your phone number again to sign back in.
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ paddingHorizontal: 24, gap: 12 }}>
              <TouchableOpacity onPress={logout} activeOpacity={0.85}>
                <LinearGradient
                  colors={['rgba(239,68,68,0.9)', 'rgba(220,38,38,0.9)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    borderRadius: 20,
                    paddingVertical: 17,
                  }}
                >
                  <IconLogOut size={18} color="#fff" />
                  <Text
                    style={{ fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 }}
                  >
                    Yes, Log Out
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLogout(false)}
                activeOpacity={0.7}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#E4E7F0',
                  paddingVertical: 17,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Avatar picker bottom sheet ── */}
      {showAvatarSheet && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}>
          {/* Backdrop */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15,15,26,0.55)',
              opacity: avatarSheetAnim,
            }}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => closeAvatarSheet()}
            />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [
                {
                  translateY: Animated.add(
                    avatarSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }),
                    sheetDragY
                  ),
                },
              ],
            }}
          >
            {/* Gradient border wrapper */}
            <LinearGradient
              colors={['#0891B2', '#0E7490', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderTopLeftRadius: 33, borderTopRightRadius: 33, padding: 1.5 }}
            >
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingBottom: insets.bottom + 40,
                  overflow: 'hidden',
                  minHeight: '95%',
                }}
              >
                {/* Drag handle row */}
                <View
                  {...sheetPanResponder.panHandlers}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingTop: 14,
                    paddingBottom: 4,
                  }}
                >
                  <View style={{ flex: 1 }} />
                  <View
                    style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: '#E4E7F0' }}
                  />
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                      onPress={() => closeAvatarSheet()}
                      activeOpacity={0.7}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: '#F3F4F8',
                        borderWidth: 1,
                        borderColor: '#E4E7F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hero avatar section */}
                <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 24 }}>
                  {/* Avatar with gradient ring */}
                  <View style={{ marginBottom: 16, position: 'relative' }}>
                    <LinearGradient
                      colors={['#0891B2', '#0E7490', '#06B6D4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        padding: 3,
                        shadowColor: '#0891B2',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.35,
                        shadowRadius: 20,
                        elevation: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 94,
                          height: 94,
                          borderRadius: 47,
                          overflow: 'hidden',
                          backgroundColor: '#E0F7FA',
                        }}
                      >
                        {avatarUri ? (
                          <Image
                            source={{ uri: avatarUri }}
                            style={{ width: 94, height: 94 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <LinearGradient
                            colors={['#0891B2', '#0E7490', '#06B6D4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Text
                              style={{
                                fontSize: 34,
                                fontWeight: '900',
                                color: '#fff',
                                letterSpacing: -1,
                              }}
                            >
                              {initials}
                            </Text>
                          </LinearGradient>
                        )}
                      </View>
                    </LinearGradient>
                    {/* Upload indicator badge */}
                    {avatarUploading && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: '#0891B2',
                          borderWidth: 2,
                          borderColor: '#fff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ActivityIndicator size={12} color="#fff" />
                      </View>
                    )}
                  </View>

                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '900',
                      color: '#0F0F1A',
                      letterSpacing: -0.5,
                    }}
                  >
                    {user?.name || 'Your Photo'}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                    {avatarUri
                      ? 'Update or remove your photo'
                      : 'Add a photo to personalise your profile'}
                  </Text>
                </View>

                {/* Divider */}
                <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
                  <View style={{ height: 1, backgroundColor: '#F0EEFF' }} />
                </View>

                {/* Action buttons */}
                <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 6 }}>
                  {/* Take Photo */}
                  <TouchableOpacity onPress={pickFromCamera} activeOpacity={0.75}>
                    <LinearGradient
                      colors={['#F8F6FF', '#F3EEFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 14,
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: '#E0F7FA',
                        gap: 14,
                      }}
                    >
                      <LinearGradient
                        colors={['#0891B2', '#0E7490']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>📷</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F0F1A' }}>
                          Take Photo
                        </Text>
                        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                          Open camera to snap a new photo
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: '#E0F7FA',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconChevronRight size={13} color="#0891B2" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Choose from Library */}
                  <TouchableOpacity onPress={pickFromLibrary} activeOpacity={0.75}>
                    <LinearGradient
                      colors={['#F0FEFF', '#E6FDFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 14,
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: '#A5F3FC',
                        gap: 14,
                      }}
                    >
                      <LinearGradient
                        colors={['#0891B2', '#06B6D4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>🖼️</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F0F1A' }}>
                          Choose from Library
                        </Text>
                        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                          Pick an existing photo from gallery
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: '#ECFEFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconChevronRight size={13} color="#0891B2" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Remove Photo — only if avatar exists */}
                  {avatarUri && (
                    <TouchableOpacity onPress={handleRemovePhoto} activeOpacity={0.75}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 18,
                          borderWidth: 1.5,
                          borderColor: '#FECACA',
                          backgroundColor: '#FFF5F5',
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 14,
                            backgroundColor: '#FEE2E2',
                            borderWidth: 1,
                            borderColor: '#FECACA',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 22 }}>🗑️</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#EF4444' }}>
                            Remove Photo
                          </Text>
                          <Text style={{ fontSize: 12, color: '#FCA5A5', marginTop: 2 }}>
                            Delete your current profile picture
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: '#FEE2E2',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconChevronRight size={13} color="#EF4444" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Hint text */}
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: '#D1D5DB',
                    marginTop: 2,
                    marginBottom: 4,
                  }}
                >
                  Photos are stored securely and only visible to you
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      )}

      <LegalModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
        effectiveDate={PRIVACY_POLICY_DATE}
        sections={PRIVACY_POLICY_SECTIONS}
      />
      <LegalModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
        effectiveDate={TERMS_DATE}
        sections={TERMS_SECTIONS}
      />
      <LegalModal
        visible={showAbout}
        onClose={() => setShowAbout(false)}
        title="About Nexara"
        sections={ABOUT_SECTIONS}
      />
    </View>
  );
};

export default ProfileScreen;
