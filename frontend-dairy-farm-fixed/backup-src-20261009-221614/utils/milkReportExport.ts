import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MilkRecord, MilkDailySummary, MilkReport } from '../types';

/**
 * Downloads a professional, clean Milk Production Report in PDF format.
 */
export function downloadMilkReportPDF(
  records: MilkRecord[],
  summary: MilkDailySummary | null,
  selectedDate: string,
  sessionFilter: string = 'All'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(16, 110, 68); // #106E44 Emerald Green
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DAIRY FARM MILK PRODUCTION REPORT', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 140, 15);

  // Meta Information Bar
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Date: ${selectedDate}`, 14, 32);
  doc.text(`Milking Session: ${sessionFilter}`, 80, 32);
  doc.text(`Total Records: ${records.length}`, 150, 32);

  // Summary Metrics Box
  if (summary) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 37, 182, 22, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('MORNING YIELD', 20, 43);
    doc.text('EVENING YIELD', 58, 43);
    doc.text('TOTAL MILK', 96, 43);
    doc.text('MILKING HERD', 134, 43);
    doc.text('EST. REVENUE', 162, 43);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${summary.morningLiters.toFixed(1)} L`, 20, 52);
    doc.text(`${summary.eveningLiters.toFixed(1)} L`, 58, 52);
    
    doc.setTextColor(16, 110, 68);
    doc.text(`${summary.totalLiters.toFixed(1)} L`, 96, 52);

    doc.setTextColor(15, 23, 42);
    doc.text(`${summary.milkingCowsCount} Cows`, 134, 52);

    doc.setTextColor(16, 110, 68);
    doc.text(`Rs ${summary.revenue.toLocaleString()}`, 162, 52);
  }

  // Table Data
  const startY = summary ? 64 : 40;

  const tableRows = records.map((rec, index) => {
    const animalId = rec.animalTag || rec.animalId;
    const unitPrice = rec.pricePerLiter ?? 150;
    const recTotal = rec.totalAmount !== undefined ? rec.totalAmount : Math.round(rec.quantityLiters * unitPrice);
    const isRej = rec.qualityStatus === 'Rejected';

    return [
      (index + 1).toString(),
      animalId,
      rec.session,
      `${rec.quantityLiters.toFixed(1)} L`,
      `Rs ${unitPrice}`,
      isRej ? 'Rs 0 (Rejected)' : `Rs ${recTotal.toLocaleString()}`,
      rec.qualityStatus || 'Accepted',
    ];
  });

  autoTable(doc, {
    startY,
    head: [['#', 'Animal ID', 'Session', 'Quantity', 'Price / L', 'Total Value (Rs)', 'Quality Status']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [16, 110, 68],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 32, halign: 'center' },
    },
    foot: [
      [
        '',
        'Total Summary',
        `${records.length} Records`,
        `${(summary?.totalLiters ?? records.reduce((s, r) => s + r.quantityLiters, 0)).toFixed(1)} L`,
        'Avg Rs 150/L',
        `Rs ${(summary?.revenue ?? records.reduce((s, r) => s + (r.totalAmount || r.quantityLiters * 150), 0)).toLocaleString()}`,
        'All Sessions',
      ],
    ],
    footStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
  });

  // Footer text
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dairy Farm Management System • Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  // Save the PDF
  const filename = `Milk_Report_${selectedDate}_${sessionFilter}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a WordPress WXR XML export file for direct import into WordPress (Tools -> Import -> WordPress)
 * or WordPress-ready TablePress / WP All Import CSV format.
 */
export function downloadMilkReportWordPress(
  records: MilkRecord[],
  summary: MilkDailySummary | null,
  selectedDate: string
) {
  // 1. Generate WordPress WXR (WordPress eXtended RSS) XML format
  const exportDate = new Date().toUTCString();
  
  let xmlItems = '';
  records.forEach((rec, idx) => {
    const animalCode = rec.animalTag || rec.animalId;
    const unitPrice = rec.pricePerLiter ?? 150;
    const totalAmount = rec.totalAmount !== undefined ? rec.totalAmount : Math.round(rec.quantityLiters * unitPrice);
    const postTitle = `Milk Session - ${animalCode} - ${rec.date} (${rec.session})`;
    const content = `Dairy Milk Record for Animal ${animalCode}. Date: ${rec.date}, Session: ${rec.session}, Volume: ${rec.quantityLiters} Liters, Price per Liter: Rs ${unitPrice}, Total Amount: Rs ${totalAmount}, Quality: ${rec.qualityStatus}.`;

    xmlItems += `
    <item>
      <title><![CDATA[${postTitle}]]></title>
      <link>http://dairyfarm.local/milk-record-${rec.id}/</link>
      <pubDate>${exportDate}</pubDate>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <guid isPermaLink="false">http://dairyfarm.local/?p=${1000 + idx}</guid>
      <description></description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
      <excerpt:encoded><![CDATA[${rec.quantityLiters} L recorded for ${animalCode} (${rec.session})]]></excerpt:encoded>
      <wp:post_id>${1000 + idx}</wp:post_id>
      <wp:post_date><![CDATA[${rec.date} 08:00:00]]></wp:post_date>
      <wp:post_date_gmt><![CDATA[${rec.date} 08:00:00]]></wp:post_date_gmt>
      <wp:comment_status><![CDATA[closed]]></wp:comment_status>
      <wp:ping_status><![CDATA[closed]]></wp:ping_status>
      <wp:post_name><![CDATA[milk-record-${rec.id}]]></wp:post_name>
      <wp:status><![CDATA[publish]]></wp:status>
      <wp:post_parent>0</wp:post_parent>
      <wp:menu_order>0</wp:menu_order>
      <wp:post_type><![CDATA[dairy_milk_log]]></wp:post_type>
      <wp:post_password><![CDATA[]]></wp:post_password>
      <wp:is_sticky>0</wp:is_sticky>
      <category domain="category" nicename="milk-records"><![CDATA[Milk Records]]></category>
      <wp:postmeta>
        <wp:meta_key><![CDATA[animal_id]]></wp:meta_key>
        <wp:meta_value><![CDATA[${animalCode}]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[milking_date]]></wp:meta_key>
        <wp:meta_value><![CDATA[${rec.date}]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[session]]></wp:meta_key>
        <wp:meta_value><![CDATA[${rec.session}]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[quantity_liters]]></wp:meta_key>
        <wp:meta_value><![CDATA[${rec.quantityLiters}]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[price_per_liter]]></wp:meta_key>
        <wp:meta_value><![CDATA[${unitPrice}]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[total_amount_rs]]></wp:meta_key>
        <wp:meta_value><![CDATA[${totalAmount}]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[quality_status]]></wp:meta_key>
        <wp:meta_value><![CDATA[${rec.qualityStatus}]]></wp:meta_value>
      </wp:postmeta>
    </item>`;
  });

  const wxrXml = `<?xml version="1.0" encoding="UTF-8" ?>
