"use client";
import { useState } from 'react';
import { X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Action {
  paragraf: string;
  action: string;
  years: Array<{
    year: number;
    price: number;
    vyhlaska: string;
  }>;
}

interface YearData {
  year: number;
  vyhlaska: string;
  vypoctovy_zaklad: number;
  zlomky: Array<{
    zlomok: string;
    paragraf: string | null;
    vysledok: number;
  }>;
}

interface Props {
  actions: Action[];
  allYears: number[];
  vypocty: YearData[];
  dphRates: Record<number, number>;
}

function normalizeParagraf(paragraf: string | null): string {
  return (paragraf || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/ods/g, "")
    .replace(/písm/g, "");
}

export default function CalculatorClient({ actions, allYears, vypocty, dphRates }: Props) {
  const defaultYear = allYears[0];
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [activeTab, setActiveTab] = useState<'prehliad' | 'vypocet'>('prehliad');

  // Unikátne úkony podľa názvu aj paragrafu
  const uniqueActions = Array.from(new Map(actions.map(a => [`${a.action}|${a.paragraf}`, a])).values());

  // Nájsť prvý úkon so sadzbou pre defaultYear
  function findFirstValidAction() {
    for (const a of uniqueActions) {
      if (getSadzba(a.action, a.paragraf, defaultYear) !== null) {
        return a;
      }
    }
    return null;
  }
  const firstValid = findFirstValidAction();

  // Výpočet odmeny - stav pre úkony
  type CalcItem = { id: number; action: string; paragraf: string; year: number; qty: number };
  const [calcItems, setCalcItems] = useState<CalcItem[]>(
    firstValid ? [{ id: 1, action: firstValid.action, paragraf: firstValid.paragraf, year: defaultYear, qty: 1 }] : []
  );
  const [nextId, setNextId] = useState(2);

  // Helper na získanie sadzby pre úkon a rok
  function getSadzba(actionName: string, paragraf: string, year: number): number | null {
    const actionObj = actions.find(a => a.action === actionName && a.paragraf === paragraf);
    if (!actionObj) return null;
    const yearData = vypocty.find(y => y.year === year);
    if (!yearData) return null;
    const normActionPar = normalizeParagraf(actionObj.paragraf);
    let zlomok = yearData.zlomky.find(z => normalizeParagraf(z.paragraf) === normActionPar);
    if (!zlomok) {
      zlomok = yearData.zlomky.find(z => normalizeParagraf(z.paragraf).startsWith(normActionPar));
    }
    if (!zlomok) {
      zlomok = yearData.zlomky.find(z => normActionPar.startsWith(normalizeParagraf(z.paragraf)));
    }
    return zlomok ? zlomok.vysledok : null;
  }

  // Prehľad sadzieb (pôvodný tab)
  const yearData = vypocty.find((y) => y.year === selectedYear);
  const filteredRows = actions.map((item) => {
    let vysledok: number | null = null;
    if (yearData) {
      const normActionPar = normalizeParagraf(item.paragraf);
      let zlomok = yearData.zlomky.find(z => normalizeParagraf(z.paragraf) === normActionPar);
      if (!zlomok) {
        zlomok = yearData.zlomky.find(z => normalizeParagraf(z.paragraf).startsWith(normActionPar));
      }
      if (!zlomok) {
        zlomok = yearData.zlomky.find(z => normActionPar.startsWith(normalizeParagraf(z.paragraf)));
      }
      if (zlomok) vysledok = zlomok.vysledok;
    }
    return {
      action: item.action,
      paragraf: item.paragraf,
      vysledok,
      year: selectedYear,
    };
  });

  // UI pre výpočet odmeny
  function handleAddItem() {
    // Najdi prvý platný úkon pre aktuálny rok, ktorý má sadzbu
    const valid = uniqueActions.find(a => getSadzba(a.action, a.paragraf, defaultYear) !== null);
    if (!valid) return;
    setCalcItems(items => [
      ...items,
      { id: nextId, action: valid.action, paragraf: valid.paragraf, year: defaultYear, qty: 1 }
    ]);
    setNextId(id => id + 1);
  }
  function handleRemoveItem(id: number) {
    setCalcItems(items => items.length === 1 ? items : items.filter(i => i.id !== id));
  }
  function handleChangeItem(id: number, field: keyof CalcItem, value: string | number) {
    setCalcItems(items => items.map(i => {
      if (i.id !== id) return i;
      if (field === 'action') {
        const [actionName, paragraf] = (value as string).split('|');
        return { ...i, action: actionName, paragraf };
      }
      return { ...i, [field]: value };
    }));
  }

  // Filtrované položky len so sadzbou
  const filteredCalcItems = calcItems.filter(item => getSadzba(item.action, item.paragraf, item.year) !== null);

  // Výpočet DPH podľa sadzieb
  const dphGroups: Record<string, { dph: number; sum: number }> = {};
  for (const item of filteredCalcItems) {
    const sadzba = getSadzba(item.action, item.paragraf, item.year);
    const dphValue = dphRates[item.year] ?? 0.2;
    const key = `${(dphValue * 100).toFixed(0)}%`;
    if (!dphGroups[key]) dphGroups[key] = { dph: dphValue, sum: 0 };
    if (sadzba !== null) dphGroups[key].sum += sadzba * item.qty;
  }
  const sumWithoutDPHGrouped = Object.values(dphGroups).reduce((acc, g) => acc + g.sum, 0);
  const sumDPHGrouped = Object.values(dphGroups).reduce((acc, g) => acc + g.sum * g.dph, 0);
  const sumWithDPHGrouped = sumWithoutDPHGrouped + sumDPHGrouped;

  function handleExportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    // Hlavička s paragrafom
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(30, 64, 175);
    doc.text('§', 14, 20);
    doc.setFontSize(22);
    doc.text('Kalkulačka právnych úkonov', 28, 20);
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Prehľad sadzieb podľa Vyhlášky č. 655/2004 Z. z.', 14, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dátum exportu: ${new Date().toLocaleDateString('sk-SK')}`, 285, 20, { align: 'right' });

    // Modrá čiara pod hlavičkou
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(1.2);
    doc.line(14, 34, 285, 34);

    // Tabuľka úkonov
    const tableRows: string[][] = calcItems
      .map((item) => {
        const sadzba = getSadzba(item.action, item.paragraf, item.year);
        if (sadzba === null) return undefined;
        const dphValue = dphRates[item.year] ?? 0.2;
        return [
          String(item.action),
          String(item.year),
          String(item.qty),
          `${sadzba} EUR`,
          `${(dphValue * 100).toFixed(0)}%`,
          `${(sadzba * item.qty * (1 + dphValue)).toLocaleString('sk-SK', { maximumFractionDigits: 2 })} EUR`,
        ];
      })
      .filter((row): row is string[] => !!row);

    autoTable(doc, {
      head: [[
        'Úkon', 'Rok', 'Množstvo', 'Sadzba', 'DPH', 'Suma s DPH'
      ]],
      body: tableRows,
      startY: 40,
      styles: { font: 'helvetica', fontSize: 13, cellPadding: 4, valign: 'middle' },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', font: 'helvetica', fontSize: 14 },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      tableLineColor: [30, 64, 175],
      tableLineWidth: 0.4,
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(1.2);
        const tableWidth = typeof ((data.table as unknown) as { width?: number }).width === 'number' ? ((data.table as unknown) as { width: number }).width : 257;
        const cursorY = data.cursor && typeof data.cursor.y === 'number' ? data.cursor.y : (data.settings.startY + 40);
        doc.rect(data.settings.margin.left - 2, data.settings.startY - 2, tableWidth + 4, cursorY - data.settings.startY + 4);
      },
    });

    // Výsledok sekcia
    let y = 60;
    if (typeof ((doc as unknown) as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY === 'number') {
      y = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    }
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.8);
    doc.line(14, y - 8, 285, y - 8);
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text('Výsledok', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.text(`Súčet bez DPH: ${sumWithoutDPHGrouped.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} EUR`, 14, y);
    y += 8;
    for (const [dphLabel, group] of Object.entries(dphGroups)) {
      doc.text(`DPH (${dphLabel}): ${(group.sum * group.dph).toLocaleString('sk-SK', { maximumFractionDigits: 2 })} EUR`, 14, y);
      y += 8;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(30, 64, 175);
    doc.text(`Celková suma s DPH: ${sumWithDPHGrouped.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} EUR`, 14, y);
    doc.setTextColor(0, 0, 0);

    // Poznámka do päty
    y += 18;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('Vypočítané podľa Vyhlášky č. 655/2004 Z. z. | www.justice.gov.sk', 14, y);

    doc.save('pravna_odmena.pdf');
  }

  return (
    <>
      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <button
          type="button"
          className={`px-6 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'prehliad' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
          onClick={() => setActiveTab('prehliad')}
        >
          Prehľad sadzieb
        </button>
        <button
          type="button"
          className={`px-6 py-2 rounded-t-lg font-medium transition-colors ml-2 ${activeTab === 'vypocet' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
          onClick={() => setActiveTab('vypocet')}
        >
          Výpočet odmeny
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'prehliad' && (
        <>
          <div className="flex justify-center items-center gap-2 mb-6">
            <label htmlFor="year-select" className="text-gray-700 dark:text-gray-200 font-medium">Rok:</label>
            <select
              id="year-select"
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
            >
              {allYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          {yearData?.vypoctovy_zaklad && (
            <div className="mb-4 text-center">
              <span className="inline-block bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-semibold rounded-lg px-4 py-2 text-lg shadow-sm">
                Výpočtový základ pre rok {selectedYear} je {yearData.vypoctovy_zaklad} EUR
              </span>
            </div>
          )}
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Úkon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Paragraf
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sadzba
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRows.map((row) => (
                  <tr key={`${row.action}-${row.paragraf}-${row.year}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {row.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {row.paragraf}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {row.vysledok !== null ? `${row.vysledok} EUR` : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {activeTab === 'vypocet' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-6xl w-full mx-auto border border-blue-100 dark:border-blue-900">
          <h2 className="text-3xl font-serif font-bold mb-6 text-blue-900 dark:text-blue-200 tracking-tight">Výpočet odmeny</h2>
          <p className="mb-6 text-lg text-gray-700 dark:text-gray-300">Pridajte úkony, zvoľte rok a množstvo. Výsledok vrátane DPH sa zobrazí nižšie.</p>
          {firstValid ? (
            <>
              <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table
                  className="min-w-[700px] w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                  aria-label="Tabuľka úkonov na výpočet odmeny"
                >
                  <thead className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-serif font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wider rounded-tl-xl min-w-[160px]">Úkon</th>
                      <th className="px-2 py-3 text-left text-sm font-serif font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wider min-w-[70px]">Rok</th>
                      <th className="px-2 py-3 text-left text-sm font-serif font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wider min-w-[80px]">Množstvo</th>
                      <th className="px-2 py-3 text-left text-sm font-serif font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wider min-w-[90px]">Sadzba</th>
                      <th className="px-2 py-3 text-left text-sm font-serif font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wider min-w-[60px]">DPH</th>
                      <th className="px-2 py-3 rounded-tr-xl min-w-[40px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {calcItems.map((item) => {
                      const sadzba = getSadzba(item.action, item.paragraf, item.year);
                      if (sadzba === null) return null;
                      const dphValue = dphRates[item.year] ?? 0.2;
                      return (
                        <tr key={item.id} className="hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group border-b border-gray-100 dark:border-gray-700">
                          <td className="px-4 py-3 text-base text-gray-900 dark:text-white max-w-xs whitespace-normal break-words">
                            <label htmlFor={`action-${item.id}`} className="sr-only">Úkon</label>
                            <select
                              id={`action-${item.id}`}
                              className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400"
                              value={`${item.action}|${item.paragraf}`}
                              onChange={e => handleChangeItem(item.id, 'action', e.target.value)}
                            >
                              {uniqueActions.map(a => (
                                getSadzba(a.action, a.paragraf, item.year) !== null ? (
                                  <option key={`${a.action}|${a.paragraf}`} value={`${a.action}|${a.paragraf}`}>{a.action} ({a.paragraf})</option>
                                ) : null
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-3">
                            <label htmlFor={`year-${item.id}`} className="sr-only">Rok</label>
                            <select
                              id={`year-${item.id}`}
                              className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400"
                              value={item.year}
                              onChange={e => handleChangeItem(item.id, 'year', Number(e.target.value))}
                            >
                              {allYears.map(year => (
                                getSadzba(item.action, item.paragraf, year) !== null ? (
                                  <option key={year} value={year}>{year}</option>
                                ) : null
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-3">
                            <label htmlFor={`qty-${item.id}`} className="sr-only">Množstvo</label>
                            <input
                              id={`qty-${item.id}`}
                              type="number"
                              min={1}
                              className="w-20 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 text-center"
                              value={item.qty}
                              onChange={e => handleChangeItem(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                            />
                          </td>
                          <td className="px-2 py-3 text-base font-semibold text-blue-800 dark:text-blue-300 whitespace-nowrap">
                            {sadzba} EUR
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <input
                              type="text"
                              readOnly
                              className="w-14 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                              value={`${(dphValue * 100).toFixed(0)}%`}
                              tabIndex={-1}
                            />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              className="p-2 rounded-full bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={calcItems.length === 1}
                              aria-label="Odstrániť úkon"
                            >
                              <X className="w-5 h-5 text-red-600 dark:text-red-300" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold shadow-md flex items-center gap-2"
                  onClick={handleAddItem}
                  disabled={!uniqueActions.some(a => getSadzba(a.action, a.paragraf, defaultYear) !== null)}
                >
                  <span>Pridať úkon</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="plus"><title>Pridať</title><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-12">Pre zvolený rok nie sú dostupné žiadne úkony so sadzbou.</div>
          )}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-serif font-bold mb-4 text-blue-900 dark:text-blue-200">Výsledok</h3>
            <div className="flex flex-col gap-2 text-lg text-gray-800 dark:text-gray-200">
              <div className="flex justify-between">
                <span>Súčet bez DPH:</span>
                <span>{sumWithoutDPHGrouped.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} EUR</span>
              </div>
              {Object.entries(dphGroups).map(([dphLabel, group]) => (
                <div className="flex justify-between" key={dphLabel}>
                  <span>DPH ({dphLabel}):</span>
                  <span>{(group.sum * group.dph).toLocaleString('sk-SK', { maximumFractionDigits: 2 })} EUR</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-blue-700 dark:text-blue-400 text-2xl mt-2">
                <span>Celková suma s DPH:</span>
                <span>{sumWithDPHGrouped.toLocaleString('sk-SK', { maximumFractionDigits: 2 })} EUR</span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                className="px-6 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors font-semibold shadow-md flex items-center gap-2"
                onClick={handleExportPDF}
              >
                Export do PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 