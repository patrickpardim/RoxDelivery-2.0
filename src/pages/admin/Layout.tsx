import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  Layers,
  Users,
  Settings, 
  Menu,
  X,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

export default function AdminLayout() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch profile
    const fetchProfile = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
    };
    fetchProfile();
  }, [user, navigate]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Painel', path: '/admin' },
    { icon: ShoppingBag, label: 'Pedidos', path: '/admin/orders' },
    { icon: UtensilsCrossed, label: 'Cardápio', path: '/admin/menu' },
    { icon: Layers, label: 'Complementos', path: '/admin/addons' },
    { icon: Users, label: 'Clientes', path: '/admin/customers' },
    { icon: Settings, label: 'Configurações', path: '/admin/settings' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans">
      {/* Sidebar Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col bg-white border-r border-zinc-100 fixed h-full z-10 transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 flex items-center gap-3", isSidebarCollapsed && "justify-center px-2")}>
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hover:bg-zinc-100 p-1 rounded-md transition-colors">
            <Menu className="h-6 w-6 text-purple-600 cursor-pointer" />
          </button>
          {!isSidebarCollapsed && (
            <h1 className="text-xl font-bold text-purple-600 tracking-tight whitespace-nowrap overflow-hidden">
              RoxDelivery
            </h1>
          )}
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-purple-50 text-purple-700" 
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                  isSidebarCollapsed && "justify-center px-2"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-purple-600" : "text-zinc-400")} />
                {!isSidebarCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          {profile && (
            <a 
              href={`/menu/${profile.store_slug}`} 
              target="_blank" 
              rel="noreferrer"
              className={cn(
                "flex items-center gap-2 text-sm text-zinc-500 hover:text-purple-600 px-4 py-2 transition-colors",
                isSidebarCollapsed && "justify-center px-0"
              )}
              title={isSidebarCollapsed ? "Ver Cardápio Público" : undefined}
            >
              <ExternalLink className="h-5 w-5 shrink-0" />
              {!isSidebarCollapsed && <span className="whitespace-nowrap overflow-hidden">Ver Cardápio</span>}
            </a>
          )}
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 mt-2",
              isSidebarCollapsed && "justify-center px-0"
            )}
            onClick={handleSignOut}
            title={isSidebarCollapsed ? "Sair" : undefined}
          >
            <LogOut className={cn("h-5 w-5 shrink-0", !isSidebarCollapsed && "mr-2")} />
            {!isSidebarCollapsed && "Sair"}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2">
           <Menu className="h-6 w-6 text-purple-600" />
           <h1 className="text-lg font-bold text-purple-600">RoxDelivery</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-10 pt-20 px-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
               const isActive = location.pathname === item.path;
               return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium",
                    isActive 
                      ? "bg-purple-50 text-purple-700" 
                      : "text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-purple-600" : "text-zinc-400")} />
                  {item.label}
                </Link>
              );
            })}
            {profile && (
               <a 
                href={`/menu/${profile.store_slug}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-purple-600 px-3 py-3"
              >
                <ExternalLink className="h-5 w-5" />
                Ver Cardápio Público &rarr;
              </a>
            )}
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-6 md:p-10 pt-20 md:pt-10 overflow-y-auto bg-white transition-all duration-300",
        isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <Outlet context={{ profile }} />
      </main>
    </div>
  );
}
