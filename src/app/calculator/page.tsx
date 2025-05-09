import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import CalculatorClient from './CalculatorClient';

// Type definitions
interface ParagrafData {
  actions: string[];
  years: Record<string, unknown>;
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

interface Action {
  paragraf: string;
  action: string;
  years: Array<{
    year: number;
    price: number;
    vyhlaska: string;
  }>;
}

const paragrafyPath = path.join(process.cwd(), 'zakony/vypoctovy_paragrafy.json');
const vypoctyPath = path.join(process.cwd(), 'zakony/vypoctovy_zaklad.json');

const paragrafy: Record<string, ParagrafData> = JSON.parse(fs.readFileSync(paragrafyPath, 'utf-8'));
const vypocty: YearData[] = JSON.parse(fs.readFileSync(vypoctyPath, 'utf-8'));

const actions: Action[] = Object.entries(paragrafy).flatMap(([paragraf, data]) => {
  return data.actions.map((action) => ({
    paragraf,
    action,
    years: vypocty.map((year) => ({
      year: year.year,
      price: year.vypoctovy_zaklad,
      vyhlaska: year.vyhlaska
    }))
  }));
});

const allYears = vypocty.map((y) => y.year).sort((a, b) => b - a);

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Kalkulačka právnych úkonov
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
            Prehľad sadzieb podľa Vyhlášky č. 655/2004 Z. z.
          </p>
        </div>
        <CalculatorClient actions={actions} allYears={allYears} vypocty={vypocty} />
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Späť na hlavnú stránku
          </Link>
        </div>
      </main>
    </div>
  );
} 