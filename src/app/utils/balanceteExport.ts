import jsPDF from 'jspdf';
// Import dinâmico: a xlsx (SheetJS) só é pedida ao browser quando o utilizador
// efectivamente clica em "Exportar Excel" — evita carregar/avaliar a biblioteca
// inteira (e o custo de arranque que isso implica) em todas as páginas do admin.
const carregarXlsx = () => import('xlsx');

export interface LinhaExportavel {
  celulas: (string | number)[];
  destaque?: boolean;
}

export interface RelatorioExportavel {
  ficheiro: string;
  titulo: string;
  empresaNome: string;
  nif?: string | null;
  ano: number;
  moeda: string;
  colunas: string[];
  linhas: LinhaExportavel[];
}

function subtitulo(relatorio: RelatorioExportavel) {
  const partes = [relatorio.empresaNome];
  if (relatorio.nif) partes.push(`NIF ${relatorio.nif}`);
  partes.push(`Exercício ${relatorio.ano}`);
  partes.push(`Valores expressos em ${relatorio.moeda}`);
  return partes.join(' · ');
}

export function exportarRelatorioPdf(relatorio: RelatorioExportavel) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedAt = new Date();
  let y = margin;

  const addFooter = () => {
    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Gerado em ${generatedAt.toLocaleDateString('pt-PT')} às ${generatedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
        margin,
        pageHeight - 8
      );
      pdf.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
  };

  const ensureSpace = (altura: number) => {
    if (y + altura <= pageHeight - 20) return;
    pdf.addPage();
    y = margin;
  };

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 30, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(relatorio.titulo.toUpperCase(), margin, 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(subtitulo(relatorio), margin, 22);
  y = 40;

  const numColunas = relatorio.colunas.length;
  const colWidth = contentWidth / numColunas;

  const drawHeader = () => {
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, contentWidth, 8, 'FD');
    pdf.setTextColor(51, 65, 85);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    relatorio.colunas.forEach((coluna, index) => {
      const alinhamento = index === 0 ? 'left' : 'right';
      const x = index === 0 ? margin + 2 : margin + (index + 1) * colWidth - 2;
      pdf.text(coluna, x, y + 5.5, { align: alinhamento });
    });
    y += 8;
  };

  drawHeader();

  const linhas = relatorio.linhas.length ? relatorio.linhas : [{ celulas: ['Sem dados'] }];
  linhas.forEach((linha) => {
    ensureSpace(8);
    if (y === margin) drawHeader();
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(linha.destaque ? 248 : 255, linha.destaque ? 250 : 255, linha.destaque ? 252 : 255);
    pdf.rect(margin, y, contentWidth, 7, 'FD');
    pdf.setFont('helvetica', linha.destaque ? 'bold' : 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(30, 41, 59);
    linha.celulas.forEach((valor, index) => {
      const texto = String(valor ?? '-');
      const alinhamento = index === 0 ? 'left' : 'right';
      const x = index === 0 ? margin + 2 : margin + (index + 1) * colWidth - 2;
      pdf.text(pdf.splitTextToSize(texto, colWidth - 4), x, y + 4.8, { align: alinhamento });
    });
    y += 7;
  });

  addFooter();
  pdf.save(`${relatorio.ficheiro}.pdf`);
}

export async function exportarRelatorioExcel(relatorio: RelatorioExportavel) {
  const XLSX = await carregarXlsx();
  const aoa: (string | number)[][] = [];

  aoa.push([relatorio.titulo.toUpperCase()]);
  aoa.push([relatorio.empresaNome + (relatorio.nif ? ` · NIF ${relatorio.nif}` : '')]);
  aoa.push([`Exercício ${relatorio.ano} · Valores expressos em ${relatorio.moeda}`]);
  aoa.push([]);
  aoa.push(relatorio.colunas);
  relatorio.linhas.forEach((linha) => aoa.push(linha.celulas));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const numColunas = relatorio.colunas.length;

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: numColunas - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: numColunas - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: numColunas - 1 } },
  ];

  ws['!cols'] = [{ wch: 42 }, ...Array.from({ length: Math.max(0, numColunas - 1) }, () => ({ wch: 18 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, relatorio.titulo.slice(0, 31) || 'Relatório');
  XLSX.writeFile(wb, `${relatorio.ficheiro}.xlsx`);
}
