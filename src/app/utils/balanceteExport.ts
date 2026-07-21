import jsPDF from 'jspdf';
// Import dinâmico: a xlsx (SheetJS) só é pedida ao browser quando o utilizador
// efectivamente clica em "Exportar Excel" — evita carregar/avaliar a biblioteca
// inteira (e o custo de arranque que isso implica) em todas as páginas do admin.
const carregarXlsx = () => import('xlsx');

export interface LinhaExportavel {
  celulas: (string | number)[];
  destaque?: boolean;
}

export interface TabelaExportavel {
  titulo: string;
  colunas: string[];
  linhas: LinhaExportavel[];
}

export interface RelatorioExportavel extends TabelaExportavel {
  ficheiro: string;
  empresaNome: string;
  nif?: string | null;
  ano: number;
  moeda: string;
}

export interface ExportacaoCompleta {
  ficheiro: string;
  empresaNome: string;
  nif?: string | null;
  ano: number;
  moeda: string;
  tabelas: TabelaExportavel[];
}

function subtituloContexto(empresaNome: string, nif: string | null | undefined, ano: number, moeda: string) {
  const partes = [empresaNome];
  if (nif) partes.push(`NIF ${nif}`);
  partes.push(`Exercício ${ano}`);
  partes.push(`Valores expressos em ${moeda}`);
  return partes.join(' · ');
}

function desenharTabelaPdf(
  pdf: jsPDF,
  tabela: TabelaExportavel,
  subtituloTexto: string,
  contexto: { margin: number; pageWidth: number; pageHeight: number; contentWidth: number }
) {
  const { margin, pageWidth, pageHeight, contentWidth } = contexto;
  let y = margin;

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
  pdf.text(tabela.titulo.toUpperCase(), margin, 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(subtituloTexto, margin, 22);
  y = 40;

  const numColunas = tabela.colunas.length;
  const colWidth = contentWidth / numColunas;

  const drawHeader = () => {
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, contentWidth, 8, 'FD');
    pdf.setTextColor(51, 65, 85);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    tabela.colunas.forEach((coluna, index) => {
      const alinhamento = index === 0 ? 'left' : 'right';
      const x = index === 0 ? margin + 2 : margin + (index + 1) * colWidth - 2;
      pdf.text(coluna, x, y + 5.5, { align: alinhamento });
    });
    y += 8;
  };

  drawHeader();

  const linhas = tabela.linhas.length ? tabela.linhas : [{ celulas: ['Sem dados disponíveis'] }];
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
}

function adicionarRodape(pdf: jsPDF, margin: number, pageWidth: number, pageHeight: number, geradoEm: Date) {
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Gerado em ${geradoEm.toLocaleDateString('pt-PT')} às ${geradoEm.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
      margin,
      pageHeight - 8
    );
    pdf.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
}

export function exportarRelatorioPdf(relatorio: RelatorioExportavel) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const contexto = {
    margin: 14,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
    contentWidth: pdf.internal.pageSize.getWidth() - 28,
  };
  desenharTabelaPdf(pdf, relatorio, subtituloContexto(relatorio.empresaNome, relatorio.nif, relatorio.ano, relatorio.moeda), contexto);
  adicionarRodape(pdf, contexto.margin, contexto.pageWidth, contexto.pageHeight, new Date());
  pdf.save(`${relatorio.ficheiro}.pdf`);
}

export function exportarExercicioPdf(dados: ExportacaoCompleta) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const contexto = {
    margin: 14,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
    contentWidth: pdf.internal.pageSize.getWidth() - 28,
  };
  const subtituloTexto = subtituloContexto(dados.empresaNome, dados.nif, dados.ano, dados.moeda);

  const tabelas = dados.tabelas.length ? dados.tabelas : [{ titulo: 'Balancete', colunas: ['Informação'], linhas: [] }];
  tabelas.forEach((tabela, index) => {
    if (index > 0) pdf.addPage();
    desenharTabelaPdf(pdf, tabela, subtituloTexto, contexto);
  });

  adicionarRodape(pdf, contexto.margin, contexto.pageWidth, contexto.pageHeight, new Date());
  pdf.save(`${dados.ficheiro}.pdf`);
}

function construirFolha(XLSX: typeof import('xlsx'), tabela: TabelaExportavel, subtituloTexto: string) {
  const aoa: (string | number)[][] = [];
  aoa.push([tabela.titulo.toUpperCase()]);
  aoa.push([subtituloTexto]);
  aoa.push([]);
  aoa.push(tabela.colunas);
  const linhas = tabela.linhas.length ? tabela.linhas : [{ celulas: ['Sem dados disponíveis'] }];
  linhas.forEach((linha) => aoa.push(linha.celulas));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const numColunas = tabela.colunas.length;

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: numColunas - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: numColunas - 1 } },
  ];
  ws['!cols'] = [{ wch: 42 }, ...Array.from({ length: Math.max(0, numColunas - 1) }, () => ({ wch: 18 }))];

  return ws;
}

function nomeFolhaUnico(titulo: string, usados: Set<string>) {
  const base = (titulo || 'Folha').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31).trim() || 'Folha';
  let nome = base;
  let sufixo = 2;
  while (usados.has(nome.toLowerCase())) {
    const marcador = ` (${sufixo})`;
    nome = base.slice(0, 31 - marcador.length) + marcador;
    sufixo += 1;
  }
  usados.add(nome.toLowerCase());
  return nome;
}

export async function exportarRelatorioExcel(relatorio: RelatorioExportavel) {
  const XLSX = await carregarXlsx();
  const subtituloTexto = subtituloContexto(relatorio.empresaNome, relatorio.nif, relatorio.ano, relatorio.moeda);
  const ws = construirFolha(XLSX, relatorio, subtituloTexto);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, relatorio.titulo.slice(0, 31) || 'Relatório');
  XLSX.writeFile(wb, `${relatorio.ficheiro}.xlsx`);
}

export async function exportarExercicioExcel(dados: ExportacaoCompleta) {
  const XLSX = await carregarXlsx();
  const subtituloTexto = subtituloContexto(dados.empresaNome, dados.nif, dados.ano, dados.moeda);
  const wb = XLSX.utils.book_new();
  const usados = new Set<string>();

  const tabelas = dados.tabelas.length ? dados.tabelas : [{ titulo: 'Balancete', colunas: ['Informação'], linhas: [] }];
  tabelas.forEach((tabela) => {
    const ws = construirFolha(XLSX, tabela, subtituloTexto);
    XLSX.utils.book_append_sheet(wb, ws, nomeFolhaUnico(tabela.titulo, usados));
  });

  XLSX.writeFile(wb, `${dados.ficheiro}.xlsx`);
}
