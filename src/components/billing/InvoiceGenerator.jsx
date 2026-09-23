import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo_entete.png";

// ===============================
// Fonctions utilitaires
// ===============================
function convertNumberToWords(n) {
  if (n === 0) return "zéro";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

  function underHundred(num) {
    if (num < 17) return units[num];
    if (num < 20) return "dix-" + units[num - 10];
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    let word = tens[ten];
    if (ten === 7 || ten === 9) word += "-" + units[10 + unit];
    else if (unit === 1 && ten !== 8) word += "-et-un";
    else if (unit > 0) word += "-" + units[unit];
    if (ten === 8 && unit === 0) word += "s";
    return word;
  }

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
    return words;
  }

  let words = "";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;
  if (millions > 0) words += convertNumberToWords(millions) + (millions > 1 ? " millions " : " million ");
  if (thousands > 0) words += (thousands === 1 ? "mille " : convertNumberToWords(thousands) + " mille ");
  if (remainder > 0) words += underThousand(remainder);
  return words.trim() || "";
}

function formatNumberWithSpace(n) {
  const val = typeof n === "number" ? n : Number(n) || 0;
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ===============================
// Générateur PDF Facture
// ===============================
export function generateInvoicePDF(invoiceData) {
  if (!invoiceData) return;
  const doc = new jsPDF();

  // --- Entête ---
  doc.addImage(logo, "PNG", 14, 10, 50, 20);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("BP 9342 OUAGA 06 | Tel: 25 50 81 89 / 70 00 80 24 | Mail: contact@baticom.bf", 105, 35, { align: "center" });
  doc.line(10, 38, 200, 38);

  const today = new Date().toLocaleDateString("fr-FR");
  doc.setFontSize(11);
  doc.text(`Ouagadougou, le ${today}`, 196, 46, { align: "right" });

  let currentY = 60;
  doc.setFont("times", "bold");
  const invoiceNo = `Facture N° ${invoiceData.invoiceNumber || ""}`;
  doc.text(invoiceNo, 14, currentY);
  doc.line(14, currentY + 1, 14 + doc.getTextWidth(invoiceNo), currentY + 1);

  currentY += 10;
  doc.text("Doit", 14, currentY);
  doc.line(14, currentY + 1, 14 + doc.getTextWidth("Doit"), currentY + 1);
  doc.setFont("times", "normal");
  doc.text(`: ${invoiceData.clientName || ""}`, 26, currentY);

  let infoY = currentY + 8;
  const drawInfo = (label, value, x, y, valueOffset) => {
    doc.setFont("times", "bold");
    doc.text(label, x, y);
    doc.line(x, y + 1, x + doc.getTextWidth(label), y + 1);
    doc.setFont("times", "normal");
    doc.text(`: ${value || ""}`, x + valueOffset, y);
  };

  drawInfo("Adresse", invoiceData.clientAddress, 14, infoY, 18);
  drawInfo("RCCM", invoiceData.clientRCCM, 100, infoY, 15);
  infoY += 7;
  drawInfo("IFU", invoiceData.clientIFU, 14, infoY, 10);
  drawInfo("Tél", invoiceData.clientTel, 50, infoY, 8);
  infoY += 8;
  drawInfo("Objet", invoiceData.description, 14, infoY, 12);
  infoY += 8;
  doc.text(`Période : ${invoiceData.periode || ""}`, 14, infoY);

  // --- I. TABLEAU RÉSUMÉ ---
let nextTableY = infoY + 10;
doc.setFont("times", "bold");
doc.text("I.", 10, nextTableY);

if (invoiceData.summaryData?.length > 0) {
  autoTable(doc, {
    startY: nextTableY - 4,
    theme: "grid",
    styles: { 
      font: "times", 
      fontSize: 10, 
      cellPadding: 2, 
      lineColor: [0, 0, 0], 
      lineWidth: 0.2,
      textColor: [60, 60, 60] // Gris foncé pour les lignes normales
    },
    columnStyles: { 
      0: { cellWidth: 'auto' }, 
      1: { halign: "right", cellWidth: 35 } 
    },
    head: [[{ 
      content: "Détails de Paiements", 
      colSpan: 2, 
      styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } 
    }]],
    body: invoiceData.summaryData.map(r => [r.label, formatNumberWithSpace(r.amount)]),
    didParseCell: (data) => {
      // Si la cellule contient "TOTAL"
      if (data.cell.text[0] && data.cell.text[0].includes("TOTAL")) {
        data.cell.fontStyle = 'bold';
        data.cell.styles.textColor = [0, 0, 0]; // Noir pur (plus sombre)
      }

      // Si c'est spécifiquement la ligne HTVA, on peut aussi ajouter un léger fond
      if (data.cell.text[0] && data.cell.text[0].includes("TOTAL HTVA")) {
        data.cell.styles.fillColor = [245, 245, 245]; // Très léger gris pour l'accentuer
      }
    }
  });
  nextTableY = doc.lastAutoTable.finalY + 12;
}

  // --- II. TABLEAU DÉTAILS ---
doc.setFont("times", "bold");
doc.text("II.", 10, nextTableY);

if (invoiceData.itemsData?.length > 0) {
  autoTable(doc, {
    startY: nextTableY - 4,
    theme: "grid",
    styles: { font: "times", fontSize: 9, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
    
    // CONFIGURATION DES COLONNES
    columnStyles: { 
      0: { halign: "left" },           // Descriptions : à gauche
      1: { halign: "center", cellWidth: 35 }, // Prix Unitaire : CENTRÉ
      2: { halign: "center", cellWidth: 25 }, // Quantités : CENTRÉ
      3: { halign: "right", cellWidth: 35 }   // Total : à droite
    },

    head: [
      [{ content: "Détails Contractuels", colSpan: 4, styles: { halign: 'center', fillColor: [240, 240, 240] } }],
      ['Descriptions Travaux', 'Prix Unitaire (XOF)', 'Quantités', 'Total (XOF)']
    ],
    body: invoiceData.itemsData.map(item => [
      item.description || item.label,
      formatNumberWithSpace(item.unitPrice),
      item.quantity,
      formatNumberWithSpace(item.total)
    ])
  });
  nextTableY = doc.lastAutoTable.finalY + 6;
}

  // --- Signature et Arrêté ---
  const totalRow = invoiceData.summaryData?.find(r => r.label && r.label.includes("TOTAL HTVA"));
  const totalVal = totalRow ? Number(totalRow.amount) : 0;

  if (totalVal > 0) {
    doc.setFont("times", "normal");
    doc.text("Arrêtée la présente facture à la somme HTVA de :", 14, nextTableY);
    
    doc.setFont("times", "bold");
    const words = convertNumberToWords(totalVal);
    const fullText = `${words.toUpperCase()} (${formatNumberWithSpace(totalVal)}) FRANCS CFA.`;
    
    const splitWords = doc.splitTextToSize(fullText, 180);
    doc.text(splitWords, 14, nextTableY + 6);

    doc.text("Le Directeur", 160, nextTableY + 25, { align: "center" });
    doc.text("KERE Leger", 160, nextTableY + 45, { align: "center" });
  }
  
// --- Pied de page ---
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.line(2, pageHeight - 18, 208, pageHeight - 18);
  doc.setFontSize(9);
  doc.text(
    "RCCM: BF OUA 2024 M 14724 | IFU: 00084263L | COMPTE VISTA BANK : NOBF023-01053-031142800193-49",
    105,
    pageHeight - 12,
    { align: "center" }
  );
  
  return doc;
}