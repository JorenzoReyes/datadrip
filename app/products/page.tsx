'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/auth';

// --- Product type definition ---
export type Product = {
  product_id: number;
  sku: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  price: number;
  cost: number | null;
  currency: string;
  stock: number;
  reorder_level: number | null;
  sales_count: number;
  sales_revenue: number;
  status: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export default function ProductsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // State declarations
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Date filter states
  const [dateRange, setDateRange] = useState<string>('30');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string}>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  // Fetch products from the database
  useEffect(() => {
    async function loadProducts() {
      if (!user?.email) return;
      
      try {
        setLoadingProducts(true);
        const email = encodeURIComponent(user.email);
        
        // Build date range parameters
        let dateParams = '';
        if (dateRange === 'custom') {
          dateParams = `&start_date=${customDateRange.start}&end_date=${customDateRange.end}`;
        } else {
          dateParams = `&days=${dateRange}`;
        }
        
        const res = await fetch(`/api/products?email=${email}${dateParams}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.error) {
          console.error('Error loading products:', json.error);
          setProducts([]);
        } else {
          setProducts(json.products || []);
        }
      } catch (e) {
        console.error('Failed to fetch products:', e);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }
    
    if (user) {
      loadProducts();
    }
  }, [user, dateRange, customDateRange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showDateFilter) {
        setShowDateFilter(false);
      }
    };

    if (showDateFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateFilter]);
  
  // Pagination and sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

  // Lazy load modals to keep initial bundle small
  const AddProductModal = useMemo(
    () => dynamic(() => import('../components/AddProductModal'), { ssr: false }),
    []
  );
  const EditProductModal = useMemo(
    () => dynamic(() => import('../components/EditProductModal'), { ssr: false }),
    []
  );

  // Extract unique categories from products
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    products.forEach(p => {
      if (p.category) uniqueCategories.add(p.category);
    });
    return ['All Categories', ...Array.from(uniqueCategories).sort()];
  }, [products]);

  // Filter, sort, and paginate products
  const { paginated, totalPages, totalItems } = useMemo(() => {
    // First filter products
    const filteredProducts = products.filter((p) => {
      const matchQuery = p.name.toLowerCase().includes(query.toLowerCase()) ||
                         p.brand?.toLowerCase().includes(query.toLowerCase()) ||
                         p.sku?.toLowerCase().includes(query.toLowerCase());
      const matchCategory = category === 'All Categories' ? true : p.category === category;
      return matchQuery && matchCategory;
    });

    // Then sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'stock':
          aValue = a.stock;
          bValue = b.stock;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Calculate pagination
    const totalItems = sortedProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

    return {
      paginated: paginatedProducts,
      totalPages,
      totalItems
    };
  }, [products, query, category, sortBy, sortOrder, currentPage, itemsPerPage]);

  // Handle sorting
  const handleSort = (newSortBy: 'name' | 'stock' | 'price' | 'created_at') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, sortBy, sortOrder]);

  // Handle adding new product
  const handleAddProduct = async (productData: {
    name: string;
    sku?: string;
    description?: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    price: number;
    stock: number;
  }) => {
    try {
      const email = encodeURIComponent(user?.email || '');
      const res = await fetch(`/api/products?email=${email}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to add product');
      }

      // Add the new product to the local products list
      setProducts([json.product, ...products]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  // Handle updating product
  const handleUpdateProduct = async (updatedData: Partial<Product>) => {
    if (!editingProduct) return;

    try {
      const email = encodeURIComponent(user?.email || '');
      const res = await fetch(`/api/products/${editingProduct.product_id}?email=${email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update product');
      }

      // Update the product in the local products list
      setProducts(products.map(p => 
        p.product_id === editingProduct.product_id ? { ...p, ...json.product } : p
      ));
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  // Handle archiving product
  const handleArchiveProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to archive this product?')) return;

    try {
      const email = encodeURIComponent(user?.email || '');
      const res = await fetch(`/api/products/${productId}/archive?email=${email}`, {
        method: 'PATCH',
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to archive product');
      }

      // Remove the product from the local products list
      setProducts(products.filter(p => p.product_id !== productId));
    } catch (error) {
      console.error('Error archiving product:', error);
      alert(error instanceof Error ? error.message : 'Failed to archive product');
    }
  };

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

  const roles = user.roles || (user.role ? [user.role] : []);
  const isAdmin = roles.includes('admin') || roles.includes('system_admin');
  const canView = !isAdmin; // allow all authenticated non-admin users
  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl">Access denied (Products)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50/30">
      <Header active="products" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold font-title text-header mb-6">Manage Products</h2>

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
            {/* Date Range Filter */}
            <div className="relative">
              <button 
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="bg-green-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-900 transition text-sm font-medium"
              >
                <span>
                  {dateRange === 'custom' 
                    ? `${customDateRange.start} to ${customDateRange.end}`
                    : `Past ${dateRange} days`
                  }
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown filter */}
              {showDateFilter && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-2">
                    <button
                      onClick={() => { setDateRange('7'); setShowDateFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${dateRange === '7' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
                    >
                      Past 7 days
                    </button>
                    <button
                      onClick={() => { setDateRange('30'); setShowDateFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${dateRange === '30' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
                    >
                      Past 30 days
                    </button>
                    <button
                      onClick={() => { setDateRange('90'); setShowDateFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${dateRange === '90' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
                    >
                      Past 90 days
                    </button>
                    <button
                      onClick={() => { setDateRange('365'); setShowDateFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${dateRange === '365' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
                    >
                      Past year
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => { setShowCustomDateModal(true); setShowDateFilter(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Custom Date Range
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            <button onClick={() => setShowAddModal(true)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
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
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg">
                  <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Sort by</div>
                  <button 
                    onClick={() => handleSort('name')}
                    className={`flex w-full items-center justify-between rounded px-2 py-2 hover:bg-gray-50 ${
                      sortBy === 'name' ? 'bg-gray-100 font-medium' : ''
                    }`}
                  >
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button 
                    onClick={() => handleSort('stock')}
                    className={`flex w-full items-center justify-between rounded px-2 py-2 hover:bg-gray-50 ${
                      sortBy === 'stock' ? 'bg-gray-100 font-medium' : ''
                    }`}
                  >
                    Stock {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button 
                    onClick={() => handleSort('price')}
                    className={`flex w-full items-center justify-between rounded px-2 py-2 hover:bg-gray-50 ${
                      sortBy === 'price' ? 'bg-gray-100 font-medium' : ''
                    }`}
                  >
                    Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button 
                    onClick={() => handleSort('created_at')}
                    className={`flex w-full items-center justify-between rounded px-2 py-2 hover:bg-gray-50 ${
                      sortBy === 'created_at' ? 'bg-gray-100 font-medium' : ''
                    }`}
                  >
                    Date Added {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
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
              {loadingProducts ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    {products.length === 0 ? 'No products found. Click "Add Products" to get started.' : 'No products match your search criteria.'}
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.product_id} className="hover:bg-gray-100/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-header">{p.name}</span>
                          <span className="text-xs text-subheader">
                            {p.brand ? `${p.brand} • ` : ''}{p.category || 'Uncategorized'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-header">{p.currency} {parseFloat(p.price.toString()).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-header">
                      <span className={p.stock <= (p.reorder_level || 0) ? 'text-red-600 font-medium' : ''}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                        p.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : 'bg-gray-50 text-gray-700 ring-gray-600/20'
                      }`}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setEditingProduct(p)}
                          className="text-gray-700 hover:text-gray-900" 
                          title="Edit"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleArchiveProduct(p.product_id)}
                          className="text-red-600 hover:text-red-700" 
                          title="Archive"
                        >
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} products
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current page
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          page === currentPage
                            ? 'bg-emerald-700 text-white'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="px-2 py-2 text-sm text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
      {showAddModal && (
        <AddProductModal 
          onClose={() => setShowAddModal(false)}
          onSave={handleAddProduct}
        />
      )}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleUpdateProduct}
        />
      )}

      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Custom Date Range</h2>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setDateRange('custom');
                  setShowCustomDateModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
