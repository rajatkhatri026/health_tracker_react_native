import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { GoalPlan } from '../api/nutrition';
import type { MealProfile } from './calorieCalc';
import { calcTDEE } from './calorieCalc';

export interface PdfUser {
  name: string;
  email?: string;
  mealProfile?: MealProfile;
}

const THEME = '#0891B2'; // app-wide primary

const COLOR = {
  purple: '#7C3AED',
  cyan: THEME,
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  text: '#0F172A',
  sub: '#475569',
  muted: '#94A3B8',
  border: '#E2E8F0',
  bg: '#F8FAFC',
};

const PLAN_COLORS: Record<string, string> = {
  muscle_gain: COLOR.blue,
  fat_loss: COLOR.red,
  lean_body: COLOR.purple,
};

function badge(color: string, text: string) {
  return `<span style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;letter-spacing:.4px">${text}</span>`;
}

function macroChip(label: string, value: number, unit: string, color: string) {
  return `
    <div style="flex:1;background:${color}12;border:1px solid ${color}30;border-radius:10px;padding:12px 8px;text-align:center;min-width:64px">
      <div style="font-size:19px;font-weight:900;color:${color};line-height:1">${value}</div>
      <div style="font-size:11px;color:${COLOR.muted};margin-top:2px">${unit}</div>
      <div style="font-size:11px;font-weight:700;color:${COLOR.sub};margin-top:3px">${label}</div>
    </div>`;
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Lightly Active (1–3 days/week)',
  moderate: 'Moderately Active (3–5 days/week)',
  active: 'Very Active (6–7 days/week)',
};
const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  recomp: 'Body Recomposition',
};

function profileStatsSection(user: PdfUser, planColor: string, plan: GoalPlan): string {
  const p = user.mealProfile;
  if (!p) return '';
  const tdee = calcTDEE(p.weightKg, p.heightCm, p.ageYears, p.gender, p.activity);
  const bmi = (p.weightKg / (p.heightCm / 100) ** 2).toFixed(1);
  const stats = [
    { label: 'Weight', value: `${p.weightKg} kg` },
    { label: 'Height', value: `${p.heightCm} cm` },
    { label: 'Age', value: `${p.ageYears} yrs` },
    { label: 'Gender', value: p.gender.charAt(0).toUpperCase() + p.gender.slice(1) },
    { label: 'BMI', value: bmi },
    { label: 'TDEE', value: `${tdee} kcal` },
    { label: 'Target', value: `${plan.calories} kcal` },
    { label: 'Goal', value: GOAL_LABELS[p.goal] ?? p.goal },
  ];
  return `
  <div class="section">
    <div class="section-title">Personal Profile</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
      ${stats
        .map(
          (s) => `
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 6px;text-align:center">
          <div style="font-size:14px;font-weight:900;color:${planColor};line-height:1.3">${s.value}</div>
          <div style="font-size:11px;color:#64748B;margin-top:3px;font-weight:600">${s.label}</div>
        </div>`
        )
        .join('')}
    </div>
    <div style="background:${THEME}12;border:1px solid ${THEME}40;border-radius:8px;padding:10px 12px">
      <span style="font-size:11px;font-weight:700;color:${THEME}">Activity: </span>
      <span style="font-size:11px;color:#0F172A;font-weight:500">${ACTIVITY_LABELS[p.activity] ?? p.activity}</span>
    </div>
  </div>`;
}

