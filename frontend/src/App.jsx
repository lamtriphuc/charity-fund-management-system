import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import { ConfigProvider } from 'antd'
import UserLayout from './layouts/UserLayout'
import HomePage from './pages/HomePage'
import useAuthStore from './store/authStore'

import api from './services/api';
import CampaignsPage from './pages/CampaignsPage'
import CampaignDetailPage from './pages/CampaignDetailPage'
import AdminLayout from './layouts/AdminLayout'
import AdminCampaigns from './pages/admin/AdminCampaigns'
import AdminLedger from './pages/admin/AdminLedger'
import ProfilePage from './pages/ProfilePage'
import { GoogleOAuthProvider } from '@react-oauth/google'
import DonatePage from './pages/DonatePage'
import StatementPage from './pages/StatementPage'
import ProposeCampaignPage from './pages/ProposeCampaignPage'
import ManageCampaignPage from './pages/volunteer/ManageCampaignPage'
import AdminCampaignDetail from './pages/admin/AdminCampaignDetail'
import { useEffect } from 'react'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminDisbursements from './pages/admin/AdminDisbursements'
import AuditorLayout from './layouts/AuditorLayout'
import RoleBasedRoute from './layouts/RoleBasedRoute'
import AuditLogsPage from './pages/auditor/AuditLogsPage'
import AuditorProofsPage from './pages/auditor/AuditorProofsPage'
import AdminUser from './pages/admin/AdminUser'
import AdminKycManagement from './pages/admin/AdminKycManagement'


function App() {
  const { restoreAuth, logout } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      const hasRefreshToken = !!localStorage.getItem('refresh_token');
      if (!hasRefreshToken) return;

      try {
        const refreshRes = await api.post('/auth/refresh');

        localStorage.setItem(
          'access_token',
          refreshRes.access_token
        );

        const userData = await api.get('/auth/me');

        restoreAuth(userData);

      } catch (error) {
        logout();
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      window.removeEventListener(
        'auth-expired',
        handleAuthExpired
      );
    };
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563EB',
          fontFamily: 'inherit',
        },
        components: {
          Button: {
            // Ép tất cả nút Primary mang màu Cam (CTA) mà không cần dùng Tailwind đè lên
            colorPrimary: '#F59E0B',
            colorPrimaryHover: '#D97706', // Màu khi trỏ chuột vào (Cam đậm)
            colorPrimaryActive: '#B45309', // Màu khi bấm vào
            controlHeightLG: 56, // Cao 56px (tương đương h-14 của Tailwind)
            borderRadiusLG: 12, // Bo góc tròn (rounded-xl)
          },
          Input: {
            activeShadow: 'none',
            errorActiveShadow: 'none',
            hoverBorderColor: '#0F172A', // Khi trỏ chuột thì viền màu xanh đen mờ
            activeBorderColor: '#0F172A', // Khi focus thì viền màu xanh đen
            controlHeightLG: 48, // Nới rộng độ cao ô input luôn
            borderRadiusLG: 8,
          },
          Layout: {
            siderBg: '#0F172A',     // Nền của toàn bộ thanh Sidebar
            triggerBg: '#0F172A',   // Nền của nút gập/mở (<) ở dưới cùng
          },
          Menu: {
            darkItemBg: '#0F172A',      // Màu nền các nút menu
            darkSubMenuItemBg: '#0F172A',
            darkPopupBg: '#0F172A',     // Màu nền khi thu gọn sidebar sổ ra
          }
        }
      }}
    >
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC & USER ROUTES */}
            <Route element={<UserLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
              <Route path="/campaigns/:id/donate" element={<DonatePage />} />
              <Route path="/campaigns/:id/manage" element={<ManageCampaignPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/statements" element={<StatementPage />} />
              <Route path="/campaigns/propose" element={<ProposeCampaignPage />} />
            </Route>

            {/* AUTH ROUTES */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* ADMIN ROUTES */}
            <Route
              path="/admin"
              element={
                <RoleBasedRoute allowedRoles={['ADMIN']}>
                  <AdminLayout />
                </RoleBasedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="campaigns/:id" element={<AdminCampaignDetail />} />
              <Route path="ledger" element={<AdminLedger />} />
              <Route path="users" element={<AdminUser />} />
              <Route path="disbursements" element={<AdminDisbursements />} />
              <Route path="kycs" element={<AdminKycManagement />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>

            {/* AUDITOR ROUTES */}
            <Route
              path="/auditor"
              element={
                <RoleBasedRoute allowedRoles={['AUDITOR']}>
                  <AuditorLayout />
                </RoleBasedRoute>
              }>
              <Route index element={<Navigate to="audit-logs" replace />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="proofs" element={<AuditorProofsPage />} />
              <Route path="ledger" element={<AdminLedger />} />
            </Route>

          </Routes>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ConfigProvider>
  )
}

export default App
