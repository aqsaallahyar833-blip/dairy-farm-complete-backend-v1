export interface ReportKpi {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

export interface ReportMeta {
  title: string;
  description: string;
  badge: string;
}

export type PresetKey = 'today' | '7days' | '30days' | 'month' | 'year' | 'custom';

// 1. Daily Report Data Helper
export const getDailyReportActivities = (date: string = '2024-05-14', preset: PresetKey = 'today') => {
  if (preset === 'year') {
    return [
      {
        time: 'Month 12 Close',
        date: '2024-12-31',
        module: 'Herd Operations',
        description: 'Year-End Farm Operational & Herd Inventory Reconciled (106 Cattle)',
        metrics: '46,000.0 L Milk • Fat 3.80%',
        staff: 'Farm Lead Bashir',
        financialImpact: '+Rs 7,590,000',
        status: 'Audited',
      },
      {
        time: 'Month 11 Close',
        date: '2024-11-30',
        module: 'Herd Operations',
        description: 'Winter ration transition completed, 82 in-milk cows',
        metrics: '44,750.0 L Milk • Fat 3.81%',
        staff: 'Feed Unit Kareem',
        financialImpact: '+Rs 7,383,750',
        status: 'Audited',
      },
      {
        time: 'Month 10 Close',
        date: '2024-10-31',
        module: 'Herd Operations',
        description: 'Autumn breeding cycle - 28 cows confirmed pregnant (PD+)',
        metrics: '46,250.0 L Milk • Fat 3.79%',
        staff: 'Dr. Imran Qureshi',
        financialImpact: '+Rs 7,631,250',
        status: 'Audited',
      },
      {
        time: 'Month 09 Close',
        date: '2024-09-30',
        module: 'Herd Operations',
        description: 'Corn silage bunker harvest intake (120 tons stockpiled)',
        metrics: '44,800.0 L Milk • Fat 3.78%',
        staff: 'Logistics Kareem',
        financialImpact: '+Rs 7,392,000',
        status: 'Audited',
      },
      {
        time: 'Month 08 Close',
        date: '2024-08-31',
        module: 'Herd Operations',
        description: 'Summer heat abatement active, misting fans 100% operational',
        metrics: '46,100.0 L Milk • Fat 3.79%',
        staff: 'Farm Lead Bashir',
        financialImpact: '+Rs 7,606,500',
        status: 'Audited',
      },
      {
        time: 'Month 07 Close',
        date: '2024-07-31',
        module: 'Herd Operations',
        description: 'Annual FMD booster vaccination completed across 106 cattle',
        metrics: '45,800.0 L Milk • Fat 3.78%',
        staff: 'Dr. Imran Qureshi',
        financialImpact: '+Rs 7,557,000',
        status: 'Audited',
      },
      {
        time: 'Month 06 Close',
        date: '2024-06-30',
        module: 'Herd Operations',
        description: 'Calving wave concluded, 8 healthy heifer calves registered',
        metrics: '44,550.0 L Milk • Fat 3.79%',
        staff: 'Asim Raza (Calf Unit)',
        financialImpact: '+Rs 7,350,750',
        status: 'Audited',
      },
      {
        time: 'Month 05 Close',
        date: '2024-05-31',
        module: 'Herd Operations',
        description: 'Mid-year financial ledger balanced, parlor servicing completed',
        metrics: '46,035.0 L Milk • Fat 3.80%',
        staff: 'Farm Lead Bashir',
        financialImpact: '+Rs 7,595,775',
        status: 'Audited',
      },
    ];
  }

  if (preset === 'today') {
    return [
      {
        time: '05:00 AM',
        date: '2024-05-14',
        module: 'Milk Production',
        description: 'Morning Herd Milking Session - 82 Milkers in rotary parlor',
        metrics: '780.0 L (Fat 3.82%, SNF 8.80%)',
        staff: 'Bashir Ahmed (Milking Lead)',
        financialImpact: '+Rs 128,700',
        status: 'Completed',
      },
      {
        time: '06:30 AM',
        date: '2024-05-14',
        module: 'Feed & Nutrition',
        description: 'High-Yielding Lactation TMR Silage Distribution (Pen A & B)',
        metrics: '1,120 kg Total Mixed Ration',
        staff: 'Kareem Ullah (Feed Unit)',
        financialImpact: '-Rs 14,560',
        status: 'Delivered',
      },
      {
        time: '08:15 AM',
        date: '2024-05-14',
        module: 'Breeding & AI',
        description: 'Standing Heat Artificial Insemination (HF-027, Straw: AltaSpring)',
        metrics: 'Semen Straw SEM-HF-9901',
        staff: 'Dr. Imran Qureshi (Veterinarian)',
        financialImpact: '-Rs 4,500',
        status: 'Logged',
      },
      {
        time: '09:45 AM',
        date: '2024-05-14',
        module: 'Herd Health',
        description: 'Clinical Mastitis Intramammary Therapy (HF-033, Left Rear Quarter)',
        metrics: 'Cefquinome 75mg + NSAID Inj.',
        staff: 'Dr. Imran Qureshi (Veterinarian)',
        financialImpact: '-Rs 1,850',
        status: 'Withdrawal Hold (3d)',
      },
      {
        time: '11:30 AM',
        date: '2024-05-14',
        module: 'Calf & Neonatal',
        description: 'Calf Milk Replacer & Colostrum Feeding Check (8 Heifer Calves)',
        metrics: '32.0 L Whole Milk + Calf Starter',
        staff: 'Asim Raza (Calf Specialist)',
        financialImpact: '-Rs 5,280',
        status: 'Healthy',
      },
      {
        time: '02:00 PM',
        date: '2024-05-14',
        module: 'Feed & Nutrition',
        description: 'Dry Cow & Transition Group Silage & Hay Rations (Pen D)',
        metrics: '980 kg Dry Cow Ration B',
        staff: 'Kareem Ullah (Feed Unit)',
        financialImpact: '-Rs 12,740',
        status: 'Delivered',
      },
      {
        time: '05:00 PM',
        date: '2024-05-14',
        module: 'Milk Production',
        description: 'Evening Herd Milking Session - 82 Milkers in rotary parlor',
        metrics: '705.0 L (Fat 3.75%, SNF 8.82%)',
        staff: 'Ali Hassan (Milking Crew)',
        financialImpact: '+Rs 116,325',
        status: 'Completed',
      },
      {
        time: '07:30 PM',
        date: '2024-05-14',
        module: 'Logistics & Dispatch',
        description: 'Bulk Raw Milk Chilled Tanker Collection & Delivery to Processor',
        metrics: '1,485.0 L @ 3.5°C Chilled Milk',
        staff: 'Engro Foods Milk Tanker #72',
        financialImpact: '+Rs 245,025 (Gross)',
        status: 'Dispatched',
      },
    ];
  }

  if (preset === '7days') {
    return [
      {
        time: 'Daily Summary',
        date: '2024-05-14 (Today)',
        module: 'Herd Operations',
        description: '82 Milkers milked, 1 AI service (HF-027), 2,100 kg feed fed, Tanker pickup',
        metrics: '1,485.0 L Milk • Fat 3.80% • SNF 8.80%',
        staff: 'Farm Lead Bashir',
        financialImpact: '+Rs 245,025',
        status: 'Completed',
      },
      {
        time: 'Daily Summary',
        date: '2024-05-13',
        module: 'Herd Operations',
        description: '82 Milkers, Routine hoof trimming (4 cows), Silage bunker compaction',
        metrics: '1,492.0 L Milk • Fat 3.79% • SNF 8.81%',
        staff: 'Farm Lead Bashir',
        financialImpact: '+Rs 246,180',
        status: 'Completed',
      },
      {
        time: 'Daily Summary',
        date: '2024-05-12',
        module: 'Herd Operations',
        description: '82 Milkers, Veterinary pregnancy diagnosis check (3 positive)',
        metrics: '1,478.0 L Milk • Fat 3.78% • SNF 8.82%',
        staff: 'Dr. Imran Qureshi',
        financialImpact: '+Rs 243,870',
        status: 'Completed',
      },
      {
        time: 'Daily Summary',
        date: '2024-05-11',
        module: 'Herd Operations',
        description: '82 Milkers, FMD booster vaccination booster run (Pen C)',
        metrics: '1,488.0 L Milk • Fat 3.81% • SNF 8.80%',
        staff: 'Vet Technician Asim',
        financialImpact: '+Rs 245,520',
        status: 'Completed',
      },
      {
        time: 'Daily Summary',
        date: '2024-05-10',
        module: 'Herd Operations',
        description: '82 Milkers, Delivered 10 tons corn silage from supplier depot',
        metrics: '1,495.0 L Milk • Fat 3.77% • SNF 8.83%',
        staff: 'Logistics Team',
        financialImpact: '+Rs 246,675',
        status: 'Completed',
      },
      {
        time: 'Daily Summary',
        date: '2024-05-09',
        module: 'Herd Operations',
        description: '82 Milkers, Parlor vacuum pressure servicing and liner swaps',
        metrics: '1,480.0 L Milk • Fat 3.79% • SNF 8.81%',
        staff: 'Dairy Tech Services',
        financialImpact: '+Rs 244,200',
        status: 'Completed',
      },
      {
        time: 'Daily Summary',
        date: '2024-05-08',
        module: 'Herd Operations',
        description: '82 Milkers, 2 standing heats served via Alta Genetics semen',
        metrics: '1,489.0 L Milk • Fat 3.80% • SNF 8.82%',
        staff: 'Dr. Imran Qureshi',
        financialImpact: '+Rs 245,685',
        status: 'Completed',
      },
    ];
  }

  // month or 30days
  return [
    {
      time: 'Day 14 Log',
      date: '2024-05-14',
      module: 'Herd Operations',
      description: 'Daily collection 1,485 L, 82 cows, Fat 3.80%, full tanker billing',
      metrics: '1,485.0 L Milk',
      staff: 'Shift Lead Bashir',
      financialImpact: '+Rs 245,025',
      status: 'Completed',
    },
    {
      time: 'Day 13 Log',
      date: '2024-05-13',
      module: 'Herd Operations',
      description: 'Daily collection 1,492 L, 82 cows, 2,100 kg silage intake',
      metrics: '1,492.0 L Milk',
      staff: 'Shift Lead Bashir',
      financialImpact: '+Rs 246,180',
      status: 'Completed',
    },
    {
      time: 'Day 12 Log',
      date: '2024-05-12',
      module: 'Herd Operations',
      description: 'Daily collection 1,478 L, 82 cows, 3 pregnant cows confirmed',
      metrics: '1,478.0 L Milk',
      staff: 'Dr. Imran Qureshi',
      financialImpact: '+Rs 243,870',
      status: 'Completed',
    },
    {
      time: 'Day 11 Log',
      date: '2024-05-11',
      module: 'Herd Operations',
      description: 'Daily collection 1,488 L, 82 cows, routine health protocols',
      metrics: '1,488.0 L Milk',
      staff: 'Shift Lead Bashir',
      financialImpact: '+Rs 245,520',
      status: 'Completed',
    },
    {
      time: 'Day 10 Log',
      date: '2024-05-10',
      module: 'Herd Operations',
      description: 'Daily collection 1,495 L, 82 cows, commercial feed delivery',
      metrics: '1,495.0 L Milk',
      staff: 'Logistics Kareem',
      financialImpact: '+Rs 246,675',
      status: 'Completed',
    },
    {
      time: 'Day 09 Log',
      date: '2024-05-09',
      module: 'Herd Operations',
      description: 'Daily collection 1,480 L, 82 cows, equipment calibration',
      metrics: '1,480.0 L Milk',
      staff: 'Shift Lead Bashir',
      financialImpact: '+Rs 244,200',
      status: 'Completed',
    },
    {
      time: 'Day 08 Log',
      date: '2024-05-08',
      module: 'Herd Operations',
      description: 'Daily collection 1,489 L, 82 cows, 2 AI services logged',
      metrics: '1,489.0 L Milk',
      staff: 'Dr. Imran Qureshi',
      financialImpact: '+Rs 245,685',
      status: 'Completed',
    },
    {
      time: 'Week 1 Cons.',
      date: '2024-05-01 to 2024-05-07',
      module: 'Consolidated Weekly',
      description: 'Week 1 total 10,383 L Milk, 100% chilling compliance, 0 antibiotic violations',
      metrics: '10,383.0 L Milk',
      staff: 'Farm Lead Bashir',
      financialImpact: '+Rs 1,713,195',
      status: 'Reconciled',
    },
  ];
};

// 2. Weekly Report Generator Helper
export const getWeeklyDayRows = (
  toDate: string = '2024-05-14',
  totalMilkLiters: number = 10407,
  preset: PresetKey = '7days'
) => {
  // If user clicked 'today', show Today's specific 24h ledger row with AM/PM sessions!
  if (preset === 'today') {
    return [
      {
        date: '2024-05-14 (Morning)',
        day: 'Tuesday AM',
        milk: 780,
        avgCow: '9.5',
        feedKg: 1050,
        healthEvents: 'Rotary Parlor Session 1',
        rev: 128700,
        exp: 70250,
        net: 58450,
      },
      {
        date: '2024-05-14 (Evening)',
        day: 'Tuesday PM',
        milk: 705,
        avgCow: '8.6',
        feedKg: 1050,
        healthEvents: 'Rotary Parlor Session 2',
        rev: 116325,
        exp: 70250,
        net: 46075,
      },
      {
        date: '2024-05-14 (Total Day)',
        day: 'Tuesday Full Day',
        milk: 1485,
        avgCow: '18.1',
        feedKg: 2100,
        healthEvents: '1 AI Service • 1 Mastitis Care',
        rev: 245025,
        exp: 140500,
        net: 104525,
      },
    ];
  }

  // If user clicked 'year', show all 12 months in weekly/periodic ledger!
  if (preset === 'year') {
    return [
      { date: 'Jan 2024', day: 'Month 01', milk: 46035, avgCow: '18.1', feedKg: 64800, healthEvents: 'Annual Inception Audit', rev: 7595775, exp: 4180000, net: 3415775 },
      { date: 'Feb 2024', day: 'Month 02', milk: 43120, avgCow: '18.0', feedKg: 60700, healthEvents: 'Routine Herd Vaccinations', rev: 7114800, exp: 3950000, net: 3164800 },
      { date: 'Mar 2024', day: 'Month 03', milk: 46200, avgCow: '18.1', feedKg: 65100, healthEvents: 'Spring Breeding Cycle', rev: 7623000, exp: 4210000, net: 3413000 },
      { date: 'Apr 2024', day: 'Month 04', milk: 44700, avgCow: '18.2', feedKg: 63000, healthEvents: 'Rotary Parlor Maintenance', rev: 7375500, exp: 4090000, net: 3285500 },
      { date: 'May 2024', day: 'Month 05', milk: 46035, avgCow: '18.1', feedKg: 64900, healthEvents: 'Mid-Year Herd Audit', rev: 7595775, exp: 4215000, net: 3380775 },
      { date: 'Jun 2024', day: 'Month 06', milk: 44550, avgCow: '18.1', feedKg: 62800, healthEvents: 'Calf Weaning Protocol', rev: 7350750, exp: 4080000, net: 3270750 },
      { date: 'Jul 2024', day: 'Month 07', milk: 45800, avgCow: '18.0', feedKg: 64500, healthEvents: 'FMD Vaccination Drive', rev: 7557000, exp: 4190000, net: 3367000 },
      { date: 'Aug 2024', day: 'Month 08', milk: 46100, avgCow: '18.1', feedKg: 65000, healthEvents: 'Heat Abatement Protocol', rev: 7606500, exp: 4220000, net: 3386500 },
      { date: 'Sep 2024', day: 'Month 09', milk: 44800, avgCow: '18.2', feedKg: 63200, healthEvents: 'Silage Bunker Infill', rev: 7392000, exp: 4100000, net: 3292000 },
      { date: 'Oct 2024', day: 'Month 10', milk: 46250, avgCow: '18.2', feedKg: 65200, healthEvents: 'Autumn Breeding Cycle', rev: 7631250, exp: 4230000, net: 3401250 },
      { date: 'Nov 2024', day: 'Month 11', milk: 44750, avgCow: '18.2', feedKg: 63100, healthEvents: 'Winter Ration Ramping', rev: 7383750, exp: 4095000, net: 3288750 },
      { date: 'Dec 2024', day: 'Month 12', milk: 46000, avgCow: '18.1', feedKg: 64800, healthEvents: 'Annual Books Closing', rev: 7590000, exp: 4200000, net: 3390000 },
    ];
  }

  // If user clicked 'month' or '30days', show 4-week consolidated ledger!
  if (preset === 'month' || preset === '30days') {
    return [
      {
        date: 'May 01 - May 07',
        day: 'Week 1',
        milk: 10524,
        avgCow: '18.3',
        feedKg: 15200,
        healthEvents: '3 AI Services • 2 Vaccinations',
        rev: 1736460,
        exp: 968300,
        net: 768160,
      },
      {
        date: 'May 08 - May 14',
        day: 'Week 2',
        milk: 10407,
        avgCow: '18.1',
        feedKg: 15089,
        healthEvents: '4 AI Services • 1 Mastitis Care',
        rev: 1717155,
        exp: 983000,
        net: 734155,
      },
      {
        date: 'May 15 - May 21',
        day: 'Week 3 (Projected)',
        milk: 11896,
        avgCow: '18.2',
        feedKg: 16100,
        healthEvents: '5 AI Services • Routine De-worming',
        rev: 1962840,
        exp: 1094600,
        net: 868240,
      },
      {
        date: 'May 22 - May 31',
        day: 'Week 4 (Projected)',
        milk: 12930,
        avgCow: '18.1',
        feedKg: 16611,
        healthEvents: '4 AI Services • Calf Transfers',
        rev: 2133545,
        exp: 1164100,
        net: 969445,
      },
    ];
  }

  // Default: Past 7 Days (May 08 to May 14)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const baseDate = new Date(toDate || '2024-05-14');
  const rows = [];
  const dailyBase = 1485;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    // realistic slight day-to-day variance
    const variation = ((d.getDate() % 5) - 2) * 7;
    const milk = Math.round(dailyBase + variation);
    const avgCow = (milk / 82).toFixed(1);
    const feedKg = Math.round(milk * 1.45);
    const rev = milk * 165;
    const exp = feedKg * 13 + 7500;
    const net = rev - exp;

    rows.push({
      date: dateStr,
      day: dayName,
      milk,
      avgCow,
      feedKg,
      healthEvents: i % 2 === 0 ? '1 AI Service' : '1 Vet Check',
      rev,
      exp,
      net,
    });
  }
  return rows;
};

