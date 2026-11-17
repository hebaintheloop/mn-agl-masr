import ExcelJS from "exceljs";
import {
  cairoReportDate,
  reportFilename,
  rosterViews,
  type RosterReport,
} from "./roster-report";

export async function rosterWorkbook(report: RosterReport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "طلاب من أجل مصر، كلية العلوم، جامعة القاهرة";
  workbook.created = new Date(report.generatedAt);
  const sheet = workbook.addWorksheet(rosterViews[report.view], {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 7 }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:7",
    },
  });
  const last = report.headers.length;
  const metadata = [
    "طلاب من أجل مصر، كلية العلوم، جامعة القاهرة",
    report.eventTitle,
    `${rosterViews[report.view]}، عدد النتائج: ${report.rows.length}`,
    `موعد الفعالية بتوقيت القاهرة: ${cairoReportDate(report.startAt)}`,
    `تاريخ التنزيل: ${cairoReportDate(report.generatedAt)}، البحث: ${report.query || "بدون بحث"}`,
  ];
  metadata.forEach((text, i) => {
    sheet.mergeCells(i + 1, 1, i + 1, last);
    const cell = sheet.getCell(i + 1, 1);
    cell.value = text;
    cell.font = {
      name: "Arial",
      size: i === 1 ? 16 : 11,
      bold: i < 3,
      color: { argb: i < 2 ? "FFCE1126" : "FF222222" },
    };
    cell.alignment = {
      horizontal: "right",
      vertical: "middle",
      wrapText: true,
      readingOrder: "rtl",
    };
    sheet.getRow(i + 1).height = i === 1 ? 48 : 32;
  });
  sheet.addRow([]);
  sheet.addRow(report.headers);
  report.rows.forEach((values) => sheet.addRow(values));
  sheet.autoFilter = {
    from: { row: 7, column: 1 },
    to: { row: 7 + report.rows.length, column: last },
  };
  sheet.columns.forEach((column, i) => {
    const title = report.headers[i];
    column.width =
      title.includes("العذر") || title.includes("التسهيلات")
        ? 55
        : i === 0
          ? 30
          : 23;
  });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 7) return;
    row.height =
      rowNumber === 7
        ? 32
        : Math.min(
            409,
            Math.max(
              38,
              ...report.headers.map((_, i) => {
                const text = String(row.getCell(i + 1).value ?? "");
                const width = Number(sheet.getColumn(i + 1).width) || 23;
                return (
                  text
                    .split("\n")
                    .reduce(
                      (n, line) =>
                        n + Math.max(1, Math.ceil(line.length / (width * 0.8))),
                      0,
                    ) *
                    17 +
                  12
                );
              }),
            ),
          );
    row.eachCell((cell) => {
      // Values are always string cells, never interpreted as formulas or numbers.
      cell.numFmt = "@";
      cell.font = {
        name: "Arial",
        size: 11,
        bold: rowNumber === 7,
        color: { argb: rowNumber === 7 ? "FFFFFFFF" : "FF202020" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb:
            rowNumber === 7
              ? "FFCE1126"
              : rowNumber % 2
                ? "FFF5F5F5"
                : "FFFFFFFF",
        },
      };
      cell.alignment = {
        horizontal: "right",
        vertical: "top",
        wrapText: true,
        readingOrder: "rtl",
      };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE2E2E2" } } };
    });
  });
  sheet.headerFooter.oddFooter = "&Rصفحة &P من &N";
  return workbook;
}

export async function downloadExcel(report: RosterReport) {
  const workbook = await rosterWorkbook(report);
  const bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = reportFilename(report, "xlsx");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
