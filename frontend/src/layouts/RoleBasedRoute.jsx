import useAuthStore from "../store/authStore";

const RoleBasedRoute = ({ children, allowedRoles }) => {
    const { user: currentUser } = useAuthStore();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    const userRole = typeof currentUser.role === 'string' ? currentUser.role : currentUser.role?.name;

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const hasRole = isSuperAdmin || allowedRoles.includes(userRole);

    if (!hasRole) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="p-8 text-center bg-white rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">403 - CẤM TRUY CẬP</h2>
                    <p className="text-gray-600">Tài khoản của bạn không có chức danh để vào khu vực này.</p>
                </div>
            </div>
        );
    }

    return children;
};

export default RoleBasedRoute;