<!-- WordPress eXtended RSS (WXR) Export for Dairy Farm Milk Records -->
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
  <channel>
    <title>Dairy Farm Milk Report</title>
    <link>http://dairyfarm.local</link>
    <description>Daily Milk Log Export for WordPress</description>
    <pubDate>${exportDate}</pubDate>
    <language>en-US</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>http://dairyfarm.local</wp:base_site_url>
    <wp:base_blog_url>http://dairyfarm.local</wp:base_blog_url>
    <wp:author>
      <wp:author_id>1</wp:author_id>
      <wp:author_login><![CDATA[admin]]></wp:author_login>
      <wp:author_email><![CDATA[dairyfarm@example.com]]></wp:author_email>
      <wp:author_display_name><![CDATA[Farm Admin]]></wp:author_display_name>
      <wp:author_first_name><![CDATA[Farm]]></wp:author_first_name>
      <wp:author_last_name><![CDATA[Admin]]></wp:author_last_name>
    </wp:author>
    ${xmlItems}
  </channel>
</rss>`;

  const blob = new Blob([wxrXml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `WordPress_Milk_Report_${selectedDate}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a WordPress / TablePress / WP All Import compatible CSV file
 */
export function downloadMilkReportWordPressCSV(
  records: MilkRecord[],
  selectedDate: string
) {
  const headers = [
    'post_title',
    'post_date',
    'post_status',
    'post_type',
    'animal_id',
    'session',
    'quantity_liters',
    'price_per_liter',
    'total_amount_rs',
    'quality_status',
    'category',
  ];

  const rows = records.map((rec) => {
    const animalCode = rec.animalTag || rec.animalId;
    const unitPrice = rec.pricePerLiter ?? 150;
    const totalAmount = rec.totalAmount !== undefined ? rec.totalAmount : Math.round(rec.quantityLiters * unitPrice);
    const postTitle = `Milk Session - ${animalCode} - ${rec.date} (${rec.session})`;

    return [
      `"${postTitle}"`,
      `"${rec.date} 08:00:00"`,
      `"publish"`,
      `"dairy_milk_log"`,
      `"${animalCode}"`,
      `"${rec.session}"`,
      rec.quantityLiters.toFixed(1),
      unitPrice,
      totalAmount,
      `"${rec.qualityStatus}"`,
      `"Milk Records"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `WordPress_Milk_Report_${selectedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a multi-day Milk Summary Report in PDF format.
 */
export function downloadMilkSummaryReportPDF(
  report: MilkReport,
  dateRange: { from: string; to: string }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(16, 110, 68);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DAIRY FARM - MILK PRODUCTION SUMMARY REPORT', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    140,
    15
  );

  // Meta Information Bar
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 14, 32);
  doc.text(`Total Days: ${report.dailyBreakdown?.length || 0}`, 150, 32);

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 37, 182, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PRODUCTION', 20, 43);
  doc.text('DAILY AVERAGE', 70, 43);
  doc.text('ESTIMATED REVENUE', 125, 43);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 110, 68);
  doc.text(`${(report.totalLiters || 0).toLocaleString()} Liters`, 20, 52);

  doc.setTextColor(15, 23, 42);
  doc.text(`${(report.averageDailyLiters || 0).toFixed(1)} L/day`, 70, 52);

  doc.setTextColor(16, 110, 68);
  doc.text(`Rs ${(report.totalRevenue || 0).toLocaleString()}`, 125, 52);

  // Table
  const tableRows = (report.dailyBreakdown || []).map((d) => [
    d.date,
    `${(d.totalLiters || 0).toLocaleString()} L`,
    `${(d.averagePerCow || 0).toFixed(1)} L`,
    d.fatPercent ? `${d.fatPercent.toFixed(2)}%` : '3.80%',
    d.snfPercent ? `${d.snfPercent.toFixed(2)}%` : '8.80%',
    `Rs ${(d.revenue || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 64,
    head: [['Date', 'Total Volume', 'Avg / Cow', 'Fat %', 'SNF %', 'Revenue (Rs)']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [16, 110, 68],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    foot: [
      [
        'Total Summary',
        `${(report.totalLiters || 0).toLocaleString()} L`,
        `${(report.averageDailyLiters || 0).toFixed(1)} L`,
        '-',
        '-',
        `Rs ${(report.totalRevenue || 0).toLocaleString()}`,
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
  });

  doc.save(`Milk_Summary_Report_${dateRange.from}_to_${dateRange.to}.pdf`);
}

/**
 * Downloads a multi-day Milk Summary Report for WordPress.
 */
export function downloadMilkSummaryReportWordPress(
  report: MilkReport,
  dateRange: { from: string; to: string }
) {
  const exportDate = new Date().toUTCString();
  let xmlItems = '';

  (report.dailyBreakdown || []).forEach((d, idx) => {
    const postTitle = `Milk Summary - ${d.date}`;
    const content = `Daily Milk Total for ${d.date}: ${d.totalLiters} Liters across milking herd. Daily average per cow: ${d.averagePerCow} L. Estimated Farm Gate Revenue: Rs ${d.revenue}.`;

    xmlItems += `
    <item>
      <title><![CDATA[${postTitle}]]></title>
      <link>http://dairyfarm.local/milk-summary-${d.date}/</link>
      <pubDate>${exportDate}</pubDate>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <guid isPermaLink="false">http://dairyfarm.local/?p=${2000 + idx}</guid>
      <content:encoded><![CDATA[${content}]]></content:encoded>
      <wp:post_id>${2000 + idx}</wp:post_id>
      <wp:post_date><![CDATA[${d.date} 18:00:00]]></wp:post_date>
      <wp:post_status><![CDATA[publish]]></wp:post_status>
      <wp:post_type><![CDATA[dairy_milk_summary]]></wp:post_type>
      <category domain="category" nicename="milk-summaries"><![CDATA[Milk Summaries]]></category>
      <wp:postmeta>
        <wp:meta_key><![CDATA[report_date]]></wp:meta_key>
        <wp:meta_value><![CDATA[${d.date}]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[total_liters]]></wp:meta_key>
        <wp:meta_value><![CDATA[${d.totalLiters}]]></wp:meta_value>
      </wp:postmeta>
      <wp:postmeta>
        <wp:meta_key><![CDATA[revenue_rs]]></wp:meta_key>
        <wp:meta_value><![CDATA[${d.revenue}]]></wp:meta_value>
      </wp:postmeta>
    </item>`;
  });

  const wxrXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
  <channel>
    <title>Dairy Farm Milk Summary Report</title>
    <link>http://dairyfarm.local</link>
    <description>Milk Summary Report from ${dateRange.from} to ${dateRange.to}</description>
    <pubDate>${exportDate}</pubDate>
    <language>en-US</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    ${xmlItems}
  </channel>
</rss>`;

  const blob = new Blob([wxrXml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `WordPress_Milk_Summary_${dateRange.from}_to_${dateRange.to}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
