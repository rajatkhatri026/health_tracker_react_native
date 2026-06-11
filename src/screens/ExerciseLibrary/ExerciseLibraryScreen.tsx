/* eslint-disable react-hooks/refs */
import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Dimensions,
  Modal,
  Image,
  Animated,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

// ── Types ─────────────────────────────────────────────────────────────────────
type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type Equipment =
  | 'No Equipment'
  | 'Dumbbells'
  | 'Barbell'
  | 'Machine'
  | 'Cable'
  | 'Kettlebell'
  | 'Pull-up Bar';
type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' | 'Cardio';

interface Exercise {
  id: string;
  name: string;
  muscle: string; // primary muscle
  group: MuscleGroup;
  equipment: Equipment;
  difficulty: Difficulty;
  sets: string;
  reps: string;
  rest: string;
  tips: string[];
  gifUrl: string; // animated demo GIF
  muscles: string[]; // secondary muscles
  calories: string; // kcal per set estimate
}

// ── GIF URLs — exercisedb.dev open CDN (static.exercisedb.dev/media/{id}.gif) ─
const CDN = 'https://static.exercisedb.dev/media';
const G = {
  // Chest
  benchPress: `${CDN}/7xI5MXA.gif`, // cable bench press
  pushUp: `${CDN}/7E06s6d.gif`, // chest tap push-up
  inclineDumbbell: `${CDN}/1PLE8e9.gif`, // dumbbell incline flyes
  cableFly: `${CDN}/7saC5zz.gif`, // cable decline fly
  dips: `${CDN}/05Cf2v8.gif`, // impossible dips
  pullover: `${CDN}/33AzZeV.gif`, // barbell pullover
  // Back
  deadlift: `${CDN}/5lE7XRz.gif`, // smith bent over row
  pullUp: `${CDN}/0V2YQjW.gif`, // pull up (neutral grip)
  barbellRow: `${CDN}/7vG5o25.gif`, // dumbbell incline row
  latPulldown: `${CDN}/4LoWllp.gif`, // band close grip pulldown
  cableRow: `${CDN}/1u36hhy.gif`, // lever narrow grip seated row
  facePull: `${CDN}/4c9BhzB.gif`, // cable lateral pulldown
  dbRow: `${CDN}/4OaumBr.gif`, // suspended row
  // Shoulders
  ohp: `${CDN}/A6wtbuL.gif`, // dumbbell standing overhead press
  lateralRaise: `${CDN}/AQ0mC4Y.gif`, // dumbbell full can lateral raise
  frontRaise: `${CDN}/3eGE2JC.gif`, // dumbbell front raise
  arnoldPress: `${CDN}/84RyJf8.gif`, // dumbbell one arm shoulder press
  uprightRow: `${CDN}/83HoW9X.gif`, // barbell upright row
  // Arms
  curl: `${CDN}/25GPyDY.gif`, // barbell curl
  hammerCurl: `${CDN}/2NpxjC1.gif`, // dumbbell hammer curl
  pushdown: `${CDN}/3ZflifB.gif`, // cable pushdown
  skullCrusher: `${CDN}/1TVoin7.gif`, // barbell lying triceps extension
  preacher: `${CDN}/2kattbR.gif`, // ez barbell spider curl
  diamondPushUp: `${CDN}/1YB40kg.gif`, // incline close-grip push-up
  concCurl: `${CDN}/1V1gj1u.gif`, // seated concentration curl
  // Legs
  squat: `${CDN}/1gFNTZV.gif`, // barbell jump squat
  rdl: `${CDN}/2Ty4idJ.gif`, // dumbbell stiff leg deadlift
  legPress: `${CDN}/10Z2DXU.gif`, // sled 45° leg press
  lunges: `${CDN}/13VW2VO.gif`, // weighted stretch lunge
  legCurl: `${CDN}/17lJ1kr.gif`, // lever lying leg curl
  calfRaise: `${CDN}/8ozhUIZ.gif`, // barbell standing calf raise
  gobletSquat: `${CDN}/5bpPTHv.gif`, // kettlebell pistol squat
  hipThrust: `${CDN}/1bQkKZK.gif`, // smith bent knee good morning
  // Core
  plank: `${CDN}/5VXmnV5.gif`, // bodyweight side plank
  crunch: `${CDN}/9Ap7miY.gif`, // decline crunch
  russianTwist: `${CDN}/6bOA1Oi.gif`, // weighted side bend
  legRaise: `${CDN}/4Ml7QFO.gif`, // hanging straight leg raise
  abRollout: `${CDN}/7M66AVi.gif`, // barbell rollout
  mountainClimber: `${CDN}/1ZFqTDN.gif`, // air bike
  deadBug: `${CDN}/1GPHRyK.gif`, // janda sit-up
  hollowBody: `${CDN}/2gPfomN.gif`, // 3/4 sit-up
  // Cardio
  burpee: `${CDN}/dK9394r.gif`, // burpee
  jumpRope: `${CDN}/e1e76I2.gif`, // jump rope
  boxJump: `${CDN}/6FMU51h.gif`, // semi squat jump
  battleRopes: `${CDN}/Eh2v5Iu.gif`, // scissor jumps
  highKnees: `${CDN}/J9zIWig.gif`, // walking high knees
};

