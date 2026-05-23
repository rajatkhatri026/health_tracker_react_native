import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Skeleton } from '../Skeleton/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { IconBell, IconCheck, IconTrash, IconX } from '../icons/Icons';
import type { AppNotification, NotificationType } from '../../api/notifications';
import { COLORS, RADIUS } from '../../utils/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.82;

// ── Notification type config ──────────────────────────────────────────────────
const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  reminder: { icon: '⏰', color: '#F59E0B', bg: '#FEF3C7' },
  summary: { icon: '📊', color: '#06B6D4', bg: '#ECFEFF' },
  goal: { icon: '🎯', color: '#7C3AED', bg: '#EDE9FE' },
  streak: { icon: '🔥', color: '#EF4444', bg: '#FEE2E2' },
  system: { icon: '⚙️', color: '#6B7280', bg: '#F3F4F8' },
};

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Single notification row ───────────────────────────────────────────────────
const NotifRow: React.FC<{
  notif: AppNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ notif, onRead, onDelete }) => {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (!notif.read) onRead(notif.id);
      }}
      style={[s.row, !notif.read && s.rowUnread]}
    >
      {/* Unread dot */}
      {!notif.read && <View style={s.unreadDot} />}

      {/* Icon */}
      <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
        <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[s.rowTitle, !notif.read && { color: '#6D28D9', fontWeight: '700' }]}>
          {notif.title}
        </Text>
        <Text style={s.rowBody} numberOfLines={2}>
          {notif.body}
        </Text>
        <Text style={[s.rowTime, { color: cfg.color }]}>{timeAgo(notif.created_at)}</Text>
      </View>

      {/* Delete button */}
      <TouchableOpacity
        onPress={() => onDelete(notif.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={s.deleteBtn}
      >
        <IconTrash size={15} color="#9CA3AF" strokeWidth={2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ── Main sheet ────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onOpen: () => void; // called when sheet opens to load data
}

const NotificationsSheet: React.FC<Props> = ({
  visible,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
  onOpen,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + 24;

  const [slideY] = useState(() => new Animated.Value(SHEET_H));
  const [backdropOp] = useState(() => new Animated.Value(0));
  const [dragY] = useState(() => new Animated.Value(0));
  const [rendered, setRendered] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  // Track whether scroll list is at top — only allow drag-close when at top
  const scrollAtTop = useRef(true);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(dragY, { toValue: SHEET_H, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropOp, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      dragY.setValue(0);
      slideY.setValue(SHEET_H);
      setRendered(false);
      onClose();
    });
  };

  // Pan responder only on the handle bar — never conflicts with ScrollView
  const panResponder = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, gs) => gs.dy > 4,
      onPanResponderMove: (_e, gs) => {
        if (gs.dy > 0) dragY.setValue(gs.dy);
      },
      onPanResponderRelease: (_e, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          dismiss();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  )[0];

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollAtTop.current = e.nativeEvent.contentOffset.y <= 0;
  };

  useEffect(() => {
    if (visible) {
      setRendered(true);
      onOpen();
      dragY.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: SHEET_H, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOp, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setRendered(false);
        dragY.setValue(0);
      });
    }
  }, [visible, slideY, backdropOp, dragY, onOpen]);

  const displayed = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  if (!rendered) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropOp },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet — gradient border wrapper matches avatar sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SHEET_H,
          transform: [{ translateY: Animated.add(slideY, dragY) }],
        }}
      >
        <LinearGradient
          colors={['#7C3AED', '#4F46E5', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderTopLeftRadius: 33, borderTopRightRadius: 33, padding: 1.5, flex: 1 }}
        >
          <Animated.View style={[s.sheet, { transform: [] }]}>
            {/* Handle */}
            <View {...panResponder.panHandlers} style={s.handleArea}>
              <View style={s.handle} />
            </View>

            {/* Header */}
            <View style={s.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.headerIconWrap}>
                  <IconBell size={18} color="#A78BFA" strokeWidth={2} />
                  {unreadCount > 0 && (
                    <View style={s.headerBadge}>
                      <Text style={s.headerBadgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
                <View>
                  <Text style={s.headerTitle}>Notifications</Text>
                  <Text style={s.headerSub}>
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <IconX size={18} color={COLORS.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Filter + actions row */}
            <View style={s.actionsRow}>
              <View style={s.filterPills}>
                {(['all', 'unread'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[s.pill, filter === f && s.pillActive]}
                  >
                    <Text style={[s.pillText, filter === f && s.pillTextActive]}>
                      {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={onMarkAllRead} style={s.actionBtn}>
                    <IconCheck size={13} color="#A78BFA" strokeWidth={2.5} />
                    <Text style={s.actionBtnText}>Read all</Text>
                  </TouchableOpacity>
                )}
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={onClearAll} style={s.actionBtn}>
                    <IconTrash size={13} color="#EF4444" strokeWidth={2} />
                    <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Gradient divider */}
            <LinearGradient
              colors={['#7C3AED', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 1, marginHorizontal: 20, marginBottom: 8 }}
            />

            {/* Content — flex:1 ensures ScrollView fills remaining space */}
            <View style={{ flex: 1 }}>
              {loading ? (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: bottomPad,
                  }}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={s.skeletonRow}>
                      <Skeleton width={44} height={44} borderRadius={14} />
                      <View style={{ flex: 1, gap: 8 }}>
                        <Skeleton width="70%" height={13} borderRadius={6} />
                        <Skeleton width="90%" height={11} borderRadius={6} />
                        <Skeleton width="30%" height={10} borderRadius={6} />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : displayed.length === 0 ? (
                <View style={s.center}>
                  <Text style={{ fontSize: 48, marginBottom: 14 }}>
                    {filter === 'unread' ? '✅' : '🔔'}
                  </Text>
                  <Text style={s.emptyTitle}>
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </Text>
                  <Text style={s.emptyText}>
                    {filter === 'unread'
                      ? "You've read everything."
                      : 'Health reminders and activity updates will appear here.'}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  bounces={true}
                  overScrollMode="always"
                >
                  {displayed.map((n) => (
                    <NotifRow key={n.id} notif={n} onRead={onMarkRead} onDelete={onDelete} />
                  ))}
                </ScrollView>
              )}
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7F0',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F0F1A', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F8',
    borderWidth: 1,
    borderColor: '#E4E7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterPills: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F8',
    borderWidth: 1,
    borderColor: '#E4E7F0',
  },
  pillActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  pillText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  pillTextActive: { color: '#7C3AED' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F8',
    borderWidth: 1,
    borderColor: '#E4E7F0',
  },
  actionBtnText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F0F1A', marginBottom: 8 },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEFF',
  },
  rowUnread: {
    backgroundColor: '#FAFAFE',
    borderRadius: 14,
    paddingHorizontal: 10,
    marginHorizontal: -6,
  },
  unreadDot: {
    position: 'absolute',
    left: -2,
    top: 20,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7C3AED',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#0F0F1A', lineHeight: 18 },
  rowBody: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  rowTime: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  deleteBtn: { paddingTop: 2 },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEFF',
  },
});

export default NotificationsSheet;
