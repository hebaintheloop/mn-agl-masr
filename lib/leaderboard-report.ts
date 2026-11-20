import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type LeaderboardRow = { full_name: string; points: number };

export async function downloadLeaderboardXlsx(rows: LeaderboardRow[]) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("المتصدرون", { views: [{ rightToLeft: true }] });
  sheet.addRow(["طلاب من أجل مصر، كلية العلوم، جامعة القاهرة"]);
  sheet.mergeCells("A1:C1");
  sheet.addRow(["الترتيب", "الاسم بالكامل", "النقاط"]);
  rows.forEach((r, i) => sheet.addRow([i + 1, r.full_name, r.points]));
  sheet.columns = [{ width: 12 }, { width: 34 }, { width: 14 }];
  sheet.eachRow((row, n) => row.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: n <= 2, color: { argb: n === 2 ? "FFFFFFFF" : "FF202020" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: n === 2 ? "FFCE1126" : n % 2 ? "FFF7F7F7" : "FFFFFFFF" } };
    cell.alignment = { horizontal: "right", vertical: "middle" };
  }));
  const bytes = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a"); a.href = url; a.download = "mn-agl-masr-leaderboard.xlsx"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function downloadLeaderboardPdf(rows: LeaderboardRow[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFontSize(16); doc.text("Mn Agl Masr - Faculty of Science", 196, 16, { align: "right" });
  autoTable(doc, {
    startY: 24,
    head: [["النقاط", "الاسم بالكامل", "الترتيب"]],
    body: rows.map((r, i) => [String(r.points), r.full_name, String(i + 1)]),
    styles: { fontSize: 11, halign: "right" },
    headStyles: { fillColor: [206, 17, 38], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [247, 247, 247] },
  });
  doc.save("mn-agl-masr-leaderboard.pdf");
}
