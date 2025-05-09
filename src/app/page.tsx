import { Scale, Calculator, Shield, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Kalkulačka Odmien za Právne Úkony
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Presný výpočet odmeny za právne úkony v trestnom práve podľa platnej legislatívy
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <Scale className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Presné Výpočty</h3>
            <p className="text-gray-600 dark:text-gray-300">Automatický výpočet odmeny podľa aktuálnych sadzieb</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <Calculator className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Jednoduché Použitie</h3>
            <p className="text-gray-600 dark:text-gray-300">Intuitívne rozhranie pre rýchly výpočet</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Aktuálna Legislatíva</h3>
            <p className="text-gray-600 dark:text-gray-300">Vždy aktuálne sadzby a predpisy</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <BookOpen className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Právne Poradenstvo</h3>
            <p className="text-gray-600 dark:text-gray-300">Odborné informácie a vysvetlenia</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <a
            href="/calculator"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Spustiť Kalkulačku
            <Calculator className="ml-2 w-5 h-5" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-900 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© 2024 Právna Kalkulačka. Všetky práva vyhradené.</p>
        </div>
      </footer>
    </div>
  );
}
