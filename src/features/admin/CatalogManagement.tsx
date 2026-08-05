import { useState, useMemo } from 'react';
import { 
  Edit, Trash2, PlusCircle, 
  Search, Loader2, MapPin, Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CategoryModal } from '../../components/admin/CategoryModal';
import { useCatalog } from '../../hooks/useCatalog';
import { Category } from '../../services/adminCatalogService';
import { useAuth } from '../../contexts/AuthContext';

export const CatalogManagement = () => {
  // Tab & View States
  const [activeTab, setActiveTab] = useState<'categories' | 'services'>('categories');
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // Get user from auth context for role-based access control
  const { user } = useAuth();

  // Use the central catalog hook for all data operations
  const { 
    categories, 
    services, 
    isLoadingCategories, 
    isLoadingServices,
    saveCategory, 
    deleteCategory, 
    deleteService 
  } = useCatalog(activeTab);

  const isAdmin = user?.role === 'admin';

  // --- DEBUG LOGS ---
  // console.log("[CatalogManagement] Categories state:", categories); // Keep if needed for specific component state debugging

  // This function now expects a simple object with a name, not FormData.
  // The CategoryModal component should be updated to pass this simpler object.
  const handleSaveCategory = async (categoryData: { name: string }, id?: string) => {
    try {
      // Convert the plain object to FormData for the saveCategory function
      const formData = new FormData();
      formData.append('name', categoryData.name);
      
      await saveCategory(formData, id);
      toast.success(`Category ${id ? 'updated' : 'created'} successfully!`);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredServices = useMemo(() => {
    const titleQuery = serviceSearch.toLowerCase().trim();
    const cityQuery = citySearch.toLowerCase().trim();

    return services.filter(s => {
      const titleMatch = titleQuery ? (s.title || "").toLowerCase().includes(titleQuery) : true;
      // Check vendor, user, and city existence before filtering
      const cityMatch = cityQuery ? (s.vendor?.user?.city || "").toLowerCase().includes(cityQuery) : true;
      return titleMatch && cityMatch;
    });
  }, [serviceSearch, citySearch, services]);

  // Optimization: Convert categories array to a Map for O(1) lookups
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(cat => map.set(cat.slug, cat.name));
    return map;
  }, [categories]);

  const getCategoryName = (slug: string) => {
    return categoryMap.get(slug) || slug;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <CategoryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        // The 'onSave' prop in CategoryModal needs to be updated to pass a { name: string } object.
        // Casting to 'any' here to prevent a temporary type error until the modal is refactored.
        onSave={handleSaveCategory as any} 
        category={editingCategory} 
      />
      
      {/* Header & View Controls */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Catalog Management</h1>
        
        <div className="flex items-center space-x-4">
          {/* Switch Categories/Services */}
          <div className="flex bg-white rounded-lg p-1 border shadow-sm">
            <button 
              onClick={() => setActiveTab('categories')} 
              className={`px-4 py-2 rounded-md transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Categories
            </button>
            <button 
              onClick={() => setActiveTab('services')} 
              className={`px-4 py-2 rounded-md transition-all ${activeTab === 'services' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Services
            </button>
          </div>
        </div>
      </div>

      { (isLoadingCategories && activeTab === 'categories') ||
        (isLoadingServices && activeTab === 'services') 
      ? (
        <div className="flex flex-col items-center justify-center p-20">
          <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-2" />
          <p className="text-gray-500">Loading catalog...</p>
        </div>
      ) : activeTab === 'categories' ? (
        /* --- CATEGORY SECTION --- */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category Details</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Add New Category Row */}
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center">
                    <button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }} disabled={!isAdmin} className={`flex items-center justify-center space-x-2 text-sm font-medium transition-colors ${isAdmin ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 cursor-not-allowed'}`}>
                      <PlusCircle size={18} />
                      <span>Add New Category</span>
                    </button>
                  </td>
                </tr>
                {categories.map(cat => (
                  <tr key={cat._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 flex items-center space-x-4">                      
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Tag className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{cat.name}</p>
                        <p className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">Slug: {cat.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {isAdmin && (
                          <>
                            <button onClick={() => { setEditingCategory(cat); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={18} /></button>
                            <button onClick={() => deleteCategory(cat)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      ) : (
        /* --- SERVICES SECTION --- */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center space-x-4 bg-gray-50/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                placeholder="Search by service title..."
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                placeholder="Filter by city..."
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Title</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredServices.length > 0 ? filteredServices.map(s => (
                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-800 max-w-[200px] truncate">{s.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.vendor?.businessName || 'Independent'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.vendor?.user?.city || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{getCategoryName(s.category)}</td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <button onClick={() => deleteService(s._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">No services found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};