// 3. Monthly Report Generator Helper
export const getMonthlyWeekRows = (
  totalMonthlyMilk: number = 45757,
  totalRev: number = 7550000,
  totalExp: number = 4210000,
  preset: PresetKey = 'month'
) => {
  // If user clicked 'today' on Monthly report, show Today's contribution to monthly targets!
  if (preset === 'today') {
    return [
      {
        period: 'Today (May 14, 2024)',
        milk: 1485,
        avgDaily: '1,485.0',
        feedExp: 28360,
        otherExp: 112140,
        totalExp: 140500,
        revenue: 245025,
        profit: 104525,
        margin: '42.6%',
      },
      {
        period: 'Month-to-Date (May 01 - May 14)',
        milk: 20790,
        avgDaily: '1,485.0',
        feedExp: 397040,
        otherExp: 1512960,
        totalExp: 1910000,
        revenue: 3430350,
        profit: 1520350,
        margin: '44.3%',
      },
      {
        period: 'Remaining Month Target (May 15 - May 31)',
        milk: 24967,
        avgDaily: '1,468.6',
        feedExp: 480000,
        otherExp: 1820000,
        totalExp: 2300000,
        revenue: 4119650,
        profit: 1819650,
        margin: '44.2%',
      },
    ];
  }

  // If user clicked 'year' on Monthly report, show 12 months progression!
  if (preset === 'year') {
    return [
      { period: 'Jan 2024', milk: 46035, avgDaily: '1,485.0', feedExp: 885000, otherExp: 3295000, totalExp: 4180000, revenue: 7595775, profit: 3415775, margin: '45.0%' },
      { period: 'Feb 2024', milk: 43120, avgDaily: '1,486.9', feedExp: 830000, otherExp: 3120000, totalExp: 3950000, revenue: 7114800, profit: 3164800, margin: '44.5%' },
      { period: 'Mar 2024', milk: 46200, avgDaily: '1,490.3', feedExp: 889000, otherExp: 3321000, totalExp: 4210000, revenue: 7623000, profit: 3413000, margin: '44.8%' },
      { period: 'Apr 2024', milk: 44700, avgDaily: '1,490.0', feedExp: 865000, otherExp: 3225000, totalExp: 4090000, revenue: 7375500, profit: 3285500, margin: '44.5%' },
      { period: 'May 2024', milk: 46035, avgDaily: '1,485.0', feedExp: 890000, otherExp: 3325000, totalExp: 4215000, revenue: 7595775, profit: 3380775, margin: '44.5%' },
      { period: 'Jun 2024', milk: 44550, avgDaily: '1,485.0', feedExp: 860000, otherExp: 3220000, totalExp: 4080000, revenue: 7350750, profit: 3270750, margin: '44.5%' },
      { period: 'Jul 2024', milk: 45800, avgDaily: '1,477.4', feedExp: 885000, otherExp: 3305000, totalExp: 4190000, revenue: 7557000, profit: 3367000, margin: '44.6%' },
      { period: 'Aug 2024', milk: 46100, avgDaily: '1,487.1', feedExp: 892000, otherExp: 3328000, totalExp: 4220000, revenue: 7606500, profit: 3386500, margin: '44.5%' },
      { period: 'Sep 2024', milk: 44800, avgDaily: '1,493.3', feedExp: 868000, otherExp: 3232000, totalExp: 4100000, revenue: 7392000, profit: 3292000, margin: '44.5%' },
      { period: 'Oct 2024', milk: 46250, avgDaily: '1,491.9', feedExp: 895000, otherExp: 3335000, totalExp: 4230000, revenue: 7631250, profit: 3401250, margin: '44.6%' },
      { period: 'Nov 2024', milk: 44750, avgDaily: '1,491.7', feedExp: 866000, otherExp: 3229000, totalExp: 4095000, revenue: 7383750, profit: 3288750, margin: '44.5%' },
      { period: 'Dec 2024', milk: 46000, avgDaily: '1,483.9', feedExp: 888000, otherExp: 3312000, totalExp: 4200000, revenue: 7590000, profit: 3390000, margin: '44.7%' },
    ];
  }

  // If user clicked '7days' on Monthly report, show Week 1 and Week 2 progress!
  if (preset === '7days') {
    return [
      {
        period: 'Week 1 (May 01 - May 07)',
        milk: 10383,
        avgDaily: '1,483.3',
        feedExp: 197500,
        otherExp: 752500,
        totalExp: 950000,
        revenue: 1713195,
        profit: 763195,
        margin: '44.5%',
      },
      {
        period: 'Week 2 (May 08 - May 14)',
        milk: 10407,
        avgDaily: '1,486.7',
        feedExp: 201200,
        otherExp: 781800,
        totalExp: 983000,
        revenue: 1717155,
        profit: 734155,
        margin: '42.7%',
      },
    ];
  }

  // Full Month (30 Days / This Month)
  const w1Milk = Math.round(totalMonthlyMilk * 0.23);
  const w2Milk = Math.round(totalMonthlyMilk * 0.25);
  const w3Milk = Math.round(totalMonthlyMilk * 0.26);
  const w4Milk = totalMonthlyMilk - w1Milk - w2Milk - w3Milk;

  return [
    {
      period: 'Week 1 (May 01 - May 07)',
      milk: w1Milk,
      avgDaily: (w1Milk / 7).toFixed(1),
      feedExp: Math.round(totalExp * 0.24 * 0.65),
      otherExp: Math.round(totalExp * 0.24 * 0.35),
      totalExp: Math.round(totalExp * 0.24),
      revenue: Math.round(totalRev * 0.23),
      profit: Math.round(totalRev * 0.23 - totalExp * 0.24),
      margin: '42.5%',
    },
    {
      period: 'Week 2 (May 08 - May 14)',
      milk: w2Milk,
      avgDaily: (w2Milk / 7).toFixed(1),
      feedExp: Math.round(totalExp * 0.25 * 0.65),
      otherExp: Math.round(totalExp * 0.25 * 0.35),
      totalExp: Math.round(totalExp * 0.25),
      revenue: Math.round(totalRev * 0.25),
      profit: Math.round(totalRev * 0.25 - totalExp * 0.25),
      margin: '44.1%',
    },
    {
      period: 'Week 3 (May 15 - May 21)',
      milk: w3Milk,
      avgDaily: (w3Milk / 7).toFixed(1),
      feedExp: Math.round(totalExp * 0.26 * 0.65),
      otherExp: Math.round(totalExp * 0.26 * 0.35),
      totalExp: Math.round(totalExp * 0.26),
      revenue: Math.round(totalRev * 0.26),
      profit: Math.round(totalRev * 0.26 - totalExp * 0.26),
      margin: '43.8%',
    },
    {
      period: 'Week 4 (May 22 - May 31)',
      milk: w4Milk,
      avgDaily: (w4Milk / 10).toFixed(1),
      feedExp: Math.round(totalExp * 0.25 * 0.65),
      otherExp: Math.round(totalExp * 0.25 * 0.35),
      totalExp: Math.round(totalExp * 0.25),
      revenue: Math.round(totalRev * 0.26),
      profit: Math.round(totalRev * 0.26 - totalExp * 0.25),
      margin: '45.0%',
    },
  ];
};

