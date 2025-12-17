// src/components/billing/InvoiceGeneratorGTS.jsx
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo_gts.png";

/* =========================
   UTILS
========================= */

// "43,28" → 43.28
const parseDecimal = (value) => {
  if (!value) return 0;
  return Number(String(value).replace(",", "."));
};

// Conversion nombre → lettres (entiers)
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
  if(n<0) return "moins "+convertNumberToWords(-n);

  let words="";
  const millions = Math.floor(n/1_000_000);
  const thousands = Math.floor((n%1_000_000)/1_000);
  const remainder = n%1000;

  if(millions>0) words+=convertNumberToWords(millions)+(millions>1?" millions ":" million ");
  if(thousands>0) words+=(thousands===1?"mille ":convertNumberToWords(thousands)+" mille ");
  if(remainder>0) words+=underThousand(remainder);

  return words.trim();
}

// Format nombre avec espace
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
      doc.setGState(new doc.GState({ opacity: 0.2 }));
    } else if (doc.setAlpha) {
      doc.setAlpha?.(0.05);
    }
    const logoWidth = 120;
    const logoHeight = 120;
    const x = (pageWidth - logoWidth) / 2;
    const y = (pageHeight - logoHeight) / 2;
    doc.addImage(logo, "PNG", x, y, logoWidth, logoHeight);
    doc.restoreGraphicsState?.();
  }

  /* ===== LOGO EN HAUT À GAUCHE ===== */
  if(logo) doc.addImage(logo,"PNG",14,10,50,20);

  /* ===== MISSIONS ===== */
const missions = [
  "Intégration de solutions",
  "Informatique - Télécom",
  "Energie - BTP",
  "Etude et réalisation de projets",
  "Negos-Divers",
];

let yMission = 14;
const bulletX = 158;
const textX = 162;

// Définir police Times et taille 9
doc.setFont("times", "normal");
doc.setFontSize(9);

missions.forEach(m => {
  doc.circle(bulletX, yMission-1.1, 0.7, "F"); 
  doc.text(m, textX, yMission);
  yMission += 4.5; 
});

const headerBottomY = Math.max(30, yMission) + 1;
doc.setDrawColor(0,0,128);
doc.setLineWidth(0.6);
doc.line(1, headerBottomY, pageWidth-1, headerBottomY);
doc.setDrawColor(0,0,0);
doc.setLineWidth(0.2);


 /* ===== DATE ===== */
const today = new Date();
doc.setFont("times", "normal"); // police Times
doc.setFontSize(11);
doc.text(
  `Ouagadougou, le ${today.toLocaleDateString("fr-FR",{year:"numeric",month:"long",day:"numeric"})}`,
  pageWidth-11,
  headerBottomY+7,
  { align: "right" }
);


  /* =========================
   INFOS CLIENT
========================= */
let y = 75;

// Titre facture
doc.setFont("times", "bold");
doc.setFontSize(11);
const factureText = `Facture ${invoiceData.invoiceNumber || "-"}`;
doc.text(factureText, 14, y);
doc.line(14, y + 1, 14 + doc.getTextWidth(factureText), y + 1);
y += 6;

// Fonction pour écrire label + valeur
const writeLabel = (label, value, x, yPos, maxWidth = 90) => {
  doc.setFont("times", "bold");
  const w = doc.getTextWidth(label);
  doc.text(label, x, yPos);
  doc.line(x, yPos + 1, x + w, yPos + 1);
  doc.setFont("times", "normal");
  doc.text(`: ${value || "-"}`, x + w + 2, yPos, { maxWidth });
};

// Ligne 1 : Nom du client
writeLabel("Doit", invoiceData.clientName, 14, y);
y += 6;

// Ligne 2 : Adresse + RCCM
writeLabel("", invoiceData.clientAddress, 21, y);
writeLabel("RCCM", invoiceData.clientRCCM, 90, y);
y += 6;

// Ligne 3 : IFU + Téléphone + Régime Fiscal
writeLabel("IFU", invoiceData.clientIFU, 14, y);
writeLabel("Tél", invoiceData.clientTel, 45, y);
writeLabel("Régime Fiscal", invoiceData.clientRegimeFiscal, 90, y);
y += 6;

