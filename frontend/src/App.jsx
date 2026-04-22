import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import { ConfigProvider } from 'antd'
import UserLayout from './layouts/UserLayout'
import HomePage from './pages/HomePage'

function App() {
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
          }
        }
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<UserLayout />}>
            <Route path="/" element={<HomePage />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
