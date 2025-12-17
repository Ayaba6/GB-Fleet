// src/components/billing/InvoiceGeneratorGTS.jsx
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo_gts.png";

// Conversion nombre → lettres
function convertNumberToWords(n) {
  const units = ["","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
  const tens = ["","dix","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];

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

// Format nombre avec séparateur espace
function formatNumberWithSpace(n){
  if(typeof n!=="number") n = Number(n)||0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g," ");
}

// Générateur PDF GTS
export const generateInvoicePDFGTS = (invoiceData) => {
  const doc = new jsPDF();

  // Logo
  if(logo) doc.addImage(logo,"PNG",14,10,50,20);

  // Missions
  const missions = [
    "Intégration de solutions",
    "Informatique - Télécom",
    "Energie - BTP",
    "Etude et réalisation de projets",
    "Negos-Divers",
  ];
  let yMission = 14;
  const bulletX = 138, textX = 142;
  missions.forEach(mission=>{
    doc.setFillColor(0,0,0);
    doc.circle(bulletX, yMission-1.2, 0.8, "F");
    doc.text(mission, textX, yMission);
    yMission+=5;
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const headerBottomY = Math.max(30, yMission)+1;
  doc.setLineWidth(0.6);
  doc.setDrawColor(0,0,128);
  doc.line(1, headerBottomY, pageWidth-1, headerBottomY);
  doc.setLineWidth(0.2); doc.setDrawColor(0,0,0);

  // Date
  const today = new Date();
  const options = { year:"numeric", month:"long", day:"numeric" };
  doc.setFont("helvetica","normal");
  doc.setFontSize(11);
  doc.text(`Ouagadougou, le ${today.toLocaleDateString("fr-FR", options)}`, pageWidth-11, headerBottomY+7, {align:"right"});

  // Titre
  doc.setFont("helvetica","bold");
  doc.setFontSize(16);
  doc.text("FACTURE GTS", 105, 58, {align:"center"});

  /* =========================
     INFOS CLIENT
  ========================= */
  let y = 75;
  doc.setFontSize(11);
  doc.setFont("times","normal");

  const factureText = `Facture ${invoiceData.invoiceNumber||"-"}`;
  doc.setFont("times","bold");
  doc.text(factureText,14,y);
  const textWidth = doc.getTextWidth(factureText);
  doc.line(14,y+1,14+textWidth,y+1);
  y+=6;

  function writeBoldUnderlineLabel(label,value,x,yPos){
    doc.setFont("times","bold");
    const labelWidth = doc.getTextWidth(label);
    doc.text(label,x,yPos);
    doc.line(x,yPos+1,x+labelWidth,yPos+1);
    doc.setFont("times","normal");
    doc.text(value,x+labelWidth+2,yPos);
  }

  writeBoldUnderlineLabel("Doit", `: ${invoiceData.clientName||"-"}`, 14,y); y+=6;
  writeBoldUnderlineLabel("RCCM", `: ${invoiceData.clientRCCM||"-"} ; ${invoiceData.clientAddress||"-"}`, 14,y); y+=6;
  writeBoldUnderlineLabel("IFU", `: ${invoiceData.clientIFU||"-"} ; Tél. : ${invoiceData.clientTel||"-"} ; `,14,y);
  writeBoldUnderlineLabel("Régime fiscal", `${invoiceData.clientRegimeFiscal||"-"}`, 80,y); y+=6;
  writeBoldUnderlineLabel("Division fiscale", `: ${invoiceData.clientDivisionFiscale||"-"} ; `,14,y);
  writeBoldUnderlineLabel("Adresse", `: ${invoiceData.clientZone||"-"}`, 60,y); y+=8;
  writeBoldUnderlineLabel("Objet", `: ${invoiceData.description||"-"}`, 14,y); y+=6;

  /* =========================
     TABLEAU RÉSUMÉ COMPLET
  ========================= */
  let totalSummary = 0;
  if(invoiceData.summaryData?.length){
    y+=8;

    const tableHead = [
      "N°",
      "Immatriculation",
      "Bon de livraison",
      "Date de déchargement",
      "Quantité",
      "Tarif Lomé-Ouaga",
      "Retenue 5%",
      "Montant Total"
    ];

    const tableBody = invoiceData.summaryData.map((r, idx)=>[
      r.no||"-",
      r.immatriculation||"-",
      r.bonLivraison||"-",
      r.dateDechargement||"-",
      r.quantite?formatNumberWithSpace(Number(r.quantite)):"-",
      r.tarif?formatNumberWithSpace(Number(r.tarif)):"-",
      r.retenue?formatNumberWithSpace(Number(r.retenue)):"-",
      r.montantTotal?formatNumberWithSpace(Number(r.montantTotal)):"-"
    ]);

    autoTable(doc,{
      startY:y,
      head:[tableHead],
      body:tableBody,
      theme:"grid",
      headStyles:{fillColor:[200,200,200], fontStyle:"bold"},
      styles:{fontSize:10},
      columnStyles:{
        0:{halign:"center",cellWidth:10},
        1:{halign:"left"},
        2:{halign:"left"},
        3:{halign:"center"},
        4:{halign:"right"},
        5:{halign:"right"},
        6:{halign:"right"},
        7:{halign:"right"}
      }
    });

    totalSummary = invoiceData.summaryData.reduce((acc,r)=>acc+(Number(r.montantTotal)||0),0);
    y = doc.lastAutoTable.finalY + 10;

    // Affichage total HTVA
    doc.setFont("helvetica","bold");
    doc.text("Total (HTVA) :", 160, y, {align:"right"});
    doc.text(formatNumberWithSpace(totalSummary), 200, y, {align:"right"});
    y += 8;

    // Total en lettres
    const words = convertNumberToWords(totalSummary);
    doc.setFont("helvetica","normal");
    doc.text(`${words.charAt(0).toUpperCase()+words.slice(1)} (${formatNumberWithSpace(totalSummary)}) francs CFA.`,14,y);
    y+=18;
    doc.setFont("helvetica","bold");
    doc.text("Le Directeur",160,y); y+=22;
    doc.text("KERE Leger",160,y);
  }

  return doc;
};
