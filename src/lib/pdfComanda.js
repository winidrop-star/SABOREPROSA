import { jsPDF } from 'jspdf';

const PAPER_WIDTH_MM = 80; // troque para 58 se a impressora usar bobina de 58mm

// Baixa o PDF direto no navegador do dispositivo — sem depender de nenhuma
// API externa (o app original usava window.claude.use('downloads')).
export function baixarComandaPdf(linhas, nomeArquivo) {
  const marginMm = 4;
  const fontSize = 13;
  const lineHeightMm = 6.2;
  const usableWidthMm = PAPER_WIDTH_MM - marginMm * 2;

  const probe = new jsPDF({ unit: 'mm', format: [PAPER_WIDTH_MM, 40] });
  probe.setFont('courier', 'normal');
  probe.setFontSize(fontSize);
  const wrappedLines = [];
  linhas.forEach((line) => {
    if (!line) {
      wrappedLines.push('');
      return;
    }
    probe.splitTextToSize(line, usableWidthMm).forEach((wl) => wrappedLines.push(wl));
  });

  const heightMm = marginMm * 2 + wrappedLines.length * lineHeightMm + 4;
  const doc = new jsPDF({ unit: 'mm', format: [PAPER_WIDTH_MM, heightMm] });
  doc.setFont('courier', 'normal');
  doc.setFontSize(fontSize);
  let y = marginMm + 5;
  wrappedLines.forEach((line) => {
    doc.text(line, marginMm, y);
    y += lineHeightMm;
  });

  doc.save(nomeArquivo);
}
