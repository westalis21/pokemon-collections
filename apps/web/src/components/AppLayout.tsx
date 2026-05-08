import { Link, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-brand-600">
            Pokemon Collections
          </Link>
          <nav className="flex gap-3 text-sm">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <Link to="/lists/new" className="hover:underline">
              New list
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
