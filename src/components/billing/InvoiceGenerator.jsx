import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo_entete.png";

// 🧠 Fonction utilitaire : nombre → lettres (français)
function convertNumberToWords(n) {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
  const tens = ["","dix","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];

  function underThousand(num) {
    let words = "";
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    if (hundreds > 0) {
      words += hundreds === 1 ? "cent" : units[hundreds] + " cent";
      if (remainder === 0 && hundreds > 1) words += "s";
      if (remainder > 0) words += " ";
    }
    if (remainder > 0) words += underHundred(remainder);
    return words.trim();
  }

  function underHundred(num) {
    if (num < 17) return units[num];
    if (num < 20) return "dix-" + units[num - 10];
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    let word = tens[ten];
    if (ten === 7 || ten === 9) {
      word += "-" + units[10 + unit];
    } else if (unit === 1 && ten !== 8) {
      word += "-et-un";
    } else if (unit > 0) {
      word += "-" + units[unit];
    }
    if (ten === 8 && unit === 0) word += "s";
    return word;
  }

  if (n === 0) return "zéro";
  if (n < 0) return "moins " + convertNumberToWords(-n);

  let words = "";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;

  if (millions > 0) {
    words += convertNumberToWords(millions) + (millions > 1 ? " millions " : " million ");
  }
  if (thousands > 0) {
    words += (thousands === 1 ? "mille " : convertNumberToWords(thousands) + " mille ");
  }
  if (remainder > 0) words += underThousand(remainder);

  return words.trim();
}

// 🟢 Formatage des nombres
function formatNumberWithSpace(n) {
  if (typeof n !== "number") n = Number(n) || 0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ================================
// Générateur de facture PDF
// ================================
export function generateInvoicePDF(invoiceData) {
  const doc = new jsPDF();

  // --- Logo & entête ---
  doc.addImage(logo, "PNG", 14, 10, 50, 20);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(
    "BP 9342 OUAGA 06 | Tel: 25 50 81 89 / 70 00 80 24 | Mail: contact@baticom.bf",
    105,
    35,
    { align: "center" }
  );
  doc.line(2, 38, 208, 38);

  // --- Date ---
  const today = new Date().toLocaleDateString("fr-FR");
  doc.setFontSize(11);
  doc.text(`Ouagadougou, le ${today}`, 196, 46, { align: "right" });

  // --- Infos client ---
  let y = 74;
  y -= 6;

  const invoiceNumber = invoiceData.invoiceNumber || "N° en cours de génération";

  doc.setFontSize(12);
  doc.setFont("times", "bold");
  doc.text(invoiceNumber, 14, y);
  doc.line(14, y + 1, 14 + doc.getTextWidth(invoiceNumber), y + 1);

  // Doit
  doc.setFontSize(11);
  doc.text("Doit", 14, y + 6);
  doc.line(14, y + 7, 14 + doc.getTextWidth("Doit"), y + 7);
  doc.setFont("times", "normal");
  doc.text(`: ${invoiceData.clientName || ""}`, 24, y + 6);

  let infoY = y + 12;

  // Adresse + RCCM
  doc.setFont("times", "bold");
  doc.text("Adresse", 14, infoY);
  doc.line(14, infoY + 1, 14 + doc.getTextWidth("Adresse"), infoY + 1);
  doc.setFont("times", "normal");
  doc.text(`: ${invoiceData.clientAddress || ""}`, 32, infoY);

  doc.setFont("times", "bold");
  doc.text("RCCM", 100, infoY);
  doc.line(100, infoY + 1, 100 + doc.getTextWidth("RCCM"), infoY + 1);
  doc.setFont("times", "normal");
  doc.text(`: ${invoiceData.clientRCCM || ""}`, 113, infoY);

  infoY += 6;

  // IFU + Téléphone
  doc.setFont("times", "bold");
  doc.text("IFU", 14, infoY);
  doc.line(14, infoY + 1, 14 + doc.getTextWidth("IFU"), infoY + 1);
  doc.setFont("times", "normal");
  doc.text(`: ${invoiceData.clientIFU || ""}`, 24, infoY);

  doc.setFont("times", "bold");
  doc.text("Tél", 50, infoY);
  doc.line(50, infoY + 1, 50 + doc.getTextWidth("Tél"), infoY + 1);
  doc.setFont("times", "normal");
  doc.text(`: ${invoiceData.clientTel || ""}`, 58, infoY);

  infoY += 6;

  // Objet
  doc.setFont("times", "bold");
  doc.text("Objet", 14, infoY);
  doc.line(14, infoY + 1, 14 + doc.getTextWidth("Objet"), infoY + 1);
  doc.setFont("times", "normal");
  doc.text(`: ${invoiceData.description || "-"}`, 30, infoY);

  infoY += 8;

  // Période
  doc.text(`Période: ${invoiceData.periode || ""}`, 14, infoY);
  infoY += 16;

  // --- Tableau Résumé ---
  let resumeTotal = 0;
  if (invoiceData.summaryData?.length) {
    doc.setFont("times", "bold");
    doc.setTextColor(0, 0, 128);
    doc.text("Détails de paiement", 14, infoY);
    infoY += 5;

    autoTable(doc, {
      startY: infoY,
      head: [["Libellé", "Montant (FCFA)"]],
      body: invoiceData.summaryData.map(row => [
        row.label,
        formatNumberWithSpace(Number(row.amount))
      ]),
      theme: "grid",
      headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: "bold" },
      styles: { font: "times", fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 60, halign: "right" }
      },
    });

    const totalRow = invoiceData.summaryData.find(r => r.label === "TOTAL HTVA");
    if (totalRow) resumeTotal = Number(totalRow.amount) || 0;

    infoY = doc.lastAutoTable.finalY + 10;
  }

  // --- Tableau itemsData ---
  if (invoiceData.itemsData?.length) {
    doc.setFont("times", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Détails des articles / services", 14, infoY);
    infoY += 5;

    autoTable(doc, {
      startY: infoY,
      head: [["Description", "Quantité", "Prix Unitaire", "Total"]],
      body: invoiceData.itemsData.map(item => [
        item.description,
        item.quantity,
        formatNumberWithSpace(Number(item.unitPrice)),
        formatNumberWithSpace(Number(item.total))
      ]),
      theme: "grid",
      headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: "bold" },
      styles: { font: "times", fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 40, halign: "right" },
      },
    });

    infoY = doc.lastAutoTable.finalY + 10;
  }

  // --- Signature ---
  if (resumeTotal > 0) {
    const totalInWords = convertNumberToWords(resumeTotal);
    doc.setFont("times", "bold");
    doc.text("Arrêtée la présente facture à la somme HTVA de :", 14, infoY);
    infoY += 6;

    doc.setFont("times", "normal");
    const text = `${totalInWords.charAt(0).toUpperCase() + totalInWords.slice(1)} (${formatNumberWithSpace(resumeTotal)}) francs CFA.`;
    doc.text(doc.splitTextToSize(text, 180), 11, infoY);

    infoY += 13;
    doc.setFont("times", "bold");
    doc.text("Le Directeur", 160, infoY);
    infoY += 20;
    doc.text("KERE Leger", 160, infoY);
  }

  // --- Pied de page ---
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(180);
  doc.line(2, pageHeight - 18, 208, pageHeight - 18);

  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(
    "RCCM: BF OUA 2024 M 14724 | IFU: 00084263L | COMPTE VISTA BANK : NOBF023-01053-031142800193-49",
    105,
    pageHeight - 12,
    { align: "center" }
  );

  return doc;
}
