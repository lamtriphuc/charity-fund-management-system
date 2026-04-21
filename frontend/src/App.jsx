import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/admin/dashboard" element={
          <div className="p-10 text-center text-2xl font-bold text-green-600">
            Chào mừng bạn đến với Dashboard Admin!
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
