import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import { ConfigProvider } from 'antd'
import UserLayout from './layouts/UserLayout'
import HomePage from './pages/HomePage'
import useAuthStore from './store/authStore'
import { useEffect } from 'react'

import api from './services/api';
import CampaignsPage from './pages/CampaignsPage'
import CampaignDetailPage from './pages/CampaignDetailPage'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCampaigns from './pages/admin/AdminCampaigns'
import AdminLedger from './pages/admin/AdminLedger'
import AdminUsers from './pages/admin/AdminUsers'
import ProfilePage from './pages/ProfilePage'
import { GoogleOAuthProvider } from '@react-oauth/google'

function App() {
  const restoreAuth = useAuthStore((state) => state.restoreAuth);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.get('/auth/me')
        .then(res => restoreAuth(res))
        .catch(() => {
          logout();
        });
    }
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
            <Route element={<UserLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="ledger" element={<AdminLedger />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ConfigProvider>
  )
}

export default App
