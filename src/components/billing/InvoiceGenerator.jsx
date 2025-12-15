// src/components/billing/InvoiceGenerator.js
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

// 🟢 Fonction pour formater les nombres avec un espace comme séparateur de milliers
function formatNumberWithSpace(n) {
  if (typeof n !== "number") n = Number(n) || 0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function generateInvoicePDF(invoiceData) {
  const doc = new jsPDF();

  // --- Logo & entête ---
  doc.addImage(logo, "PNG", 14, 10, 50, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "BP 9342 OUAGA 06 | Tel: 25 50 81 89 / 70 00 80 24 | Mail: contact@baticom.bf",
    105,
    35,
    { align: "center" }
  );
  doc.line(14, 38, 196, 38);

  // --- Date ---
  const today = new Date().toLocaleDateString("fr-FR");
  doc.setFontSize(11);
  doc.text(`Ouagadougou, le ${today}`, 196, 46, { align: "right" });

  // --- Titre ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("FACTURE", 105, 62, { align: "center" });

  // --- Infos client ---
  let y = 74;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(invoiceData.invoiceNumber, 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Doit : ${invoiceData.clientName}`, 14, y + 6);

  let infoY = y + 12;
  doc.text(`${invoiceData.clientAddress}, RCCM: ${invoiceData.clientRCCM}`, 25, infoY);
  infoY += 5;
  doc.text(`IFU: ${invoiceData.clientIFU}  Tel: ${invoiceData.clientTel}`, 25, infoY);
  infoY += 5;
  doc.text(`Objet: ${invoiceData.objet}`, 14, infoY);
  infoY += 5;

  // 🔹 Période : deux dates
  if (invoiceData.periodeDebut && invoiceData.periodeFin) {
    doc.text(`Période: du ${invoiceData.periodeDebut} au ${invoiceData.periodeFin}`, 14, infoY);
  } else {
    doc.text(`Période: ${invoiceData.periode || ""}`, 14, infoY);
  }
  infoY += 10;

  // --- Tableau Résumé ---
  let resumeTotal = 0;
  if (invoiceData.summaryData?.length) {
    doc.setFont("helvetica", "bold");
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
      styles: { fontSize: 10 },
      columnStyles: { 
        0: { cellWidth: 120 },
        1: { cellWidth: 60, halign: "right", valign: "middle" }
      },
    });

    const totalRow = invoiceData.summaryData.find(r => r.label === "TOTAL HTVA");
    if (totalRow) resumeTotal = Number(totalRow.amount) || 0;

    infoY = doc.lastAutoTable.finalY + 10;
  }

  // --- Tableau Détails ---
  if (invoiceData.itemsData?.length) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 128);
    doc.text("Détails contractuels", 14, infoY);
    infoY += 5;

    autoTable(doc, {
      startY: infoY,
      head: [["Description", "Prix Unitaire (FCFA)", "Quantité", "Total (FCFA)"]],
      body: invoiceData.itemsData.map(row => [
        row.description,
        formatNumberWithSpace(Number(row.unitPrice)),
        formatNumberWithSpace(Number(row.quantity)),
        formatNumberWithSpace(Number(row.total))
      ]),
      theme: "grid",
      headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: "right", valign: "middle" },
        2: { cellWidth: 30, halign: "right", valign: "middle" },
        3: { cellWidth: 40, halign: "right", valign: "middle" },
      },
    });

    infoY = doc.lastAutoTable.finalY + 10;
  }

  // --- Texte final HTVA ---
  if (resumeTotal > 0) {
    const totalInWords = convertNumberToWords(resumeTotal);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 128);
    doc.text("Arrêtée la présente facture à la somme HTVA de :", 14, infoY);

    infoY += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const montantText = `${totalInWords.charAt(0).toUpperCase() + totalInWords.slice(1)} (${formatNumberWithSpace(resumeTotal)}) francs CFA.`;
    const lines = doc.splitTextToSize(montantText, 180);
    doc.text(lines, 11, infoY);

    // --- Signature Directeur ---
    infoY += lines.length * 6 + 12;
    doc.setFont("helvetica", "bold");
    doc.text("Le Directeur", 160, infoY);
    infoY += 23;
    doc.text("KERE Leger", 160, infoY);
  }

  return doc;
}
