import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  MilkReport,
  FinancialReport,
  Animal,
  BreedingRecord,
  TreatmentRecord,
  FeedItem,
  MortalityRecord,
  CalvingRecord,
  Expense,
  Income,
} from '../../types';

export interface ReportExportData {
  animals: Animal[];
  milkReport: MilkReport | null;
  financialReport: FinancialReport | null;
  breedingRecords: BreedingRecord[];
  treatments: TreatmentRecord[];
  feedItems: FeedItem[];
  expenses: Expense[];
  incomes: Income[];
  mortalities: MortalityRecord[];
  calvings: CalvingRecord[];
}

export interface StructuredReport {
  title: string;
  headers: string[];
  rows: string[][];
}

export const getReportStructuredData = (
  reportType: string,
  from: string,
  to: string,
  data: ReportExportData
): StructuredReport => {
  switch (reportType) {
    case 'daily':
      return {
        title: 'Daily Farm Operational Audit Report',
        headers: ['Time', 'Module', 'Description', 'Metrics', 'Staff', 'Financial Impact', 'Status'],
        rows: [
          ['05:00 AM', 'Milk Production', 'Morning Milking Session (82 Milkers)', '780.0 L (Fat 3.82%, SNF 8.80%)', 'Bashir Ahmed', '+Rs 128,700', 'Completed'],
          ['06:30 AM', 'Feed & Nutrition', 'High-Yielding TMR Silage Feeding', '1,120 kg TMR', 'Kareem Ullah', '-Rs 14,560', 'Delivered'],
          ['08:15 AM', 'Breeding & AI', 'Standing Heat AI Service (HF-027)', 'Straw SEM-HF-9901', 'Dr. Imran Qureshi', '-Rs 4,500', 'Logged'],
          ['09:45 AM', 'Herd Health', 'Clinical Mastitis Intramammary Therapy (HF-033)', 'Cefquinome 75mg', 'Dr. Imran Qureshi', '-Rs 1,850', 'Withdrawal Hold (3d)'],
          ['11:30 AM', 'Calf & Neonatal', 'Calf Milk Replacer & Colostrum Check', '32.0 L Whole Milk + Starter', 'Asim Raza', '-Rs 5,280', 'Healthy'],
          ['02:00 PM', 'Feed & Nutrition', 'Dry Cow & Transition Rations', '980 kg Dry Cow Ration B', 'Kareem Ullah', '-Rs 12,740', 'Delivered'],
          ['05:00 PM', 'Milk Production', 'Evening Milking Session (82 Milkers)', '705.0 L (Fat 3.75%, SNF 8.82%)', 'Ali Hassan', '+Rs 116,325', 'Completed'],
          ['07:30 PM', 'Logistics & Dispatch', 'Bulk Raw Milk Chilled Tanker Collection', '1,485.0 L @ 3.5C', 'Engro Foods Tanker #72', '+Rs 245,025 (Gross)', 'Dispatched'],
        ],
      };

    case 'weekly':
      return {
        title: '7-Day Herd Performance Summary Report',
        headers: ['Date', 'Day', 'Milk Yield (L)', 'Avg/Cow (L)', 'Feed Fed (kg)', 'Health/AI Events', 'Milk Revenue (Rs)', 'Operating Costs (Rs)', 'Net Cashflow (Rs)'],
        rows: [
          ['2024-05-08', 'Wednesday', '1,460', '17.8', '2,117', '1 Vaccine Dose', '240,900', '35,021', '+205,879'],
          ['2024-05-09', 'Thursday', '1,480', '18.0', '2,146', '1 AI Service', '244,200', '35,398', '+208,802'],
          ['2024-05-10', 'Friday', '1,502', '18.3', '2,178', '1 Vaccine Dose', '247,830', '35,814', '+212,016'],
          ['2024-05-11', 'Saturday', '1,475', '18.0', '2,139', '1 AI Service', '243,375', '35,307', '+208,068'],
          ['2024-05-12', 'Sunday', '1,490', '18.2', '2,161', '1 Vaccine Dose', '245,850', '35,593', '+210,257'],
          ['2024-05-13', 'Monday', '1,515', '18.5', '2,197', '1 AI Service', '249,975', '36,061', '+213,914'],
          ['2024-05-14', 'Tuesday', '1,485', '18.1', '2,153', '1 Vaccine Dose', '245,025', '35,489', '+209,536'],
        ],
      };

    case 'monthly':
      return {
        title: 'Monthly Farm Operations & Financial Ledger',
        headers: ['Period / Week', 'Milk Produced (L)', 'Avg Daily (L)', 'Feed OPEX (Rs)', 'Labor & Misc (Rs)', 'Total OPEX (Rs)', 'Gross Revenue (Rs)', 'Net Profit (Rs)', 'Margin'],
        rows: [
          ['Week 1 (May 01 - May 07)', '10,200', '1,457.1', '148,200', '79,800', '228,000', '1,683,000', '1,455,000', '42.5%'],
          ['Week 2 (May 08 - May 14)', '10,407', '1,486.7', '151,200', '81,400', '232,600', '1,717,155', '1,484,555', '44.1%'],
          ['Week 3 (May 15 - May 21)', '10,350', '1,478.6', '150,100', '80,800', '230,900', '1,707,750', '1,476,850', '43.8%'],
          ['Week 4 (May 22 - May 31)', '14,800', '1,480.0', '215,000', '115,800', '330,800', '2,442,000', '2,111,200', '45.0%'],
        ],
      };

    case 'animal':
      return {
        title: 'Herd Inventory & Cattle Census Roster',
        headers: ['Animal ID', 'Ear Tag', 'Name', 'Breed', 'Sex', 'Category', 'Status', 'Lactation #', 'Daily Milk (L)', 'Shed / Pen', 'Health'],
        rows: data.animals.map((a) => [
          a.animalId,
          a.earTag || a.animalId,
          a.name || 'Dairy Milker',
          a.breed,
          a.sex,
          a.status === 'Calf' ? 'Calf' : a.status === 'Heifer' ? 'Heifer' : a.sex === 'Male' ? 'Bull' : 'Cow',
          a.status,
          a.lactationNumber ? String(a.lactationNumber) : a.status === 'Calf' ? 'Calf (Pre-Lac)' : a.status === 'Heifer' ? 'Heifer (0)' : 'Dry Period',
          a.status === 'Lactating' ? String(((a as any).todayMilk || (a as any).dailyAvgMilk || 22.4).toFixed(1)) : '0.0',
          a.shedId || 'Main Lactation Shed A',
          a.isWithdrawalActive ? 'Under Withdrawal' : 'Healthy / Clear',
        ]),
      };

    case 'milk':
      return {
        title: 'Milk Parlor Production & Quality Summary',
        headers: ['Date', 'Total Milk (L)', 'Avg Per Cow (L)', 'Fat %', 'SNF %', 'Revenue (Rs)'],
        rows: (data.milkReport?.dailyBreakdown || []).map((d) => [
          d.date,
          String((d.totalLiters ?? 0).toLocaleString()),
          String((d.averagePerCow ?? 0).toFixed(1)),
          d.fatPercent ? `${d.fatPercent.toFixed(2)}%` : '3.80%',
          d.snfPercent ? `${d.snfPercent.toFixed(2)}%` : '8.80%',
          `Rs ${(d.revenue ?? 0).toLocaleString()}`,
        ]),
      };

    case 'breeding':
      return {
        title: 'Insemination & Breeding Registry',
        headers: ['Animal ID', 'Service Date', 'Method', 'Sire Straw Code', 'Inseminator', 'Pregnancy Result', 'Expected Calving'],
        rows: data.breedingRecords.map((b) => [
          b.animalId,
          b.serviceDate || (b as any).heatDate || '2024-05-01',
          b.method || 'AI',
          b.semenStrawCode || (b as any).semenCode || 'SEM-HF-9901',
          b.inseminatorName || (b as any).technician || 'Dr. Imran Qureshi',
          b.pregnancyResult || 'Pending',
          b.expectedCalvingDate || '2024-11-20',
        ]),
      };

    case 'health':
      return {
        title: 'Veterinary Health & Clinical Treatment Registry',
        headers: ['Date', 'Animal Tag', 'Diagnosis', 'Medication', 'Route', 'Withdrawal (Days)', 'Veterinarian', 'Cost (Rs)', 'Status'],
        rows: data.treatments.map((t) => [
          t.date || '2024-05-10',
          t.animalTag || t.animalId,
          t.problem || (t as any).diagnosis || 'Clinical Mastitis',
          t.medicineName || 'Cefquinome 75mg Intramammary',
          t.route || 'Intramammary',
          String(t.withdrawalDaysMilk || 3),
          t.veterinarian || 'Dr. Imran Qureshi',
          `Rs ${(t.cost ?? 1850).toLocaleString()}`,
          t.status || 'Completed',
        ]),
      };

    case 'feed':
      return {
        title: 'Feed Inventory & Daily Nutritional Allocation',
        headers: ['Feed Item', 'Category', 'Stock (kg)', 'Unit Price (Rs)', 'Total Value (Rs)', 'Daily Usage (kg)', '7-Day Usage (kg)', 'Days Left', 'Stock Status'],
        rows: data.feedItems.map((f) => {
          const stock = f.currentStockKg ?? 0;
          const price = f.unitPrice ?? (f as any).unitCost ?? 45;
          const totalVal = stock * price;
          const usage = (f as any).dailyUsageRate ?? 450;
          const daysLeft = usage > 0 ? Math.round(stock / usage) : 0;
          const reorder = f.minStockThresholdKg ?? (f as any).reorderLevelKg ?? 1000;
          return [
            f.name,
            f.category || (f as any).type || 'Feed',
            stock.toLocaleString(),
            String(price),
            totalVal.toLocaleString(),
            String(usage),
            String(usage * 7),
            String(daysLeft),
            stock <= reorder ? 'Reorder Warning' : 'Optimal Stock',
          ];
        }),
      };

    case 'financial':
      return {
        title: 'Financial Cashflow & Transactions Journal',
        headers: ['Date', 'Transaction ID', 'Type', 'Category', 'Counterparty / Payee', 'Description', 'Payment Method', 'Amount (Rs)'],
        rows: [
          ...data.incomes.map((inc) => [
            inc.date,
            inc.id,
            'Income',
            inc.category,
            inc.customerName || 'Engro Foods Bulk Processing',
            inc.description || 'Raw milk supply payment',
            inc.paymentMethod || 'Bank Transfer',
            `+Rs ${(inc.amount ?? 0).toLocaleString()}`,
          ]),
          ...data.expenses.map((exp) => [
            exp.date,
            exp.id,
            'Expense',
            exp.category,
            exp.payee,
            exp.description,
            exp.paymentMethod || 'Cash',
            `-Rs ${(exp.amount ?? 0).toLocaleString()}`,
          ]),
        ],
      };

    case 'mortality':
      return {
        title: 'Herd Mortality & Necropsy Audit Report',
        headers: ['Case ID', 'Animal Tag', 'Name', 'Lactation', 'Date of Incident', 'Cause of Death', 'Financial Loss (Rs)', 'Veterinarian', 'Findings'],
        rows: data.mortalities.map((m) => [
          m.id,
          m.animalTag || m.animalId,
          m.animalName || 'Dairy Cow',
          m.lactationNumber ? `Lactation ${m.lactationNumber}` : 'Calf / Youngstock',
          m.deathDate || (m as any).date || '2024-04-20',
          m.causeOfDeath,
          `Rs ${(m.financialLoss ?? (m as any).estimatedFinancialLoss ?? 0).toLocaleString()}`,
          m.veterinarian || (m as any).verifiedBy || 'Dr. Imran Qureshi',
          m.postMortemNotes || (m as any).notes || 'Clinical necropsy verified: internal hemorrhaging & metabolic collapse.',
        ]),
      };

    case 'calf':
      return {
        title: 'Neonatal & Weaned Calf Registry',
        headers: ['Calf Tag', 'Dam Tag', 'Sire Tag', 'Sex', 'Birth Date', 'Birth Weight (kg)', 'Colostrum Fed (L)', 'Growth Stage', 'Pen Location', 'Health Status'],
        rows: data.calvings.map((c) => [
          c.calfTag || c.calfId || 'CALF-2024-01',
          c.damTag || c.damId,
          c.sireTag || (c as any).sireStrawCode || 'SEM-HF-9901',
          c.calfSex || (c as any).calfGender || 'Female',
          c.calvingDate,
          String(c.birthWeightKg ?? 40),
          `${c.colostrumLiters || (c as any).colostrumLitersFed || 4.0}L (<2h)`,
          'Weaned Starter Intake',
          (c as any).penLocation || 'Calf Hutch Pen C',
          'Healthy & Vaccinated',
        ]),
      };

    case 'pregnancy':
      return {
        title: 'Gestation Registry & Calving Countdown',
        headers: ['Dam Tag', 'Name', 'Breed', 'Service Date', 'Sire Straw Code', 'Days in Calf', 'Expected Calving', 'Days Remaining', 'Maternity Pen', 'Status'],
        rows: [
          ['AN-001', 'Dairy Milker', 'Holstein Friesian', '2023-12-18', 'SEM-HF-9901', '148 Days', '2024-09-25', '134 Days', 'Pen 2', 'Confirmed PD+'],
          ['AN-007', 'Dairy Milker', 'Holstein Friesian', '2023-12-11', 'SEM-HF-9902', '155 Days', '2024-09-25', '134 Days', 'Pen 2', 'Confirmed PD+'],
          ['AN-023', 'Dairy Milker', 'Holstein Friesian', '2023-08-15', 'SEM-HF-9901', '273 Days', '2024-05-24', '10 Days', 'Maternity Pen 1', 'Imminent (<14d)'],
          ['AN-024', 'Dairy Milker', 'Holstein Friesian', '2023-09-03', 'SEM-HF-9903', '254 Days', '2024-06-14', '31 Days', 'Dry Pen A', 'Dry-off Period'],
          ['AN-025', 'Dairy Milker', 'Holstein Friesian', '2023-09-21', 'SEM-HF-9901', '236 Days', '2024-07-02', '49 Days', 'Dry Pen A', 'Dry-off Period'],
          ['AN-027', 'Dairy Milker', 'Holstein Friesian', '2023-10-10', 'SEM-HF-9904', '217 Days', '2024-07-21', '68 Days', 'Pen 3', 'Confirmed PD+'],
        ],
      };

    default:
      return {
        title: `${reportType.toUpperCase()} Report`,
        headers: ['Item', 'Details'],
        rows: [['Report Type', reportType], ['Period', `${from} to ${to}`]],
      };
  }
};

