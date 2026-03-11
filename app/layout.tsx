import './globals.css'

export const metadata = { title: 'Habit Tracker' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto px-6 py-4">
            <h1 className="text-lg font-semibold tracking-tight">Habit Tracker</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
