import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/AuthProvider';

// Pages
import LandingPage from '@/pages/Landing';
import LoginPage from '@/pages/auth/Login';
import AdminLayout from '@/pages/admin/Layout';
import Dashboard from '@/pages/admin/Dashboard';
import Orders from '@/pages/admin/Orders';
import MenuManager from '@/pages/admin/MenuManager';
import Addons from '@/pages/admin/Addons';
import Customers from '@/pages/admin/Customers';
import Settings from '@/pages/admin/Settings';
import PublicMenu from '@/pages/PublicMenu';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/menu/:slug" element={<PublicMenu />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="menu" element={<MenuManager />} />
            <Route path="addons" element={<Addons />} />
            <Route path="customers" element={<Customers />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
