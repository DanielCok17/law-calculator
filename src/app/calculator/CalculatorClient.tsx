"use client";
import { useState } from 'react';

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
}

function normalizeParagraf(paragraf: string | null): string {
  return (paragraf || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/ods/g, "")
    .replace(/písm/g, "");
}

export default function CalculatorClient({ actions, allYears, vypocty }: Props) {
  const defaultYear = allYears[0];
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  // Find vypocty for selected year
  const yearData = vypocty.find((y) => y.year === selectedYear);

  const filteredRows = actions.map((item) => {
    let vysledok: number | null = null;
    if (yearData) {
      const normActionPar = normalizeParagraf(item.paragraf);
      // Najprv presná zhoda
      let zlomok = yearData.zlomky.find(z => normalizeParagraf(z.paragraf) === normActionPar);
      // Ak nenájde presnú, skús čiastočnú zhodu (zlomok.paragraf začína na action.paragraf)
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

  return (
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
  );
} 