// ── Exercise database ─────────────────────────────────────────────────────────
const EXERCISES: Exercise[] = [
  // CHEST
  {
    id: 'c1',
    group: 'Chest',
    name: 'Bench Press',
    muscle: 'Pectoralis Major',
    muscles: ['Triceps', 'Anterior Deltoid'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '6–10',
    rest: '90s',
    calories: '~45',
    gifUrl: G.benchPress,
    tips: [
      'Keep shoulder blades retracted throughout the lift',
      'Lower bar to lower chest, not neck',
      'Drive feet into floor and maintain arch',
    ],
  },
  {
    id: 'c2',
    group: 'Chest',
    name: 'Push-Up',
    muscle: 'Pectoralis Major',
    muscles: ['Triceps', 'Core'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '3',
    reps: '15–25',
    rest: '60s',
    calories: '~25',
    gifUrl: G.pushUp,
    tips: [
      'Core braced — body forms a plank',
      'Lower until chest nearly touches floor',
      'Hands slightly wider than shoulder-width',
    ],
  },
  {
    id: 'c3',
    group: 'Chest',
    name: 'Incline Dumbbell Press',
    muscle: 'Upper Pectoralis',
    muscles: ['Triceps', 'Shoulders'],
    equipment: 'Dumbbells',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '10–12',
    rest: '75s',
    calories: '~40',
    gifUrl: G.inclineDumbbell,
    tips: [
      'Set bench at 30–45° — higher reduces chest activation',
      'Control the descent for 2–3 seconds',
      'Squeeze chest hard at top',
    ],
  },
  {
    id: 'c4',
    group: 'Chest',
    name: 'Cable Fly',
    muscle: 'Pectoralis Major',
    muscles: ['Anterior Deltoid'],
    equipment: 'Cable',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    calories: '~30',
    gifUrl: G.cableFly,
    tips: [
      'Keep a slight, consistent elbow bend',
      'Focus on the chest stretch at end range',
      'Avoid using momentum',
    ],
  },
  {
    id: 'c5',
    group: 'Chest',
    name: 'Dips',
    muscle: 'Lower Pectoralis',
    muscles: ['Triceps', 'Shoulders'],
    equipment: 'No Equipment',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '8–15',
    rest: '75s',
    calories: '~35',
    gifUrl: G.dips,
    tips: [
      'Lean torso forward for chest emphasis',
      'Go to full depth — upper arms parallel to floor',
      'Avoid excessive elbow flare',
    ],
  },
  {
    id: 'c6',
    group: 'Chest',
    name: 'Dumbbell Pullover',
    muscle: 'Pectoralis Major',
    muscles: ['Lats', 'Serratus'],
    equipment: 'Dumbbells',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    calories: '~28',
    gifUrl: G.pullover,
    tips: [
      'Keep a slight, fixed elbow bend throughout',
      'Feel the deep chest and lat stretch at bottom',
      'Use lighter weight, prioritise range',
    ],
  },
  // BACK
  {
    id: 'b1',
    group: 'Back',
    name: 'Deadlift',
    muscle: 'Erector Spinae',
    muscles: ['Glutes', 'Hamstrings', 'Traps'],
    equipment: 'Barbell',
    difficulty: 'Advanced',
    sets: '4',
    reps: '4–6',
    rest: '120s',
    calories: '~80',
    gifUrl: G.deadlift,
    tips: [
      'Hip hinge — not a squat — initiate by pushing the floor away',
      'Keep bar in contact with shins throughout',
      'Neutral spine: no rounding of lower back',
    ],
  },
  {
    id: 'b2',
    group: 'Back',
    name: 'Pull-Up',
    muscle: 'Latissimus Dorsi',
    muscles: ['Biceps', 'Rear Deltoid'],
    equipment: 'Pull-up Bar',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '6–12',
    rest: '90s',
    calories: '~50',
    gifUrl: G.pullUp,
    tips: [
      'Engage lats before pulling — think "elbows to hips"',
      'Full dead hang at the bottom each rep',
      'Chin clearly over the bar at the top',
    ],
  },
  {
    id: 'b3',
    group: 'Back',
    name: 'Barbell Row',
    muscle: 'Rhomboids',
    muscles: ['Lats', 'Biceps', 'Rear Deltoid'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '8–10',
    rest: '90s',
    calories: '~55',
    gifUrl: G.barbellRow,
    tips: [
      'Hinge at hips to ~45°, not 90° — keep back tight',
      'Pull to lower abdomen, not chest',
      'Drive elbows behind body, squeeze shoulder blades',
    ],
  },
  {
    id: 'b4',
    group: 'Back',
    name: 'Lat Pulldown',
    muscle: 'Latissimus Dorsi',
    muscles: ['Biceps', 'Teres Major'],
    equipment: 'Machine',
    difficulty: 'Beginner',
    sets: '3',
    reps: '10–12',
    rest: '75s',
    calories: '~40',
    gifUrl: G.latPulldown,
    tips: [
      'Lean back slightly (~15°) to clear face',
      'Pull bar to upper chest',
      'Fully extend arms at the top — no half reps',
    ],
  },
  {
    id: 'b5',
    group: 'Back',
    name: 'Seated Cable Row',
    muscle: 'Mid-Back',
    muscles: ['Biceps', 'Rear Deltoid'],
    equipment: 'Cable',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    calories: '~35',
    gifUrl: G.cableRow,
    tips: [
      'Keep torso upright — avoid rocking',
      'Row handle to lower sternum',
      'Slow eccentric: 3 seconds back',
    ],
  },
  {
    id: 'b6',
    group: 'Back',
    name: 'Face Pull',
    muscle: 'Rear Deltoids',
    muscles: ['Rotator Cuff', 'Traps'],
    equipment: 'Cable',
    difficulty: 'Beginner',
    sets: '3',
    reps: '15–20',
    rest: '60s',
    calories: '~20',
    gifUrl: G.facePull,
    tips: [
      'Use rope attachment at head height',
      'Pull to face with external rotation at end',
      'Light weight, high reps — this protects shoulder health',
    ],
  },
  {
    id: 'b7',
    group: 'Back',
    name: 'Single-Arm DB Row',
    muscle: 'Latissimus Dorsi',
    muscles: ['Rhomboids', 'Biceps'],
    equipment: 'Dumbbells',
    difficulty: 'Beginner',
    sets: '3',
    reps: '10–12 each',
    rest: '60s',
    calories: '~35',
    gifUrl: G.dbRow,
    tips: [
      'Brace on bench with opposite hand and knee',
      'Allow a full stretch at the bottom',
      'Row elbow past torso — slight torso rotation is fine',
    ],
  },
  // SHOULDERS
  {
    id: 's1',
    group: 'Shoulders',
    name: 'Overhead Press',
    muscle: 'Anterior Deltoid',
    muscles: ['Medial Deltoid', 'Triceps'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '6–8',
    rest: '90s',
    calories: '~50',
    gifUrl: G.ohp,
    tips: [
      'Press bar directly overhead — not forward',
      'Engage core and glutes to stabilise',
      'Bar should finish above centre of skull',
    ],
  },
  {
    id: 's2',
    group: 'Shoulders',
    name: 'Lateral Raise',
    muscle: 'Medial Deltoid',
    muscles: ['Supraspinatus'],
    equipment: 'Dumbbells',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    calories: '~20',
    gifUrl: G.lateralRaise,
    tips: [
      'Slight elbow bend — maintain throughout',
      'Raise to shoulder height only — not higher',
      'Pinky slightly higher than thumb at top',
    ],
  },
  {
    id: 's3',
    group: 'Shoulders',
    name: 'Front Raise',
    muscle: 'Anterior Deltoid',
    muscles: ['Upper Pec'],
    equipment: 'Dumbbells',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    calories: '~20',
    gifUrl: G.frontRaise,
    tips: [
      'Alternate arms for stability',
      'Stop at shoulder height — not higher',
      'Keep torso still — no swinging',
    ],
  },
  {
    id: 's4',
    group: 'Shoulders',
    name: 'Arnold Press',
    muscle: 'All 3 Deltoid Heads',
    muscles: ['Triceps'],
    equipment: 'Dumbbells',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '10–12',
    rest: '75s',
    calories: '~35',
    gifUrl: G.arnoldPress,
    tips: [
      'Start with palms facing you at chin height',
      'Rotate palms outward as you press up',
      'Full ROM is the key benefit of this variation',
    ],
  },
  {
    id: 's5',
    group: 'Shoulders',
    name: 'Upright Row',
    muscle: 'Medial Deltoid',
    muscles: ['Traps', 'Biceps'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '10–12',
    rest: '75s',
    calories: '~30',
    gifUrl: G.uprightRow,
    tips: [
      'Elbows lead and stay higher than wrists',
      'Pull to chin height — not higher (shoulder impingement risk)',
      'Use moderate weight only',
    ],
  },
  // ARMS
  {
    id: 'a1',
    group: 'Arms',
    name: 'Barbell Curl',
    muscle: 'Biceps Brachii',
    muscles: ['Brachialis'],
    equipment: 'Barbell',
    difficulty: 'Beginner',
    sets: '3',
    reps: '10–12',
    rest: '60s',
    calories: '~25',
    gifUrl: G.curl,
    tips: [
      'Upper arms pinned to sides — no swinging',
      'Squeeze hard at peak contraction',
      'Full extension at the bottom each rep',
    ],
  },
  {
    id: 'a2',
    group: 'Arms',
    name: 'Hammer Curl',
    muscle: 'Brachialis',
    muscles: ['Brachioradialis', 'Biceps'],
    equipment: 'Dumbbells',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    calories: '~22',
    gifUrl: G.hammerCurl,
    tips: [
      'Neutral (hammer) grip throughout',
      'Can be done alternating or together',
      'Keep upper arm locked — only forearm moves',
    ],
  },
  {
    id: 'a3',
    group: 'Arms',
    name: 'Tricep Pushdown',
    muscle: 'Triceps Brachii',
    muscles: ['Lateral Head'],
    equipment: 'Cable',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    calories: '~22',
    gifUrl: G.pushdown,
    tips: [
      'Upper arms locked at sides throughout',
      'Fully extend arms — lock out at bottom',
      'Control the return — 2 seconds eccentric',
    ],
  },
  {
    id: 'a4',
    group: 'Arms',
    name: 'Skull Crusher',
    muscle: 'Triceps Long Head',
    muscles: ['Medial Head'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '10–12',
    rest: '75s',
    calories: '~28',
    gifUrl: G.skullCrusher,
    tips: [
      'Lower bar to forehead — upper arms stay vertical',
      'Press back to lockout — no flaring elbows',
      'Use EZ-bar to reduce wrist strain',
    ],
  },
  {
    id: 'a5',
    group: 'Arms',
    name: 'Preacher Curl',
    muscle: 'Biceps Short Head',
    muscles: ['Brachialis'],
    equipment: 'Machine',
    difficulty: 'Beginner',
    sets: '3',
    reps: '10–12',
    rest: '60s',
    calories: '~22',
    gifUrl: G.preacher,
    tips: [
      "Full stretch at the bottom — don't cut ROM",
      'No momentum — pad locks upper arm',
      'Squeeze and hold 1s at peak',
    ],
  },
  {
    id: 'a6',
    group: 'Arms',
    name: 'Diamond Push-Up',
    muscle: 'Triceps',
    muscles: ['Chest', 'Shoulders'],
    equipment: 'No Equipment',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '12–20',
    rest: '60s',
    calories: '~28',
    gifUrl: G.diamondPushUp,
    tips: [
      'Hands form a diamond shape under chest',
      'Elbows track back — not out',
      'Full lockout at top',
    ],
  },
  {
    id: 'a7',
    group: 'Arms',
    name: 'Concentration Curl',
    muscle: 'Biceps Peak',
    muscles: ['Brachialis'],
    equipment: 'Dumbbells',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15 each',
    rest: '60s',
    calories: '~18',
    gifUrl: G.concCurl,
    tips: [
      'Elbow braced on inner thigh — no cheating',
      'Supinate (rotate palm up) at the top',
      'Slow and controlled — feel every inch',
    ],
  },
  // LEGS
  {
    id: 'l1',
    group: 'Legs',
    name: 'Squat',
    muscle: 'Quadriceps',
    muscles: ['Glutes', 'Hamstrings', 'Core'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '6–10',
    rest: '120s',
    calories: '~90',
    gifUrl: G.squat,
    tips: [
      'Hip crease must go below knee at bottom',
      'Knees track in line with toes — not caving in',
      "Brace core like you're about to take a punch",
    ],
  },
  {
    id: 'l2',
    group: 'Legs',
    name: 'Romanian Deadlift',
    muscle: 'Hamstrings',
    muscles: ['Glutes', 'Erector Spinae'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '8–10',
    rest: '90s',
    calories: '~65',
    gifUrl: G.rdl,
    tips: [
      'Hinge at hips — push them back, not down',
      'Bar stays in contact with legs the whole way',
      'Feel a deep hamstring stretch before coming back up',
    ],
  },
  {
    id: 'l3',
    group: 'Legs',
    name: 'Leg Press',
    muscle: 'Quadriceps',
    muscles: ['Glutes', 'Hamstrings'],
    equipment: 'Machine',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15',
    rest: '75s',
    calories: '~55',
    gifUrl: G.legPress,
    tips: [
      'Feet shoulder-width, mid-platform',
      'Do not lock out knees at top',
      'Control the descent — 3 seconds down',
    ],
  },
  {
    id: 'l4',
    group: 'Legs',
    name: 'Walking Lunges',
    muscle: 'Quadriceps',
    muscles: ['Glutes', 'Hamstrings', 'Balance'],
    equipment: 'Dumbbells',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12 each leg',
    rest: '75s',
    calories: '~50',
    gifUrl: G.lunges,
    tips: [
      'Long stride to activate glutes more',
      'Back knee tracks directly downward',
      "Keep torso tall — don't lean forward",
    ],
  },
  {
    id: 'l5',
    group: 'Legs',
    name: 'Leg Curl',
    muscle: 'Hamstrings',
    muscles: ['Gastrocnemius'],
    equipment: 'Machine',
    difficulty: 'Beginner',
    sets: '3',
    reps: '12–15',
    rest: '60s',
    calories: '~35',
    gifUrl: G.legCurl,
    tips: [
      "Full range of motion — don't cut reps short",
      'Avoid lifting hips off the pad',
      'Slow eccentric: 3 seconds to lower',
    ],
  },
  {
    id: 'l6',
    group: 'Legs',
    name: 'Calf Raise',
    muscle: 'Gastrocnemius',
    muscles: ['Soleus'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '4',
    reps: '20–25',
    rest: '45s',
    calories: '~20',
    gifUrl: G.calfRaise,
    tips: [
      'Full stretch at the bottom — pause 1s',
      'Rise all the way onto balls of feet',
      'Use a step for greater range of motion',
    ],
  },
  {
    id: 'l7',
    group: 'Legs',
    name: 'Goblet Squat',
    muscle: 'Quadriceps',
    muscles: ['Glutes', 'Core'],
    equipment: 'Kettlebell',
    difficulty: 'Beginner',
    sets: '3',
    reps: '15–20',
    rest: '60s',
    calories: '~45',
    gifUrl: G.gobletSquat,
    tips: [
      'Hold kettlebell at chest height',
      'Elbows inside knees at the bottom',
      'Great drill for squat depth and form',
    ],
  },
  {
    id: 'l8',
    group: 'Legs',
    name: 'Hip Thrust',
    muscle: 'Gluteus Maximus',
    muscles: ['Hamstrings', 'Core'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '10–15',
    rest: '75s',
    calories: '~55',
    gifUrl: G.hipThrust,
    tips: [
      'Upper back rests on bench — shoulders only',
      'Drive through heels — not toes',
      'Squeeze glutes at top, hold 1 second',
    ],
  },
  // CORE
  {
    id: 'co1',
    group: 'Core',
    name: 'Plank',
    muscle: 'Transverse Abdominis',
    muscles: ['Obliques', 'Erector Spinae'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '3',
    reps: '30–60s',
    rest: '45s',
    calories: '~10',
    gifUrl: G.plank,
    tips: [
      'Body forms a straight line heel to head',
      'Do not let hips drop or pike',
      'Breathe steadily — resist the urge to hold breath',
    ],
  },
  {
    id: 'co2',
    group: 'Core',
    name: 'Crunch',
    muscle: 'Rectus Abdominis',
    muscles: ['Hip Flexors'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '3',
    reps: '20–25',
    rest: '45s',
    calories: '~12',
    gifUrl: G.crunch,
    tips: [
      "Hands lightly behind head — don't pull on neck",
      'Exhale as you curl up',
      "Feel the contraction — don't use momentum",
    ],
  },
  {
    id: 'co3',
    group: 'Core',
    name: 'Russian Twist',
    muscle: 'Obliques',
    muscles: ['Rectus Abdominis'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '3',
    reps: '20 each side',
    rest: '45s',
    calories: '~15',
    gifUrl: G.russianTwist,
    tips: [
      'Lift feet for increased difficulty',
      'Rotate from the torso — not arms',
      'Hold weight for progressive overload',
    ],
  },
  {
    id: 'co4',
    group: 'Core',
    name: 'Leg Raise',
    muscle: 'Lower Abs',
    muscles: ['Hip Flexors'],
    equipment: 'No Equipment',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '15–20',
    rest: '60s',
    calories: '~18',
    gifUrl: G.legRaise,
    tips: [
      'Lower back pressed firmly to floor',
      "Controlled descent — don't let legs drop",
      'Can bend knees to reduce difficulty',
    ],
  },
  {
    id: 'co5',
    group: 'Core',
    name: 'Ab Rollout',
    muscle: 'Rectus Abdominis',
    muscles: ['Obliques', 'Lats', 'Serratus'],
    equipment: 'No Equipment',
    difficulty: 'Advanced',
    sets: '3',
    reps: '8–12',
    rest: '75s',
    calories: '~22',
    gifUrl: G.abRollout,
    tips: [
      'Start from knees until you build strength',
      "Don't let hips sag — core stays tight",
      'Roll out only as far as you can control',
    ],
  },
  {
    id: 'co6',
    group: 'Core',
    name: 'Mountain Climber',
    muscle: 'Core',
    muscles: ['Shoulders', 'Hip Flexors'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '3',
    reps: '30s',
    rest: '30s',
    calories: '~20',
    gifUrl: G.mountainClimber,
    tips: [
      'High plank position throughout',
      'Drive knees explosively to chest',
      "Keep hips level — don't let them rise",
    ],
  },
  {
    id: 'co7',
    group: 'Core',
    name: 'Dead Bug',
    muscle: 'Deep Core',
    muscles: ['Transverse Abdominis'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '3',
    reps: '10 each side',
    rest: '45s',
    calories: '~10',
    gifUrl: G.deadBug,
    tips: [
      'Lower back pressed flat to floor always',
      'Extend opposite arm and leg simultaneously',
      'Move slowly — control is everything here',
    ],
  },
  {
    id: 'co8',
    group: 'Core',
    name: 'Hollow Body Hold',
    muscle: 'Rectus Abdominis',
    muscles: ['Hip Flexors', 'Serratus'],
    equipment: 'No Equipment',
    difficulty: 'Intermediate',
    sets: '3',
    reps: '20–30s',
    rest: '45s',
    calories: '~12',
    gifUrl: G.hollowBody,
    tips: [
      'Lower back pressed into floor',
      'Arms by ears, legs straight and elevated',
      'Bend knees to reduce difficulty',
    ],
  },
  // CARDIO
  {
    id: 'ca1',
    group: 'Cardio',
    name: 'Burpee',
    muscle: 'Full Body',
    muscles: ['Chest', 'Legs', 'Core'],
    equipment: 'No Equipment',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '10–15',
    rest: '60s',
    calories: '~55',
    gifUrl: G.burpee,
    tips: [
      'Explosive jump with arms overhead at top',
      'Full push-up at the bottom (not half reps)',
      'Soft landing — bend knees to absorb impact',
    ],
  },
  {
    id: 'ca2',
    group: 'Cardio',
    name: 'Jump Rope',
    muscle: 'Calves',
    muscles: ['Shoulders', 'Core'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '3',
    reps: '60–120s',
    rest: '45s',
    calories: '~60',
    gifUrl: G.jumpRope,
    tips: [
      'Rotation comes from wrists, not shoulders',
      'Stay on balls of feet — slight knee bend',
      'Build rhythm before adding speed',
    ],
  },
  {
    id: 'ca3',
    group: 'Cardio',
    name: 'Box Jump',
    muscle: 'Quadriceps',
    muscles: ['Glutes', 'Calves'],
    equipment: 'No Equipment',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '8–10',
    rest: '90s',
    calories: '~45',
    gifUrl: G.boxJump,
    tips: [
      'Full hip extension at the top of the jump',
      "Step down — don't jump down (reduces injury risk)",
      'Soft landing with bent knees',
    ],
  },
  {
    id: 'ca4',
    group: 'Cardio',
    name: 'Battle Ropes',
    muscle: 'Shoulders',
    muscles: ['Arms', 'Core'],
    equipment: 'No Equipment',
    difficulty: 'Intermediate',
    sets: '4',
    reps: '30s on / 15s off',
    rest: '60s',
    calories: '~50',
    gifUrl: G.battleRopes,
    tips: [
      'Slight hip hinge throughout — not upright',
      'Alternate wave or double wave variations',
      'Keep core braced — waves come from arms, not body',
    ],
  },
  {
    id: 'ca5',
    group: 'Cardio',
    name: 'High Knees',
    muscle: 'Hip Flexors',
    muscles: ['Core', 'Calves'],
    equipment: 'No Equipment',
    difficulty: 'Beginner',
    sets: '3',
    reps: '45s',
    rest: '30s',
    calories: '~40',
    gifUrl: G.highKnees,
    tips: [
      'Drive knees to waist height — not lower',
      'Arms pump in sync with legs',
      'Land on balls of feet for less joint impact',
    ],
  },
];

// ── Config ────────────────────────────────────────────────────────────────────
const GROUPS: { label: string; emoji: string }[] = [
  { label: 'All', emoji: '⚡' },
  { label: 'Chest', emoji: '🫁' },
  { label: 'Back', emoji: '🦴' },
  { label: 'Shoulders', emoji: '🔱' },
  { label: 'Arms', emoji: '💪' },
  { label: 'Legs', emoji: '🦵' },
  { label: 'Core', emoji: '🎯' },
  { label: 'Cardio', emoji: '🏃' },
];

const DIFF: Record<Difficulty, { label: string; color: string; bg: string; dot: string }> = {
  Beginner: { label: 'Beginner', color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
  Intermediate: { label: 'Intermediate', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  Advanced: { label: 'Advanced', color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
};

const GROUP_GRAD: Record<string, readonly [string, string]> = {
  Chest: ['#0891B2', '#0E7490'],
  Back: ['#06B6D4', '#0891B2'],
  Shoulders: ['#F59E0B', '#D97706'],
  Arms: ['#8B5CF6', '#0891B2'],
  Legs: ['#10B981', '#059669'],
  Core: ['#EF4444', '#DC2626'],
  Cardio: ['#EC4899', '#BE185D'],
};

const GROUP_LIGHT: Record<string, string> = {
  Chest: '#E0F7FA',
  Back: '#ECFEFF',
  Shoulders: '#FEF3C7',
  Arms: '#F3E8FF',
  Legs: '#ECFDF5',
  Core: '#FEF2F2',
  Cardio: '#FCE7F3',
};

// ── Exercise Detail Modal ─────────────────────────────────────────────────────
const ExerciseDetail: React.FC<{ ex: Exercise; onClose: () => void }> = ({ ex, onClose }) => {
  const insets = useSafeAreaInsets();
  const grad = GROUP_GRAD[ex.group] ?? ['#0891B2', '#0E7490'];
  const diff = DIFF[ex.difficulty];
  const [gifLoaded, setGifLoaded] = useState(false);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <StatusBar barStyle="dark-content" />

        {/* ── Header ── */}
        <View style={[d.header, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity onPress={onClose} style={d.closeBtn} activeOpacity={0.8}>
            <Text style={d.closeX}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={d.headerName} numberOfLines={1}>
              {ex.name}
            </Text>
            <Text style={d.headerMuscle}>
              {ex.group} · {ex.muscle}
            </Text>
          </View>
          <View style={[d.diffPill, { backgroundColor: diff.bg }]}>
            <View style={[d.diffDot, { backgroundColor: diff.dot }]} />
            <Text style={[d.diffTxt, { color: diff.color }]}>{diff.label}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {/* ── Video Demo ── */}
          <View style={d.gifWrap}>
            <LinearGradient
              colors={[grad[0] + '18', grad[1] + '08']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={d.gifBg}
            />
            <View style={d.gifFrame}>
              {!gifLoaded && (
                <View style={d.gifPlaceholder}>
                  <LinearGradient
                    colors={grad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={d.gifPlaceholderGrad}
                  >
                    <Text style={{ fontSize: 48 }}>
                      {GROUPS.find((g) => g.label === ex.group)?.emoji ?? '💪'}
                    </Text>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: '700',
                        marginTop: 8,
                        opacity: 0.8,
                      }}
                    >
                      Loading...
                    </Text>
                  </LinearGradient>
                </View>
              )}
              <Image
                source={{ uri: ex.gifUrl }}
                style={[d.gif, !gifLoaded && { opacity: 0, height: 0 }]}
                resizeMode="contain"
                onLoad={() => setGifLoaded(true)}
              />
            </View>
            <View style={d.gifBadge}>
              <Text style={d.gifBadgeTxt}>▶ Live Demo</Text>
            </View>
          </View>

          {/* ── Stats pills ── */}
          <View style={d.statsRow}>
            {[
              { icon: '🔁', label: 'Sets', value: ex.sets },
              { icon: '⚡', label: 'Reps', value: ex.reps },
              { icon: '⏱', label: 'Rest', value: ex.rest },
              { icon: '🔥', label: 'Cal/set', value: ex.calories },
            ].map((item) => (
              <View key={item.label} style={d.statCard}>
                <Text style={d.statIcon}>{item.icon}</Text>
                <Text style={d.statVal}>{item.value}</Text>
                <Text style={d.statLbl}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Muscles ── */}
          <View style={d.section}>
            <Text style={d.sectionTitle}>Muscles Worked</Text>
            <View style={d.muscleRow}>
              <View
                style={[d.musclePrimary, { backgroundColor: GROUP_LIGHT[ex.group] ?? '#E0F7FA' }]}
              >
                <View style={[d.muscleDot, { backgroundColor: grad[0] }]} />
                <Text style={[d.muscleTxt, { color: grad[0] }]}>{ex.muscle}</Text>
                <Text style={[d.muscleRole, { color: grad[0] + 'CC' }]}>Primary</Text>
              </View>
              {ex.muscles.map((m) => (
                <View key={m} style={d.muscleSecondary}>
                  <View style={d.muscleDotGray} />
                  <Text style={d.muscleTxtGray}>{m}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Form tips ── */}
          <View style={d.section}>
            <Text style={d.sectionTitle}>Form Cues</Text>
            {ex.tips.map((tip, i) => (
              <View
                key={i}
                style={[
                  d.tipRow,
                  i < ex.tips.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                  },
                ]}
              >
                <LinearGradient
                  colors={grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={d.tipNum}
                >
                  <Text style={d.tipNumTxt}>{i + 1}</Text>
                </LinearGradient>
                <Text style={d.tipTxt}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* ── Equipment ── */}
          <View style={[d.section, { marginBottom: 0 }]}>
            <View style={d.equipCard}>
              <LinearGradient
                colors={grad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={d.equipIcon}
              >
                <Text style={{ fontSize: 20 }}>🏋️</Text>
              </LinearGradient>
              <View>
                <Text style={d.equipLabel}>Equipment Required</Text>
                <Text style={d.equipVal}>{ex.equipment}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ── Exercise Card ─────────────────────────────────────────────────────────────
const ExerciseCard: React.FC<{ ex: Exercise; onPress: () => void }> = ({ ex, onPress }) => {
  const grad = GROUP_GRAD[ex.group] ?? ['#0891B2', '#0E7490'];
  const diff = DIFF[ex.difficulty];
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <Animated.View style={[c.card, { transform: [{ scale }] }]}>
        {/* Thumbnail */}
        <View style={c.thumb}>
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={{ fontSize: 26 }}>
            {GROUPS.find((g) => g.label === ex.group)?.emoji ?? '💪'}
          </Text>
          {/* Play badge */}
          <View style={c.playBadge}>
            <Text style={{ fontSize: 8, color: '#fff' }}>▶</Text>
          </View>
        </View>

        {/* Info */}
        <View style={c.info}>
          <View style={c.nameRow}>
            <Text style={c.name} numberOfLines={1}>
              {ex.name}
            </Text>
            <View style={[c.diffBadge, { backgroundColor: diff.bg }]}>
              <View style={[c.diffDot, { backgroundColor: diff.dot }]} />
            </View>
          </View>
          <Text style={c.muscle} numberOfLines={1}>
            {ex.muscle}
          </Text>
          <View style={c.metaRow}>
            <View style={c.metaChip}>
              <Text style={c.metaChipTxt}>
                {ex.sets}×{ex.reps}
              </Text>
            </View>
            <View style={[c.metaChip, { backgroundColor: COLORS.bgInput }]}>
              <Text style={[c.metaChipTxt, { color: COLORS.textMuted }]}>{ex.equipment}</Text>
            </View>
          </View>
        </View>

        <Text style={c.arrow}>›</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const ExerciseLibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [group, setGroup] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Exercise | null>(null);

  const filtered = useMemo(
    () =>
      EXERCISES.filter((ex) => {
        const matchGroup = group === 'All' || ex.group === group;
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          ex.name.toLowerCase().includes(q) ||
          ex.muscle.toLowerCase().includes(q) ||
          ex.equipment.toLowerCase().includes(q);
        return matchGroup && matchSearch;
      }),
    [group, search]
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Exercise Library</Text>
          <Text style={s.headerSub}>{EXERCISES.length} exercises · 7 muscle groups</Text>
        </View>
        {/* Count badge */}
        <View style={s.countBadge}>
          <Text style={s.countTxt}>{filtered.length}</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <View style={s.searchRow}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search exercise, muscle, equipment..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
              <Text style={s.clearTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Group filter — FIXED width chips so they never resize ── */}
      <View style={s.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterContent}
          bounces={false}
        >
          {GROUPS.map((g) => {
            const isActive = group === g.label;
            const grad = GROUP_GRAD[g.label];
            return (
              <TouchableOpacity
                key={g.label}
                onPress={() => setGroup(g.label)}
                activeOpacity={0.85}
                style={s.chipWrap}
              >
                {isActive && grad ? (
                  <LinearGradient
                    colors={grad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.chipActive}
                  >
                    <Text style={s.chipEmoji}>{g.emoji}</Text>
                    <Text style={s.chipTxtActive}>{g.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={s.chipIdle}>
                    <Text style={s.chipEmoji}>{g.emoji}</Text>
                    <Text style={s.chipTxtIdle}>{g.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExerciseCard ex={item} onPress={() => setSelected(item)} />}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={s.emptyTitle}>No exercises found</Text>
            <Text style={s.emptySub}>Try a different search or muscle group</Text>
          </View>
        }
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={5}
      />

      {/* ── Detail modal ── */}
      {selected && <ExerciseDetail ex={selected} onClose={() => setSelected(null)} />}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

// Screen
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: COLORS.text, lineHeight: 26 },
  headerTitle: { fontSize: 19, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  countBadge: {
    backgroundColor: '#E0F7FA',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  countTxt: { fontSize: 13, fontWeight: '800', color: '#0891B2' },

  searchWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, height: 44 },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E4E7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearTxt: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },

  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },

  // Fixed-size chip wrapper — this prevents resize on active/inactive toggle
  chipWrap: { height: 36 },
  chipActive: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipIdle: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipEmoji: { fontSize: 13 },
  chipTxtActive: { fontSize: 12, fontWeight: '800', color: '#fff' },
  chipTxtIdle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

  empty: { paddingTop: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  emptySub: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
});

// Card
const c = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3, flexShrink: 1 },
  diffBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  muscle: { fontSize: 12, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#E0F7FA',
  },
  metaChipTxt: { fontSize: 10, fontWeight: '700', color: '#0891B2' },
  arrow: { fontSize: 20, color: COLORS.border, fontWeight: '300' },
});

// Detail modal
const d = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
  headerName: { fontSize: 17, fontWeight: '900', color: COLORS.text, letterSpacing: -0.4 },
  headerMuscle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  diffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  diffDot: { width: 7, height: 7, borderRadius: 3.5 },
  diffTxt: { fontSize: 11, fontWeight: '800' },

  // GIF
  gifWrap: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gifBg: { ...StyleSheet.absoluteFillObject },
  gifFrame: { height: 220, alignItems: 'center', justifyContent: 'center' },
  gifPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifPlaceholderGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gif: { width: '100%', height: 220 },
  gifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gifBadgeTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statVal: { fontSize: 14, fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  statLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  section: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  // Muscles
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  musclePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  muscleDot: { width: 8, height: 8, borderRadius: 4 },
  muscleTxt: { fontSize: 12, fontWeight: '800' },
  muscleRole: { fontSize: 9, fontWeight: '700', marginLeft: 2 },
  muscleSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  muscleDotGray: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.textMuted },
  muscleTxtGray: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  tipNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipNumTxt: { fontSize: 11, fontWeight: '900', color: '#fff' },
  tipTxt: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 21 },

  // Equipment
  equipCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  equipIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  equipVal: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 2 },
});

export default ExerciseLibraryScreen;
