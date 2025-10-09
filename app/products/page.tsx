'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/auth';

export default function ProductsPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // --- Local UI state & demo data (must be declared before any early returns) ---
  type Product = {
    id: string;
    name: string;
    price: number;
    stock: number;
    status: 'Available' | 'Draft' | 'Archived';
    category: string;
  };

  const demoProducts: Product[] = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: `p-${i + 1}`,
        name: 'Lorem Ipsum',
        price: 250,
        stock: 3024,
        status: 'Available',
        category: ['All', 'Beverages', 'Snacks', 'Household'][(i % 3) + 1] || 'Beverages',
      })),
    []
  );

  const categories = ['All Categories', 'Beverages', 'Snacks', 'Household'];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const filtered = useMemo(() => {
    return demoProducts.filter((p) => {
      const matchQuery = p.name.toLowerCase().includes(query.toLowerCase());
      const matchCategory = category === 'All Categories' ? true : p.category === category;
      return matchQuery && matchCategory;
    });
  }, [demoProducts, query, category]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl font-medium">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl">Please log in</div>
      </div>
    );
  }

  const canView = (user.permissions || []).includes('view_products');
  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl">Access denied (Products)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-2xl font-bold font-title text-header hover:text-primary-600 transition">
                DataDrip
              </Link>
              <nav className="hidden md:flex space-x-6">
                <a href="/dashboard" className="text-subheader hover:text-header transition">Dashboard</a>
                <a href="/products" className="text-header font-medium">Products</a>
                <a href="/insights" className="text-subheader hover:text-header transition">Insights</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/settings')}
                className="p-2 text-gray-600 hover:text-header hover:bg-gray-100 rounded-lg transition"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">U</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-header hover:bg-gray-100 rounded-lg transition font-medium"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold font-title text-header mb-6">ManageProducts</h2>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="relative max-w-sm">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
                {/* search icon */}
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Products"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-header placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Categories dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setCategoryOpen((o) => !o);
                  setFilterOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-header hover:bg-gray-200"
                aria-haspopup="listbox"
                aria-expanded={categoryOpen}
              >
                {category}
                <svg className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
                </svg>
              </button>
              {categoryOpen && (
                <ul
                  role="listbox"
                  className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  {categories.map((c) => (
                    <li
                      key={c}
                      role="option"
                      aria-selected={c === category}
                      onClick={() => {
                        setCategory(c);
                        setCategoryOpen(false);
                      }}
                      className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-50 ${
                        c === category ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add product button */}
            <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
              Add Products
            </button>

            {/* Filters dropdown (icon) */}
            <div className="relative">
              <button
                onClick={() => {
                  setFilterOpen((o) => !o);
                  setCategoryOpen(false);
                }}
                className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
                aria-haspopup="menu"
                aria-expanded={filterOpen}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5h18M6 12h12M10 19h4" />
                </svg>
              </button>
              {filterOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg">
                  <button className="flex w-full items-center justify-between rounded px-2 py-2 hover:bg-gray-50">
                    Status: Available
                    <span className="text-xs text-gray-500">(demo)</span>
                  </button>
                  <button className="flex w-full items-center justify-between rounded px-2 py-2 hover:bg-gray-50">
                    Price: Low → High
                    <span className="text-xs text-gray-500">(demo)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-10 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300" aria-label="Select all" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                  Products
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-100/70">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" aria-label={`Select ${p.name}`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-gray-300" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-header">{p.name}</span>
                        <span className="text-xs text-subheader">{p.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-header">₱{p.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-header">{p.stock}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <button className="text-gray-700 hover:text-gray-900" title="Edit">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <button className="text-red-600 hover:text-red-700" title="Delete">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
