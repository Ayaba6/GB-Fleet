// src/components/billing/InvoiceGeneratorGTS.jsx
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo_gts.png";

/* =========================
   UTILS
========================= */

const parseDecimal = (value) => {
  if (!value) return 0;
  return Number(String(value).replace(",", "."));
};

function convertNumberToWords(n) {
  const units = ["","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
  const tens = ["","dix","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];

  function underHundred(num){
    if(num<17) return units[num];
    if(num<20) return "dix-"+units[num-10];
    const ten = Math.floor(num/10);
    const unit = num%10;
    let word = tens[ten];
    if(ten===7||ten===9) word+="-"+units[10+unit];
    else if(unit===1 && ten!==8) word+="-et-un";
    else if(unit>0) word+="-"+units[unit];
    if(ten===8 && unit===0) word+="s";
    return word;
  }

  function underThousand(num){
    let words="";
    const hundreds = Math.floor(num/100);
    const remainder = num % 100;
    if(hundreds>0){
      words += hundreds===1?"cent":units[hundreds]+" cent";
      if(remainder===0 && hundreds>1) words+="s";
      if(remainder>0) words+=" ";
    }
    if(remainder>0) words+=underHundred(remainder);
    return words.trim();
  }

  if(n===0) return "zéro";
  const absN = Math.abs(Math.round(n));
  let words="";
  const millions = Math.floor(absN/1_000_000);
  const thousands = Math.floor((absN%1_000_000)/1_000);
  const remainder = absN%1000;

  if(millions>0) words+=convertNumberToWords(millions)+(millions>1?" millions ":" million ");
  if(thousands>0) words+=(thousands===1?"mille ":convertNumberToWords(thousands)+" mille ");
  if(remainder>0) words+=underThousand(remainder);

  return words.trim();
}

function formatNumberWithSpace(n){
  if(typeof n!=="number") n = Number(n)||0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g," ");
}

/* =========================
   GÉNÉRATEUR PDF GTS
========================= */
export const generateInvoicePDFGTS = (invoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  /* ===== LOGO EN FILIGRANE ===== */
  if (logo) {
    doc.saveGraphicsState?.();
    if (doc.setGState) {
      doc.setGState(new doc.GState({ opacity: 0.1 }));
    }
    doc.addImage(logo, "PNG", (pageWidth-120)/2, (pageHeight-120)/2, 120, 120);
    doc.restoreGraphicsState?.();
  }

  /* ===== LOGO HAUT ===== */
  if(logo) doc.addImage(logo,"PNG",14,10,50,20);

  /* ===== MISSIONS ===== */
  const missions = ["Intégration de solutions","Informatique - Télécom","Energie - BTP","Etude et réalisation de projets","Negos-Divers"];
  let yMission = 14;
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  missions.forEach(m => {
    doc.circle(158, yMission-1.1, 0.7, "F"); 
    doc.text(m, 162, yMission);
    yMission += 4.5; 
  });

  const headerBottomY = Math.max(30, yMission) + 1;
  doc.setDrawColor(0,0,128);
  doc.setLineWidth(0.6);
  doc.line(1, headerBottomY, pageWidth-1, headerBottomY);

  /* ===== DATE ===== */
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Ouagadougou, le ${new Date().toLocaleDateString("fr-FR",{year:"numeric",month:"long",day:"numeric"})}`, pageWidth-11, headerBottomY+7, { align: "right" });

  /* ===== INFOS CLIENT ===== */
  let y = 75;
  doc.setFont("times", "bold");
  const factureText = `Facture ${invoiceData.invoiceNumber || "-"}`;
  doc.text(factureText, 14, y);
  doc.line(14, y + 1, 14 + doc.getTextWidth(factureText), y + 1);
  
  y += 6;
  const writeLabel = (label, value, x, yPos, maxWidth = 90) => {
    doc.setFont("times", "bold");
    const w = doc.getTextWidth(label);
    if(label) {
      doc.text(label, x, yPos);
      doc.line(x, yPos + 1, x + w, yPos + 1);
    }
    doc.setFont("times", "normal");
    doc.text(`: ${value || "-"}`, x + w + 2, yPos, { maxWidth });
  };

  writeLabel("Doit", invoiceData.clientName, 14, y);
  y += 6;
  writeLabel("", invoiceData.clientAddress, 21, y);
  writeLabel("RCCM", invoiceData.clientRCCM, 90, y);
  y += 6;
  writeLabel("IFU", invoiceData.clientIFU, 14, y);
  writeLabel("Tél", invoiceData.clientTel, 45, y);
  writeLabel("Régime Fiscal", invoiceData.clientRegimeFiscal, 90, y);
  y += 6;
  writeLabel("Division Fiscale", invoiceData.clientDivisionFiscale, 14, y);
  writeLabel("Adresse", invoiceData.clientZone, 60, y);
  y += 10;
  writeLabel("Objet", invoiceData.description, 14, y);
  y += 10;

  /* ===== TABLEAU ===== */
  if(invoiceData.summaryData?.length){
    // Modification de l'en-tête ici
    const tableHead = ["N°","Immatriculation","Bon","Date","Quantité (T)","Tarif (33000)","Retenue 5%","Montant net"];
    
    // Totaux
    const totQ = invoiceData.summaryData.reduce((acc, r) => acc + parseDecimal(r.quantite), 0);
    const totT = invoiceData.summaryData.reduce((acc, r) => acc + (Number(r.tarif) || 0), 0);
    const totR = invoiceData.summaryData.reduce((acc, r) => acc + (Number(r.retenue) || 0), 0);
    const totN = invoiceData.summaryData.reduce((acc, r) => acc + (Number(r.montantNet) || 0), 0);

    const tableBody = invoiceData.summaryData.map((r,i)=>[
      i+1, 
      r.immatriculation||"-", 
      r.bonLivraison||"-", 
      r.dateDechargement||"-",
      r.quantite || "0,00", 
      formatNumberWithSpace(Number(r.tarif || 0)), // Correction de la parenthèse ici
      formatNumberWithSpace(Number(r.retenue)||0), 
      formatNumberWithSpace(Number(r.montantNet)||0)
    ]);

    tableBody.push([
      { content: "TOTAL MONTANT À PAYER", colSpan: 4, styles: { halign: "center", fontStyle: "bold", fillColor: [240,240,240] } },
      { content: formatNumberWithSpace(totQ).replace(".", ","), styles: { halign: "right", fontStyle: "bold", fillColor: [240,240,240] } },
      { content: formatNumberWithSpace(totT), styles: { halign: "right", fontStyle: "bold", fillColor: [240,240,240] } },
      { content: formatNumberWithSpace(totR), styles: { halign: "right", fontStyle: "bold", fillColor: [240,240,240] } },
      { content: formatNumberWithSpace(totN), styles: { halign: "right", fontStyle: "bold", fillColor: [240,240,240] } }
    ]);

    autoTable(doc,{
      startY: y,
      head: [tableHead],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 9, font: "times", lineColor: [0,0,0], lineWidth: 0.1 },
      headStyles: { fillColor: [220,220,220], textColor: 0, halign: "center" },
      columnStyles: { 0:{cellWidth:8, halign:"center"}, 4:{halign:"right"}, 5:{halign:"right"}, 6:{halign:"right"}, 7:{halign:"right"} }
    });

    y = doc.lastAutoTable.finalY + 8;
    doc.setFont("times","normal");
    doc.text("Arrêtée la présente facture à la somme HT de :", 14, y);
    y += 6;
    const words = convertNumberToWords(totN);
    doc.setFont("times","bold");
    doc.text(`${words.charAt(0).toUpperCase()+words.slice(1)} (${formatNumberWithSpace(totN)}) francs CFA.`, 14, y);

    y += 30;
    doc.text("Le Directeur Général", 150, y);
    y += 25;
    doc.text("KERE Leger", 158, y);
  }

  /* ===== FOOTER ===== */
  const footerText = "GTS SAS | RCCM: BFOUA2020B3691 | IFU: 00136236Y | Régime fiscal: RSI | Division fiscale: DCI OUAGA V | Tél: +226 25 50 89 91 / 78 82 62 16 / 70 00 80 24 | BP 9342 Ouagadougou 06 | Mail: contact@gts.bf";
  doc.setFontSize(8);
  doc.setTextColor(100);
  const lines = doc.splitTextToSize(footerText, 180);
  lines.forEach((line, i) => doc.text(line, 105, pageHeight - 15 + (i*4), { align: "center" }));

  return doc;
};