// Inline SVG of the Nexara logo mark (hexagonal shield + N-pulse)
const NEXARA_LOGO_SVG = (size: number, color = THEME) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.44;
  const u = s / 48;
  // Hex shield path
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const hex =
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') +
    ' Z';
  // N-pulse path
  const left = cx - s * 0.14;
  const right = cx + s * 0.14;
  const top = cy - s * 0.155;
  const bot = cy + s * 0.155;
  const midX = cx;
  const spkUp = cy - s * 0.22;
  const spkDn = cy + s * 0.12;
  const nPath = `M ${left} ${bot} L ${left} ${top} L ${(midX - u * 3).toFixed(2)} ${spkDn} L ${midX} ${spkUp} L ${(midX + u * 3).toFixed(2)} ${spkDn} L ${right} ${top} L ${right} ${bot}`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="psh" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#075985"/>
        <stop offset="100%" stop-color="${THEME}"/>
      </linearGradient>
      <linearGradient id="pbr" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#67E8F9" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="ppls" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7DD3E8"/>
        <stop offset="50%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#A5F3FC"/>
      </linearGradient>
    </defs>
    <path d="${hex}" fill="url(#psh)"/>
    <path d="${hex}" fill="none" stroke="url(#pbr)" stroke-width="${(s * 0.025).toFixed(2)}"/>
    <path d="${nPath}" fill="none" stroke="url(#ppls)" stroke-width="${(s * 0.072).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${midX}" cy="${spkUp}" r="${(s * 0.04).toFixed(2)}" fill="#FFFFFF" fill-opacity="0.9"/>
  </svg>`;
};

function generateHtml(plan: GoalPlan, user: PdfUser, exportedAt: string): string {
  const planColor = PLAN_COLORS[plan.id] ?? COLOR.purple;
  const currentWeek = plan.currentWeek && !isNaN(plan.currentWeek) ? plan.currentWeek : 1;
  const totalWeeks = plan.totalWeeks && !isNaN(plan.totalWeeks) ? plan.totalWeeks : 4;

  // Day cards — full width, table layout, proper font sizes for print
  const dayCards = plan.weekPlan
    .map((day) => {
      const dayKcal = day.meals.reduce((s, m) => s + m.kcal, 0);
      const mealRows = day.meals
        .map(
          (meal) => `
      <tr>
        <td style="font-weight:700;color:${planColor};white-space:nowrap;width:100px;padding:8px 12px;vertical-align:top;font-size:12px">${meal.meal}</td>
        <td style="color:${COLOR.sub};padding:8px 12px;vertical-align:top;font-size:12px;line-height:1.6">${meal.foods.join(' &middot; ')}</td>
        <td style="font-weight:700;color:${COLOR.muted};white-space:nowrap;text-align:right;width:70px;padding:8px 12px;vertical-align:top;font-size:12px">${meal.kcal} kcal</td>
      </tr>`
        )
        .join('');
      return `
    <div class="day-card">
      <div style="background:${planColor}0D;border-bottom:1px solid ${planColor}22;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:800;color:${planColor}">${day.day}</span>
        <span style="font-size:11px;font-weight:700;color:${planColor};background:${planColor}12;border:1px solid ${planColor}25;border-radius:20px;padding:3px 12px">${dayKcal} kcal</span>
      </div>
      <table style="width:100%;border-collapse:collapse"><tbody>${mealRows}</tbody></table>
    </div>`;
    })
    .join('');

  const sources = plan.sources
    .map(
      (s) =>
        `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px">
      <span style="color:${planColor};font-size:14px;line-height:1;margin-top:1px">›</span>
      <span style="font-size:12px;color:${COLOR.sub};line-height:1.5">${s}</span>
    </div>`
    )
    .join('');

  const rules = plan.rules
    .map(
      (r, i) => `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
      <div style="min-width:22px;height:22px;border-radius:6px;background:${planColor}18;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${planColor};flex-shrink:0">${i + 1}</div>
      <div style="font-size:12px;color:${COLOR.sub};line-height:1.6;padding-top:2px">${r}</div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; background:${COLOR.bg}; color:${COLOR.text}; font-size:13px; padding:14mm 12mm; }
  @page { margin:0; size:A4; }
  .section { background:#fff; border-radius:10px; border:1px solid ${COLOR.border}; padding:16px 18px; margin-bottom:14px; page-break-inside:avoid; break-inside:avoid; }
  .section-title { font-size:14px; font-weight:800; color:${COLOR.text}; margin-bottom:12px; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; page-break-inside:avoid; break-inside:avoid; }
  .day-card { background:#fff; border:1px solid ${COLOR.border}; border-radius:10px; margin-bottom:12px; page-break-inside:avoid; break-inside:avoid; }
  .day-card table { width:100%; border-collapse:collapse; }
  .day-card tr + tr { border-top:1px solid ${COLOR.border}; }
</style>
</head>
<body>

  <!-- HEADER BANNER -->
  <div style="background:linear-gradient(135deg,${planColor} 0%,${COLOR.cyan} 100%);border-radius:12px;padding:20px 24px;margin-bottom:14px;color:#fff;page-break-inside:avoid">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:14px">
        ${NEXARA_LOGO_SVG(44)}
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;opacity:.75;margin-bottom:3px">NEXARA · MEAL PLAN · WEEK ${currentWeek} OF ${totalWeeks}</div>
          <div style="font-size:24px;font-weight:900;letter-spacing:-.5px;line-height:1.15">${plan.badge} ${plan.title}</div>
          <div style="font-size:13px;opacity:.85;margin-top:3px">${plan.subtitle}</div>
        </div>
      </div>
      <div style="text-align:right;font-size:12px;opacity:.9;line-height:1.9;background:rgba(0,0,0,.18);border-radius:8px;padding:10px 14px">
        <div style="font-size:14px;font-weight:700">${user.name || 'User'}</div>
        ${user.email ? `<div>${user.email}</div>` : ''}
        <div>${exportedAt}</div>
        <div style="margin-top:5px;background:rgba(255,255,255,.2);border-radius:5px;padding:2px 10px;font-size:11px;font-weight:700;letter-spacing:.5px">PRO SUBSCRIBER</div>
      </div>
    </div>
  </div>

  <!-- PROFILE + MACROS -->
  <div class="two-col">
    ${profileStatsSection(user, planColor, plan)}
    <div class="section" style="margin-bottom:0">
      <div class="section-title">Daily Macro Targets</div>
      <div style="display:flex;gap:8px">
        ${macroChip('Calories', plan.calories, 'kcal', COLOR.amber)}
        ${macroChip('Protein', plan.macros.protein, 'g', COLOR.blue)}
        ${macroChip('Carbs', plan.macros.carbs, 'g', COLOR.green)}
        ${macroChip('Fat', plan.macros.fat, 'g', '#EC4899')}
        ${macroChip('Fiber', plan.macros.fiber, 'g', COLOR.purple)}
      </div>
    </div>
  </div>

  <!-- WHY THIS WORKS -->
  <div class="section">
    <div class="section-title">Why This Works</div>
    <p style="font-size:12px;color:${COLOR.sub};line-height:1.7;margin-bottom:14px">${plan.rationale}</p>
    <div style="font-size:12px;font-weight:700;color:${planColor};margin-bottom:8px">Sources</div>
    ${sources}
  </div>

  <!-- KEY RULES -->
  <div class="section">
    <div class="section-title">Key Rules to Follow</div>
    ${rules}
  </div>

  <!-- 7-DAY MEAL SCHEDULE -->
  <div style="page-break-before:always"></div>
  <div style="font-size:16px;font-weight:800;color:${COLOR.text};margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid ${planColor}">7-Day Meal Schedule</div>
  ${dayCards}

  <!-- DISCLAIMER -->
  <div style="display:flex;gap:12px;align-items:flex-start;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:12px 16px;margin-bottom:12px;page-break-inside:avoid">
    <span style="font-size:18px;line-height:1.2">⚕️</span>
    <span style="font-size:12px;color:#92400E;line-height:1.7">${plan.disclaimer}</span>
  </div>

  <!-- FOOTER -->
  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:1px solid ${COLOR.border};page-break-inside:avoid">
    <div style="display:flex;align-items:center;gap:8px">
      ${NEXARA_LOGO_SVG(24)}
      <span style="font-size:14px;font-weight:800;color:${planColor}">Nexara</span>
    </div>
    <div style="font-size:11px;color:${COLOR.muted};text-align:center">
      Generated for <strong>${user.name || 'User'}</strong>${user.email ? ` · ${user.email}` : ''} · ${exportedAt}
    </div>
    <div style="display:flex;gap:5px">
      ${badge(planColor, 'Nexara Pro')} ${badge(COLOR.green, 'Evidence-Based')}
    </div>
  </div>

</body>
</html>`;
}

export async function exportPlanAsPdf(plan: GoalPlan, user: PdfUser): Promise<void> {
  const now = new Date();
  const exportedAt = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = generateHtml(plan, user, exportedAt);

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Rename to a descriptive filename: "Nexara_FatLoss_Plan_John_2026-05-31.pdf"
  const safeName = (user.name || 'User').replace(/[^a-zA-Z0-9]/g, '_');
  const safeTitle = plan.title.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = now.toISOString().slice(0, 10);
  const weekNum = plan.currentWeek && !isNaN(plan.currentWeek) ? plan.currentWeek : 1;
  const filename = `Nexara_${safeTitle}_Week${weekNum}_${safeName}_${dateStr}.pdf`;
  const dest = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(dest, {
      mimeType: 'application/pdf',
      dialogTitle: `${plan.title} Meal Plan — Nexara`,
      UTI: 'com.adobe.pdf',
    });
  }
}
