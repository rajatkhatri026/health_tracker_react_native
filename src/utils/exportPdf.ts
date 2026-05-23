import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { GoalPlan } from '../api/nutrition';

export interface PdfUser {
  name: string;
  email?: string;
}

const COLOR = {
  purple: '#7C3AED',
  cyan: '#06B6D4',
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
    <div style="flex:1;background:${color}12;border:1px solid ${color}30;border-radius:12px;padding:12px 8px;text-align:center;min-width:70px">
      <div style="font-size:20px;font-weight:900;color:${color}">${value}</div>
      <div style="font-size:10px;color:${COLOR.muted};margin-top:1px">${unit}</div>
      <div style="font-size:10px;font-weight:700;color:${COLOR.sub};margin-top:2px">${label}</div>
    </div>`;
}

function generateHtml(plan: GoalPlan, user: PdfUser, exportedAt: string): string {
  const planColor = PLAN_COLORS[plan.id] ?? COLOR.purple;

  const weekDays = plan.weekPlan
    .map(
      (day, i) => `
    <div style="margin-bottom:20px;page-break-inside:avoid">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:13px;font-weight:800;color:${planColor}">${day.day}</div>
        <div style="font-size:11px;color:${COLOR.muted};background:${planColor}10;border-radius:20px;padding:2px 10px;border:1px solid ${planColor}25">
          ~${day.meals.reduce((s, m) => s + m.kcal, 0)} kcal
        </div>
      </div>
      ${day.meals
        .map(
          (meal) => `
        <div style="margin-bottom:10px;background:#fff;border-radius:10px;border:1px solid ${COLOR.border};padding:10px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:12px;font-weight:700;color:${COLOR.text}">${meal.meal}</div>
            <div style="font-size:11px;font-weight:700;color:${planColor}">${meal.kcal} kcal</div>
          </div>
          ${meal.foods
            .map(
              (f) => `
            <div style="display:flex;align-items:flex-start;gap:6px;margin-top:3px">
              <div style="width:5px;height:5px;border-radius:50%;background:${COLOR.muted};margin-top:5px;flex-shrink:0"></div>
              <div style="font-size:11px;color:${COLOR.sub};line-height:1.5">${f}</div>
            </div>`
            )
            .join('')}
        </div>`
        )
        .join('')}
    </div>`
    )
    .join('');

  const sources = plan.sources
    .map(
      (s) => `
    <div style="display:flex;align-items:flex-start;gap:8px;margin-top:4px">
      <div style="width:6px;height:6px;border-radius:50%;background:${planColor};margin-top:5px;flex-shrink:0"></div>
      <div style="font-size:11px;color:#5B21B6;line-height:1.6">${s}</div>
    </div>`
    )
    .join('');

  const rules = plan.rules
    .map(
      (r, i) => `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
      <div style="width:22px;height:22px;border-radius:7px;background:${planColor}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:800;color:${planColor}">${i + 1}</div>
      <div style="font-size:12px;color:${COLOR.sub};line-height:1.6;padding-top:2px">${r}</div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: ${COLOR.bg}; color: ${COLOR.text}; }
  @page { margin: 20mm 16mm; }
  .page { max-width: 720px; margin: 0 auto; padding: 0 4px; }
  .section { background: #fff; border-radius: 14px; border: 1px solid ${COLOR.border}; padding: 20px; margin-bottom: 18px; }
  .section-title { font-size: 14px; font-weight: 800; color: ${COLOR.text}; margin-bottom: 14px; letter-spacing: -.2px; }
</style>
</head>
<body>
<div class="page">

  <!-- WATERMARK HEADER -->
  <div style="background:linear-gradient(135deg,${planColor},${COLOR.cyan});border-radius:16px;padding:24px 28px;margin-bottom:18px;color:#fff">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;opacity:.75;margin-bottom:4px">NEXARA PRO · MEAL PLAN</div>
        <div style="font-size:26px;font-weight:900;letter-spacing:-.5px">${plan.badge}  ${plan.title}</div>
        <div style="font-size:13px;opacity:.85;margin-top:3px">${plan.subtitle}</div>
      </div>
      <div style="text-align:right;font-size:10px;opacity:.8;line-height:1.7">
        <div style="font-size:14px;font-weight:800;opacity:1">nexara.health</div>
        <div>Generated for: <strong>${user.name}</strong></div>
        ${user.email ? `<div>${user.email}</div>` : ''}
        <div>Date: ${exportedAt}</div>
        <div style="margin-top:4px;background:rgba(255,255,255,.2);border-radius:8px;padding:2px 8px">Pro Subscriber</div>
      </div>
    </div>
  </div>

  <!-- MACRO TARGETS -->
  <div class="section">
    <div class="section-title">Daily Macro Targets</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${macroChip('Calories', plan.calories, 'kcal', COLOR.amber)}
      ${macroChip('Protein', plan.macros.protein, 'g', COLOR.blue)}
      ${macroChip('Carbs', plan.macros.carbs, 'g', COLOR.green)}
      ${macroChip('Fat', plan.macros.fat, 'g', '#EC4899')}
      ${macroChip('Fiber', plan.macros.fiber, 'g', COLOR.purple)}
    </div>
  </div>

  <!-- SCIENCE / RATIONALE -->
  <div class="section">
    <div class="section-title">Why This Works</div>
    <p style="font-size:12px;color:${COLOR.sub};line-height:1.7;margin-bottom:14px">${plan.rationale}</p>
    <div style="background:#F5F3FF;border-radius:10px;padding:14px;border:1px solid #DDD6FE">
      <div style="font-size:11px;font-weight:800;color:#5B21B6;margin-bottom:8px;letter-spacing:.3px">PEER-REVIEWED SOURCES</div>
      ${sources}
    </div>
  </div>

  <!-- KEY RULES -->
  <div class="section">
    <div class="section-title">Key Rules to Follow</div>
    ${rules}
  </div>

  <!-- 7-DAY PLAN -->
  <div class="section" style="page-break-before:always">
    <div class="section-title">7-Day Meal Schedule</div>
    ${weekDays}
  </div>

  <!-- DISCLAIMER -->
  <div style="background:#FFF7ED;border-radius:14px;border:1px solid #FED7AA;padding:16px;margin-bottom:18px">
    <div style="display:flex;gap:10px;align-items:flex-start">
      <div style="font-size:20px">⚕️</div>
      <div style="font-size:11px;color:#92400E;line-height:1.7">${plan.disclaimer}</div>
    </div>
  </div>

  <!-- FOOTER WATERMARK -->
  <div style="text-align:center;padding:16px 0;border-top:1px solid ${COLOR.border}">
    <div style="font-size:12px;font-weight:700;color:${planColor}">nexara.health</div>
    <div style="font-size:10px;color:${COLOR.muted};margin-top:3px">
      This document was generated for <strong>${user.name}</strong>${user.email ? ` (${user.email})` : ''} on ${exportedAt}.<br/>
      Unauthorized redistribution is prohibited. © Nexara ${new Date().getFullYear()}
    </div>
    <div style="margin-top:8px">${badge(planColor, 'Nexara Pro')} ${badge(COLOR.green, 'Evidence-Based')} ${badge(COLOR.blue, 'ISSN · ACSM')}</div>
  </div>

</div>
</body>
</html>`;
}

export async function exportPlanAsPdf(plan: GoalPlan, user: PdfUser): Promise<void> {
  const exportedAt = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = generateHtml(plan, user, exportedAt);

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${plan.title} — Nexara Pro`,
      UTI: 'com.adobe.pdf',
    });
  }
}