// 4. Milk Report Data Helper (for Today, 7 Days, 30 Days, This Month)
export const getMilkReportDataForPreset = (preset: PresetKey = 'month') => {
  if (preset === 'today') {
    return {
      kpi: {
        totalMilk: '1,485.0 L',
        dailyAvg: '1,485.0 L',
        cowsMilked: '82 Cows',
        avgFat: '3.80%',
        avgSnf: '8.80%',
        totalRevenue: 'Rs 245,025',
        subtext: 'Today Parlor Dispatch',
      },
      // Today's sessions & high-yielding cows
      sessions: [
        {
          label: 'Morning Rotary Session (05:00 AM - 07:30 AM)',
          cows: 82,
          liters: 780.0,
          avgPerCow: 9.5,
          fat: 3.82,
          snf: 8.80,
          revenue: 128700,
          status: 'Chilled in Bulk Tank A @ 3.4°C',
        },
        {
          label: 'Evening Rotary Session (05:00 PM - 07:00 PM)',
          cows: 82,
          liters: 705.0,
          avgPerCow: 8.6,
          fat: 3.78,
          snf: 8.81,
          revenue: 116325,
          status: 'Chilled in Bulk Tank B @ 3.5°C',
        },
        {
          label: 'Bulk Raw Milk Tanker Dispatch (07:30 PM)',
          cows: 82,
          liters: 1485.0,
          avgPerCow: 18.1,
          fat: 3.80,
          snf: 8.80,
          revenue: 245025,
          status: 'Dispatched to Engro Processor #72',
        },
      ],
      // Individual top milker breakdown for Today (Ascending Animal ID)
      cows: [
        { id: 'animal-0001', tag: 'AN-001', name: 'Bella', morning: 14.5, evening: 14.2, total: 28.7, fat: 3.8, snf: 8.9, rev: 4735 },
        { id: 'animal-0002', tag: 'AN-002', name: 'Luna', morning: 13.8, evening: 13.6, total: 27.4, fat: 3.7, snf: 8.8, rev: 4521 },
        { id: 'animal-0003', tag: 'AN-003', name: 'Daisy', morning: 13.1, evening: 13.0, total: 26.1, fat: 3.9, snf: 8.7, rev: 4306 },
        { id: 'animal-0004', tag: 'AN-004', name: 'Molly', morning: 12.7, evening: 12.6, total: 25.3, fat: 3.6, snf: 8.6, rev: 4174 },
        { id: 'animal-0005', tag: 'AN-005', name: 'Rosie', morning: 12.5, evening: 12.3, total: 24.8, fat: 3.8, snf: 8.8, rev: 4092 },
        { id: 'animal-0006', tag: 'AN-006', name: 'Lucy', morning: 10.2, evening: 10.0, total: 20.2, fat: 4.0, snf: 8.9, rev: 3333 },
        { id: 'animal-0007', tag: 'AN-007', name: 'Ruby', morning: 15.0, evening: 14.8, total: 29.8, fat: 3.9, snf: 8.8, rev: 4917 },
        { id: 'animal-0008', tag: 'AN-008', name: 'Chloe', morning: 11.2, evening: 10.8, total: 22.0, fat: 4.8, snf: 9.1, rev: 3630 },
        { id: 'animal-0009', tag: 'AN-009', name: 'Penny', morning: 11.8, evening: 11.7, total: 23.5, fat: 3.7, snf: 8.6, rev: 3877 },
        { id: 'animal-0010', tag: 'AN-010', name: 'Stella', morning: 14.2, evening: 13.9, total: 28.1, fat: 3.8, snf: 8.7, rev: 4636 },
        { id: 'animal-0011', tag: 'AN-011', name: 'Sophie', morning: 14.7, evening: 14.5, total: 29.2, fat: 3.9, snf: 8.8, rev: 4818 },
        { id: 'animal-0012', tag: 'AN-012', name: 'Zoe', morning: 13.5, evening: 13.3, total: 26.8, fat: 3.8, snf: 8.7, rev: 4422 },
        { id: 'animal-0013', tag: 'AN-013', name: 'Flora', morning: 10.5, evening: 10.5, total: 21.0, fat: 3.7, snf: 8.6, rev: 3465 },
        { id: 'animal-0014', tag: 'AN-014', name: 'Clara', morning: 10.0, evening: 9.8, total: 19.8, fat: 4.7, snf: 9.0, rev: 3267 },
        { id: 'animal-0015', tag: 'AN-015', name: 'Emma', morning: 12.1, evening: 11.9, total: 24.0, fat: 3.8, snf: 8.7, rev: 3960 },
        { id: 'animal-0016', tag: 'AN-016', name: 'Lily', morning: 11.0, evening: 10.8, total: 21.8, fat: 3.9, snf: 8.8, rev: 3597 },
      ],
    };
  }

  if (preset === '7days') {
    const days = [
      { date: '2024-05-14', morning: 780, evening: 705, total: 1485, avgCow: 18.1, fat: 3.80, snf: 8.80, rev: 245025 },
      { date: '2024-05-13', morning: 785, evening: 707, total: 1492, avgCow: 18.2, fat: 3.79, snf: 8.81, rev: 246180 },
      { date: '2024-05-12', morning: 775, evening: 703, total: 1478, avgCow: 18.0, fat: 3.78, snf: 8.82, rev: 243870 },
      { date: '2024-05-11', morning: 782, evening: 706, total: 1488, avgCow: 18.1, fat: 3.81, snf: 8.80, rev: 245520 },
      { date: '2024-05-10', morning: 788, evening: 707, total: 1495, avgCow: 18.2, fat: 3.77, snf: 8.83, rev: 246675 },
      { date: '2024-05-09', morning: 778, evening: 702, total: 1480, avgCow: 18.0, fat: 3.79, snf: 8.81, rev: 244200 },
      { date: '2024-05-08', morning: 784, evening: 705, total: 1489, avgCow: 18.2, fat: 3.80, snf: 8.82, rev: 245685 },
    ];
    return {
      kpi: {
        totalMilk: '10,407.0 L',
        dailyAvg: '1,486.7 L',
        cowsMilked: '82 Cows',
        avgFat: '3.79%',
        avgSnf: '8.82%',
        totalRevenue: 'Rs 1,717,155',
        subtext: 'Past 7 Days Aggregate',
      },
      days,
    };
  }

  if (preset === 'year') {
    const days = [
      { date: 'Dec 2024', morning: 23920, evening: 22080, total: 46000, avgCow: 18.1, fat: 3.80, snf: 8.81, rev: 7590000 },
      { date: 'Nov 2024', morning: 23270, evening: 21480, total: 44750, avgCow: 18.2, fat: 3.81, snf: 8.80, rev: 7383750 },
      { date: 'Oct 2024', morning: 24050, evening: 22200, total: 46250, avgCow: 18.2, fat: 3.79, snf: 8.82, rev: 7631250 },
      { date: 'Sep 2024', morning: 23300, evening: 21500, total: 44800, avgCow: 18.2, fat: 3.78, snf: 8.82, rev: 7392000 },
      { date: 'Aug 2024', morning: 23970, evening: 22130, total: 46100, avgCow: 18.1, fat: 3.79, snf: 8.81, rev: 7606500 },
      { date: 'Jul 2024', morning: 23820, evening: 21980, total: 45800, avgCow: 18.0, fat: 3.78, snf: 8.80, rev: 7557000 },
      { date: 'Jun 2024', morning: 23170, evening: 21380, total: 44550, avgCow: 18.1, fat: 3.79, snf: 8.81, rev: 7350750 },
      { date: 'May 2024', morning: 23940, evening: 22095, total: 46035, avgCow: 18.1, fat: 3.80, snf: 8.81, rev: 7595775 },
      { date: 'Apr 2024', morning: 23240, evening: 21460, total: 44700, avgCow: 18.2, fat: 3.81, snf: 8.82, rev: 7375500 },
      { date: 'Mar 2024', morning: 24020, evening: 22180, total: 46200, avgCow: 18.1, fat: 3.80, snf: 8.80, rev: 7623000 },
      { date: 'Feb 2024', morning: 22420, evening: 20700, total: 43120, avgCow: 18.0, fat: 3.77, snf: 8.81, rev: 7114800 },
      { date: 'Jan 2024', morning: 23940, evening: 22095, total: 46035, avgCow: 18.1, fat: 3.80, snf: 8.82, rev: 7595775 },
    ];
    return {
      kpi: {
        totalMilk: '544,340.0 L',
        dailyAvg: '1,487.3 L',
        cowsMilked: '82 Cows avg',
        avgFat: '3.79%',
        avgSnf: '8.81%',
        totalRevenue: 'Rs 89,810,000',
        subtext: 'Full Year 2024 Production',
      },
      days,
    };
  }

  // 30days or month
  const days = [
    { date: '2024-05-14', morning: 780, evening: 705, total: 1485, avgCow: 18.1, fat: 3.80, snf: 8.80, rev: 245025 },
    { date: '2024-05-13', morning: 785, evening: 707, total: 1492, avgCow: 18.2, fat: 3.79, snf: 8.81, rev: 246180 },
    { date: '2024-05-12', morning: 775, evening: 703, total: 1478, avgCow: 18.0, fat: 3.78, snf: 8.82, rev: 243870 },
    { date: '2024-05-11', morning: 782, evening: 706, total: 1488, avgCow: 18.1, fat: 3.81, snf: 8.80, rev: 245520 },
    { date: '2024-05-10', morning: 788, evening: 707, total: 1495, avgCow: 18.2, fat: 3.77, snf: 8.83, rev: 246675 },
    { date: '2024-05-09', morning: 778, evening: 702, total: 1480, avgCow: 18.0, fat: 3.79, snf: 8.81, rev: 244200 },
    { date: '2024-05-08', morning: 784, evening: 705, total: 1489, avgCow: 18.2, fat: 3.80, snf: 8.82, rev: 245685 },
    { date: '2024-05-07', morning: 781, evening: 703, total: 1484, avgCow: 18.1, fat: 3.78, snf: 8.81, rev: 244860 },
    { date: '2024-05-06', morning: 779, evening: 701, total: 1480, avgCow: 18.0, fat: 3.79, snf: 8.82, rev: 244200 },
    { date: '2024-05-05', morning: 783, evening: 704, total: 1487, avgCow: 18.1, fat: 3.80, snf: 8.80, rev: 245355 },
    { date: '2024-05-04', morning: 776, evening: 700, total: 1476, avgCow: 18.0, fat: 3.77, snf: 8.83, rev: 243540 },
    { date: '2024-05-03', morning: 786, evening: 708, total: 1494, avgCow: 18.2, fat: 3.81, snf: 8.81, rev: 246510 },
    { date: '2024-05-02', morning: 780, evening: 703, total: 1483, avgCow: 18.1, fat: 3.79, snf: 8.82, rev: 244695 },
    { date: '2024-05-01', morning: 777, evening: 700, total: 1477, avgCow: 18.0, fat: 3.78, snf: 8.80, rev: 243705 },
  ];
  return {
    kpi: {
      totalMilk: preset === '30days' ? '44,550.0 L' : '20,790.0 L',
      dailyAvg: '1,485.0 L',
      cowsMilked: '82 Cows',
      avgFat: '3.78%',
      avgSnf: '8.82%',
      totalRevenue: preset === '30days' ? 'Rs 7,350,750' : 'Rs 3,430,350',
      subtext: preset === '30days' ? '30-Day Total' : '14 Days Month-to-Date',
    },
    days,
  };
};