// Ligne 4 : Division Fiscale + Zone
writeLabel("Division Fiscale", invoiceData.clientDivisionFiscale, 14, y);
writeLabel("Adresse", invoiceData.clientZone, 60, y);
y += 10;

// Ligne 5 : Objet / Description
writeLabel("Objet", invoiceData.description, 14, y);
y += 10;


  /* =========================
     TABLEAU RÉSUMÉ + TOTAL
  ========================= */
  if(invoiceData.summaryData?.length){
    const tableHead = [
      "N°","Immatriculation","Bon","Date","Quantité (T)","Tarif","Retenue 5%","Montant net"
    ];

    const tableBody = invoiceData.summaryData.map((r,i)=>[
      i+1,
      r.immatriculation||"-",
      r.bonLivraison||"-",
      r.dateDechargement||"-",
      `${r.quantite || "-"} T`,
      formatNumberWithSpace(Number(r.tarif)||0),
      formatNumberWithSpace(Number(r.retenue)||0),
      formatNumberWithSpace(Number(r.montantNet)||0),
    ]);

    const totalHTVA = invoiceData.summaryData.reduce((acc,r)=>acc+(Number(r.montantNet)||0),0);

    // Ligne TOTAL
    tableBody.push([
      {
        content: "TOTAL MONTANT À PAYER",
        colSpan: 7,
        styles: { halign: "center", fontStyle: "bold", fillColor: [240,240,240] },
      },
      {
        content: formatNumberWithSpace(totalHTVA),
        styles: { halign: "right", fontStyle: "bold", fillColor: [240,240,240] },
      },
    ]);

    autoTable(doc,{
      startY:y,
      head:[tableHead],
      body:tableBody,
      theme:"grid",
      styles:{fontSize:10,lineWidth:0.2,lineColor:[0,0,0]},
      headStyles:{fillColor:[220,220,220],textColor:[0,0,0],fontStyle:"bold",halign:"center"},
      columnStyles:{
        0:{halign:"center",cellWidth:10},
        4:{halign:"right"},5:{halign:"right"},6:{halign:"right"},7:{halign:"right"},
      }
    });

    // Texte sous le tableau
    y = doc.lastAutoTable.finalY + 8;
    doc.setFont("times","normal");
    doc.text("Arrêtée la présente facture à la somme HT de :", 14, y);

    // Montant en lettres
    y += 6;
    const words = convertNumberToWords(totalHTVA);
    doc.setFont("times","bold");
    doc.text(`${words.charAt(0).toUpperCase()+words.slice(1)} (${formatNumberWithSpace(totalHTVA)}) francs CFA.`, 14, y);

    // Signature
    y += 40;
    doc.setFont("times","bold");
    doc.text("Le Directeur Général",150,y);
    y += 30;
    doc.text("KERE Leger",158,y);
  }
  
 /* =========================
   PIED DE PAGE GTS
========================= */

// Ligne de séparation
doc.setDrawColor(180, 180, 180);
doc.setLineWidth(0.3);
doc.line(14, pageHeight - 25, 196, pageHeight - 25);

// Texte pied de page (multi-lignes et centré)
doc.setFont("times", "normal");
doc.setFontSize(9);
doc.setTextColor(80, 80, 80);

const footerTextGTS =
  "GTS SAS | RCCM: BFOUA2020B3691 | IFU: 00136236Y | Régime fiscal: RSI | Division fiscale: DCI OUAGA V | Tél: +226 25 50 89 91 / 78 82 62 16 / 70 00 80 24 | BP 9342 Ouagadougou 06 | Mail: contact@gts.bf";

// Découpage automatique pour tenir dans 180 mm de largeur
const lines = doc.splitTextToSize(footerTextGTS, 180);

// Position verticale du premier texte
let footerY = pageHeight - 18 - (lines.length - 1) * 4;

// Affichage ligne par ligne, centré
lines.forEach((line, index) => {
  doc.text(line, 105, footerY + index * 4, { align: "center" });
});



  return doc;
};
