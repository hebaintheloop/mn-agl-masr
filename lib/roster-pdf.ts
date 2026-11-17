import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  cairoReportDate,
  reportFilename,
  rosterViews,
  type RosterReport,
} from "./roster-report";

let font: Promise<string> | undefined;
function arabicFont() {
  return (font ||= fetch("/assets/Amiri-Regular.ttf")
    .then(async (r) => {
      if (!r.ok) throw new Error("مش قادرين نحمّل خط التقرير. جرّب تاني.");
      const bytes = new Uint8Array(await r.arrayBuffer());
      let value = "";
      for (let i = 0; i < bytes.length; i += 8192)
        value += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(value);
    })
    .catch((e) => {
      font = undefined;
      throw e;
    }));
}

export async function rosterPdf(report: RosterReport) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  doc.addFileToVFS("Amiri-Regular.ttf", await arabicFont());
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  doc.setFont("Amiri", "normal");
  doc.setR2L(true);
  doc.setLanguage("ar-EG");
  doc.setProperties({
    title: `${report.eventTitle}، ${rosterViews[report.view]}`,
    author: "طلاب من أجل مصر، كلية العلوم، جامعة القاهرة",
  });
  const width = doc.internal.pageSize.getWidth(),
    margin = 14,
    usable = width - margin * 2;
  doc.setFontSize(17);
  const title: string[] = doc.splitTextToSize(report.eventTitle, usable);
  doc.setFontSize(11);
  const info: string[] = doc.splitTextToSize(
    `${rosterViews[report.view]}، عدد النتائج: ${report.rows.length}، موعد الفعالية: ${cairoReportDate(report.startAt)}${report.query ? "، البحث: " + report.query : ""}`,
    usable,
  );
  const infoY = 19 + title.length * 7;
  const tableY = infoY + info.length * 5 + 7;
  // Reverse columns so the first column starts on the right. Keep identifiers LTR.
  const headers = [...report.headers].reverse();
  const body = report.rows.map((row) => [...row].reverse());
  const weights = headers.map((h) =>
    h.includes("التسهيلات") || h.includes("العذر")
      ? 3
      : h === "الاسم"
        ? 1.8
        : h === "الهاتف"
          ? 1.4
          : h === "كود الطالب"
            ? 1.2
            : 1.3,
  );
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const columnStyles = Object.fromEntries(
    weights.map((w, i) => [i, { cellWidth: (usable * w) / weightTotal }]),
  );
  autoTable(doc, {
    head: [headers],
    body,
    startY: tableY,
    margin: { left: margin, right: margin, top: tableY, bottom: 17 },
    theme: "grid",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: {
      font: "Amiri",
      fontStyle: "normal",
      fontSize: 11,
      halign: "right",
      valign: "top",
      cellPadding: 2.8,
      lineColor: [221, 221, 221],
      lineWidth: 0.15,
      textColor: [25, 25, 25],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [206, 17, 38],
      textColor: [255, 255, 255],
      fontStyle: "normal",
    },
    alternateRowStyles: { fillColor: [247, 247, 247] },
    columnStyles,
    willDrawPage: () => {
      doc.setR2L(true);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        "طلاب من أجل مصر، كلية العلوم، جامعة القاهرة",
        width - margin,
        10,
        { align: "right", isInputVisual: false, isInputRtl: false },
      );
      doc.setFontSize(17);
      doc.setTextColor(25);
      doc.text(title, width - margin, 19, {
        align: "right",
        isInputVisual: false,
        isInputRtl: false,
        lineHeightFactor: 1.15,
      });
      doc.setFontSize(11);
      doc.setTextColor(80);
      doc.text(info, width - margin, infoY, {
        align: "right",
        isInputVisual: false,
        isInputRtl: false,
        lineHeightFactor: 1.15,
      });
    },
    willDrawCell: (data) => {
      doc.setR2L(
        !(
          data.section === "body" &&
          ["كود الطالب", "الهاتف"].includes(headers[data.column.index])
        ),
      );
    },
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setR2L(true);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`صفحة ${page} من ${pages}`, width - margin, 201, {
      align: "right",
      isInputVisual: false,
      isInputRtl: false,
    });
    doc.text(
      `تاريخ التنزيل بتوقيت القاهرة: ${cairoReportDate(report.generatedAt)}`,
      margin,
      201,
      { align: "left", isInputVisual: false, isInputRtl: false },
    );
  }
  return doc;
}

export async function downloadPdf(report: RosterReport) {
  const doc = await rosterPdf(report);
  doc.save(reportFilename(report, "pdf"));
}