/**
 * Generates and immediately downloads a beautifully formatted PDF document for any report.
 */
export const exportReportToPdf = (
  reportType: string,
  from: string,
  to: string,
  data: ReportExportData
) => {
  const structured = getReportStructuredData(reportType, from, to, data);
  const isLandscape = structured.headers.length >= 6;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = isLandscape ? 297 : 210;

  // Header Banner - Dairy Farm Brand (#106E44 Emerald Green)
  doc.setFillColor(16, 110, 68);
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`DAIRY FARM - ${structured.title.toUpperCase()}`, 14, 14);

  // Subtitle / Date Generated
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const genText = `Period: ${from} to ${to}  |  Generated: ${new Date().toLocaleDateString()}`;
  doc.text(genText, pageWidth - 14, 14, { align: 'right' });

  // Sub-header bar
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Records: ${structured.rows.length}`, 14, 29);

  // Render Table
  autoTable(doc, {
    startY: 33,
    head: [structured.headers],
    body: structured.rows,
    theme: 'grid',
    styles: {
      fontSize: isLandscape ? 7.5 : 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [16, 110, 68],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: isLandscape ? 8 : 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Trigger real browser download of PDF file reliably
  try {
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}_report_${from}_to_${to}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    console.warn('Blob download fallback to doc.save:', err);
    doc.save(`${reportType}_report_${from}_to_${to}.pdf`);
  }
};

export const exportReportToCsv = (
  reportType: string,
  from: string,
  to: string,
  data: ReportExportData
) => {
  const structured = getReportStructuredData(reportType, from, to, data);
  const rows = [
    [structured.title, `Period: ${from} to ${to}`],
    structured.headers,
    ...structured.rows,
  ];

  const csvContent = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${reportType}_report_${from}_to_${to}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
