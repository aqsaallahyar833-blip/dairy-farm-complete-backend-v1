import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Animal, MilkRecord, BreedingRecord, HealthRecord, TreatmentRecord, Ration } from '../types';

export interface AnimalDossierData {
  animal: Animal;
  farmName?: string;
  shedName?: string;
  groupName?: string;
  milkRecords?: MilkRecord[];
  breedingRecords?: BreedingRecord[];
  healthRecords?: HealthRecord[];
  treatments?: TreatmentRecord[];
  ration?: Ration;
  qrDataUrl?: string;
  generatedBy?: string;
}

/**
 * Generates and downloads a clean, professional, high-density Animal Profile Dossier in PDF format.
 */
export async function exportAnimalProfilePdf(data: AnimalDossierData): Promise<void> {
  const {
    animal,
    farmName = 'Green Dairy Farm (Punjab)',
    shedName = 'Shed 01 - Main Milking Barn',
    groupName = 'High Yield Lactating Herd',
    milkRecords = [],
    breedingRecords = [],
    healthRecords = [],
    treatments = [],
    ration,
    qrDataUrl,
    generatedBy = 'Dairy Herd Management System',
  } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let currentY = 14;

  // Header Banner
  doc.setFillColor(15, 76, 58); // Deep emerald / forest
  doc.rect(margin, currentY, pageWidth - margin * 2, 22, 'F');

  // Title text inside banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OFFICIAL ANIMAL PROFILE DOSSIER & PASSPORT', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${farmName}  |  Official Record ID: ${animal.animalId}  |  Issued: ${new Date().toLocaleDateString('en-GB')}`,
    margin + 6,
    currentY + 16
  );

  currentY += 27;

  // Status & Warning Banner if antibiotic withdrawal active
  if (animal.isWithdrawalActive) {
    doc.setFillColor(254, 226, 226); // Red-100
    doc.setDrawColor(220, 38, 38);
    doc.rect(margin, currentY, pageWidth - margin * 2, 9, 'FD');
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CRITICAL WARNING: ACTIVE MEDICINE WITHDRAWAL HOLD - DO NOT MIX MILK WITH BULK TANK', margin + 4, currentY + 6);
    currentY += 13;
  }

  // QR Code on Header right side if available
  const qrBoxSize = 28;
  const qrX = pageWidth - margin - qrBoxSize;
  const qrY = currentY;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrBoxSize, qrBoxSize);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan for Live Profile', qrX + 3, qrY + qrBoxSize + 3);
    } catch {
      // ignore image embedding error
    }
  }

  // Identity Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Animal Identification & Pedigree', margin, currentY + 5);

  const idColWidth = qrDataUrl ? (pageWidth - margin * 2 - qrBoxSize - 8) : (pageWidth - margin * 2);

  autoTable(doc, {
    startY: currentY + 8,
    margin: { left: margin, right: qrDataUrl ? (pageWidth - margin - idColWidth) : margin },
    tableWidth: idColWidth,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    body: [
      [
        { content: 'Animal Code / ID:', styles: { fontStyle: 'bold' } },
        animal.animalId,
        { content: 'Ear Tag:', styles: { fontStyle: 'bold' } },
        `#${animal.earTag}`,
      ],
      [
        { content: 'RFID Microchip:', styles: { fontStyle: 'bold' } },
        animal.rfid || 'Not Assigned',
        { content: 'Current Status:', styles: { fontStyle: 'bold', textColor: [16, 185, 129] } },
        animal.status.toUpperCase(),
      ],
      [
        { content: 'Breed:', styles: { fontStyle: 'bold' } },
        animal.breed,
        { content: 'Sex:', styles: { fontStyle: 'bold' } },
        animal.sex,
      ],
      [
        { content: 'Date of Birth:', styles: { fontStyle: 'bold' } },
        animal.dateOfBirth,
        { content: 'Shed / Pen Location:', styles: { fontStyle: 'bold' } },
        shedName,
      ],
      [
        { content: 'Herd Group:', styles: { fontStyle: 'bold' } },
        groupName,
        { content: 'Dam (Mother):', styles: { fontStyle: 'bold' } },
        animal.damTag || animal.damId || 'Unknown',
      ],
      [
        { content: 'Sire (Father / Bull):', styles: { fontStyle: 'bold' } },
        animal.sireTag || animal.sireId || 'N/A',
        { content: 'Color / Markings:', styles: { fontStyle: 'bold' } },
        animal.colorMarkings || 'Standard',
      ],
      [
        { content: 'Purchase Date & Price:', styles: { fontStyle: 'bold' } },
        animal.purchasePrice ? `${animal.purchaseDate || 'N/A'} (PKR ${animal.purchasePrice.toLocaleString()})` : 'Farm Bred',
        { content: 'Secure QR Token:', styles: { fontStyle: 'bold' } },
        /*
         * Phase 2B: never invent a token. The backend issues and stores QR
         * tokens in animal_identifications; a fabricated `qr-tok-an001` on a
         * printed certificate resolves to nothing and implies a live tag that
         * does not exist. When none has been issued, say so.
         */
        animal.qrToken || 'Not issued - no QR token has been generated for this animal',
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 2. Production & Lactation Metrics
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Milk Production & Lactation Performance', margin, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [15, 76, 58], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2.2 },
    head: [['Current Lactation', 'Days In Milk (DIM)', 'Today\'s Yield', '30-Day Daily Average', 'Est. 305-Day Projection']],
    body: [
      [
        `Lactation #${animal.lactationNumber || 1}`,
        `${animal.daysInMilk || 0} Days`,
        `${animal.todayMilk ?? 25.0} Liters`,
        `${animal.dailyAvgMilk ?? 24.5} Liters / day`,
        `${((animal.dailyAvgMilk ?? 24.5) * 305).toLocaleString()} Liters`,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Recent Milkings Subtable
  if (milkRecords.length > 0) {
    const recentRows = milkRecords.slice(0, 5).map((r) => [
      r.date,
      r.session,
      `${r.quantityLiters.toFixed(1)} L`,
      `${r.fatPercent ?? 3.8}%`,
      `${r.snfPercent ?? 8.5}%`,
      r.qualityStatus,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, cellPadding: 1.8 },
      head: [['Date', 'Session', 'Yield (Liters)', 'Fat %', 'SNF %', 'Quality Status']],
      body: recentRows,
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 3. Reproduction & Breeding History
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Breeding & Reproductive Dossier', margin, currentY);

  const breedingBody = breedingRecords.length > 0
    ? breedingRecords.slice(0, 4).map((b) => [
        b.heatDate || b.serviceDate || 'N/A',
        b.method,
        b.bullTag || b.bullId || b.semenCode || 'N/A',
        b.pregnancyResult || b.pregnancyStage || 'Pending',
        b.expectedCalvingDate || 'TBD',
        b.technician || 'N/A',
      ])
    : [['N/A', 'N/A', 'N/A', animal.pregnancyStatus || 'N/A', animal.expectedCalvingDate || 'N/A', 'N/A']];

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, cellPadding: 2 },
    head: [['Event Date', 'Type', 'Bull / Semen Tag', 'Pregnancy Status', 'Expected Calving', 'Inseminator / Vet']],
    body: breedingBody,
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // Check if we need a new page for Health & Treatments
  if (currentY > 235) {
    doc.addPage();
    currentY = 16;
  }

  // 4. Health, Treatments & Vaccinations
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Veterinary Health & Treatment History', margin, currentY);

  const treatmentRows = treatments.length > 0
    ? treatments.slice(0, 5).map((t) => [
        t.date,
        t.diagnosis || t.problem || 'Health Inspection',
        t.medicineName || 'Antibiotic / Vitamin',
        t.dose || t.dosage || '20ml IM',
        t.withdrawalDaysMilk ? `${t.withdrawalDaysMilk} Days (Milk)` : 'None',
        t.status,
      ])
    : healthRecords.length > 0
    ? healthRecords.slice(0, 5).map((h) => [
        h.date,
        h.diagnosis || h.problem,
        'Clinical Examination',
        'N/A',
        'None',
        h.status,
      ])
    : [['N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A']];

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [15, 76, 58], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, cellPadding: 2 },
    head: [['Date', 'Diagnosis / Condition', 'Medication / Action', 'Dosage / Route', 'Withdrawal Days', 'Status']],
    body: treatmentRows,
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // 5. Feeding / Ration Assignment
  if (ration && currentY < 260) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Assigned Ration: ${ration.name} (${ration.targetGroup}) - Target Intake: ${ration.totalKgPerCow} kg/cow/day`, margin, currentY);
    currentY += 8;
  }

  // Footer / Sign-off
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    /*
     * Phase 2B: only print a resolvable live-verification link when a real
     * backend-issued token exists. Printing a link built from the animal code
     * advertises an endpoint that always 404s.
     */
    animal.qrToken
      ? `Certified Official Farm Record  •  ${generatedBy}  •  Live QR Verification: ${window.location.origin}/qr/animal/${animal.qrToken}`
      : `Certified Official Farm Record  •  ${generatedBy}`,
    margin,
    footerY
  );
  doc.text(`Page 1 of 1`, pageWidth - margin - 18, footerY);

  // Save the PDF
  doc.save(`${animal.animalId}_Profile_Dossier.pdf`);
}
