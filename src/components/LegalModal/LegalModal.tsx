import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../../utils/theme';

interface Section {
  heading: string;
  body: string;
}

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  effectiveDate?: string;
  sections: Section[];
}

const LegalModal: React.FC<LegalModalProps> = ({
  visible,
  onClose,
  title,
  effectiveDate,
  sections,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={onClose}
  >
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.handle} />
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{title}</Text>
            {effectiveDate && <Text style={s.date}>Effective {effectiveDate}</Text>}
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <LinearGradient
              colors={['#0891B2', '#0891B2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.doneBtn}
            >
              <Text style={s.doneTxt}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((sec, i) => (
          <View key={i} style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionDot} />
              <Text style={s.heading}>{sec.heading}</Text>
            </View>
            <Text style={s.body}>{sec.body}</Text>
          </View>
        ))}
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  </Modal>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  doneBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
  },
  doneTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0891B2',
  },
  heading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0891B2',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSub,
    lineHeight: 22,
  },
});

export default LegalModal;
