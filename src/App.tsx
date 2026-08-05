import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { Login } from "./features/auth/Login";
import ForgotPassword from "./features/auth/ForgotPassword";
import ResetPassword from "./features/auth/ResetPassword";
import { Register } from "./features/auth/Register";
import { Services } from "./features/services/Services";
import { ServiceDetail } from "./features/services/ServiceDetail";
import { Dashboard } from "./pages/Dashboard";
import { VendorDashboard } from "./features/vendor/VendorDashboard";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { BookService } from "./features/services/BookService";
import { BookingDetail } from "./features/bookings/BookingDetail";
import { AdminBookings } from "./features/admin/AdminBookings";
import { MyBookings } from "./features/bookings/MyBookings";
import { VendorProfile } from "./features/vendor/VendorProfile";
import VendorManagement from "./features/admin/VendorManagement";
import UserManagement from "./features/admin/UserManagement";
import { AdminAnalytics } from "./features/admin/AdminAnalytics";
import { AdminDisputes } from "./features/admin/AdminDisputes";
import { VendorServices } from "./features/vendor/VendorServices";
import { EditService } from "./features/services/EditService";
import { CatalogManagement } from "./features/admin/CatalogManagement";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import ProfilePage from "./components/ProfilePage";
import { PaymentVerifications } from "./features/admin/PaymentVerifications";
import { VendorDetailAdminView } from "./features/admin/VendorDetailAdminView";

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/:id" element={<ServiceDetail />} />
              <Route
                path="/book/:serviceId"
                element={
                  <ProtectedRoute>
                    <BookService />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["vendor"]}>
                    <VendorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/services"
                element={
                  <ProtectedRoute allowedRoles={["vendor"]}>
                    <VendorServices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/profile"
                element={
                  <ProtectedRoute allowedRoles={["vendor"]}>
                    <VendorProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/services/new"
                element={
                  <ProtectedRoute allowedRoles={["vendor"]}>
                    <EditService />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/services/edit/:id"
                element={
                  <ProtectedRoute allowedRoles={["vendor"]}>
                    <EditService />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/vendors/:id/details"
                element={<VendorDetailAdminView />}
              />

              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payments"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <PaymentVerifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/disputes"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDisputes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/vendors"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <VendorManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bookings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminBookings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings/:id"
                element={
                  <ProtectedRoute>
                    <BookingDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/catalog/*"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CatalogManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account-settings"
                element={
                  <ProtectedRoute>
                    <AccountSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={["customer"]}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
