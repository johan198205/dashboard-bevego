import { ClientOnly } from "@/components/ClientOnly";
import { NDIDashboard } from "@/components/NDI/NDIDashboard";

export default function NDIPage() {
  return (
    <ClientOnly
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              NDI Dashboard
            </h1>
            <p className="text-dark-6 dark:text-dark-4 mt-1">
              Översikt över Net Promoter Index och kundnöjdhet
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-2xl p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      }
    >
      <NDIDashboard />
    </ClientOnly>
  );
}
