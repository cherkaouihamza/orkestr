export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="orkestr-logo text-4xl text-white">
            ORKEST<span className="text-accent">R</span>
          </span>
          <p className="text-primary-300 text-sm mt-2">
            Gestion opérationnelle d&apos;événements
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
