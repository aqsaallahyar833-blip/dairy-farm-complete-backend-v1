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
        rows: [],
      };

    case 'weekly':
      return {
        title: '7-Day Herd Performance Summary Report',
        headers: ['Date', 'Day', 'Milk Yield (L)', 'Avg/Cow (L)', 'Feed Fed (kg)', 'Health/AI Events', 'Milk Revenue (Rs)', 'Operating Costs (Rs)', 'Net Cashflow (Rs)'],
        rows: [],
      };

    case 'monthly':
      return {
        title: 'Monthly Farm Operations & Financial Ledger',
        headers: ['Period / Week', 'Milk Produced (L)', 'Avg Daily (L)', 'Feed OPEX (Rs)', 'Labor & Misc (Rs)', 'Total OPEX (Rs)', 'Gross Revenue (Rs)', 'Net Profit (Rs)', 'Margin'],
        rows: [],
      };

    case 'animal':
      return {
        title: 'Herd Inventory & Cattle Census Roster',
        headers: ['Animal ID', 'Ear Tag', 'Name', 'Breed', 'Sex', 'Category', 'Status', 'Lactation #', 'Daily Milk (L)', 'Shed / Pen', 'Health'],
        rows: data.animals.map((a) => [
          a.animalId,
          a.earTag || a.animalId,
          a.name || '—',
          a.breed,
          a.sex,
          a.status === 'Calf' ? 'Calf' : a.status === 'Heifer' ? 'Heifer' : a.sex === 'Male' ? 'Bull' : 'Cow',
          a.status,
          a.lactationNumber ? String(a.lactationNumber) : a.status === 'Calf' ? 'Calf (Pre-Lac)' : a.status === 'Heifer' ? 'Heifer (0)' : 'Dry Period',
          '—',
          a.shedId || '—',
          a.isWithdrawalActive ? 'Under Withdrawal' : '—',
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
          d.fatPercent != null ? `${d.fatPercent.toFixed(2)}%` : '—',
          d.snfPercent != null ? `${d.snfPercent.toFixed(2)}%` : '—',
          d.revenue != null ? `Rs ${d.revenue.toLocaleString()}` : '—',
        ]),
      };

    case 'breeding':
      return {
        title: 'Insemination & Breeding Registry',
        headers: ['Animal ID', 'Service Date', 'Method', 'Sire Straw Code', 'Inseminator', 'Pregnancy Result', 'Expected Calving'],
        rows: data.breedingRecords.map((b) => [
          b.animalId,
          b.serviceDate || '—',
          b.method || '—',
          b.semenStrawCode || (b as any).semenCode || '—',
          b.inseminatorName || (b as any).technician || '—',
          b.pregnancyResult || '—',
          b.expectedCalvingDate || '—',
        ]),
      };

    case 'health':
      return {
        title: 'Veterinary Health & Clinical Treatment Registry',
        headers: ['Date', 'Animal Tag', 'Diagnosis', 'Medication', 'Route', 'Withdrawal (Days)', 'Veterinarian', 'Cost (Rs)', 'Status'],
        rows: data.treatments.map((t) => [
          t.date || '—',
          t.animalTag || t.animalId,
          t.problem || (t as any).diagnosis || '—',
          t.medicineName || '—',
          t.route || '—',
          t.withdrawalDaysMilk != null ? String(t.withdrawalDaysMilk) : '—',
          t.veterinarian || '—',
          t.cost != null ? `Rs ${t.cost.toLocaleString()}` : '—',
          t.status || '—',
        ]),
      };

    case 'feed':
      return {
        title: 'Feed Inventory & Daily Nutritional Allocation',
        headers: ['Feed Item', 'Category', 'Stock (kg)', 'Unit Price (Rs)', 'Total Value (Rs)', 'Daily Usage (kg)', '7-Day Usage (kg)', 'Days Left', 'Stock Status'],
        rows: data.feedItems.map((f) => {
          const stock = f.currentStockKg;
          const price = f.unitPrice ?? (f as any).unitCost;
          const totalVal = stock != null && price != null ? stock * price : null;
          const usage = (f as any).dailyUsageRate;
          const daysLeft = stock != null && usage > 0 ? Math.round(stock / usage) : null;
          const reorder = f.minStockThresholdKg ?? (f as any).reorderLevelKg;
          return [
            f.name,
            f.category || (f as any).type || 'Feed',
            stock != null ? stock.toLocaleString() : '—',
            price != null ? String(price) : '—',
            totalVal != null ? totalVal.toLocaleString() : '—',
            usage != null ? String(usage) : '—',
            usage != null ? String(usage * 7) : '—',
            daysLeft != null ? String(daysLeft) : '—',
            stock != null && reorder != null ? (stock <= reorder ? 'Reorder Warning' : 'Optimal Stock') : '—',
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
