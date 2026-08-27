import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { RoleSelectLanding } from './features/auth/RoleSelectLanding';
import { RiderLogin } from './features/auth/RiderLogin';
import { RiderRegister } from './features/auth/RiderRegister';
import { DriverLogin } from './features/auth/DriverLogin';
import { DriverRegister } from './features/auth/DriverRegister';
import { AdminLogin } from './features/auth/AdminLogin';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { RiderHome } from './features/rider/RiderHome';
import { ChooseDriver } from './features/rider/ChooseDriver';
import { PlanRide } from './features/rider/PlanRide';
import { PlannedRides } from './features/rider/PlannedRides';
import { FavoriteDrivers } from './features/rider/FavoriteDrivers';
import { RideHistory } from './features/rider/RideHistory';
import { SavedAddresses } from './features/rider/SavedAddresses';
import { DriverHome } from './features/driver/DriverHome';
import { DriverHistory } from './features/driver/DriverHistory';
import { AdminHome } from './features/admin/AdminHome';

export function App() {
  const status = useAuthStore((s) => s.status);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  if (status !== 'ready') {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelectLanding />} />
        <Route path="/rider/login" element={<RiderLogin />} />
        <Route path="/rider/register" element={<RiderRegister />} />
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route path="/driver/register" element={<DriverRegister />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/rider"
          element={
            <ProtectedRoute role="RIDER" redirectTo="/rider/login">
              <RiderHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/choose-driver"
          element={
            <ProtectedRoute role="RIDER" redirectTo="/rider/login">
              <ChooseDriver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/plan"
          element={
            <ProtectedRoute role="RIDER" redirectTo="/rider/login">
              <PlanRide />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/planned"
          element={
            <ProtectedRoute role="RIDER" redirectTo="/rider/login">
              <PlannedRides />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/favorites"
          element={
            <ProtectedRoute role="RIDER" redirectTo="/rider/login">
              <FavoriteDrivers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/history"
          element={
            <ProtectedRoute role="RIDER" redirectTo="/rider/login">
              <RideHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/addresses"
          element={
            <ProtectedRoute role="RIDER" redirectTo="/rider/login">
              <SavedAddresses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver"
          element={
            <ProtectedRoute role="DRIVER" redirectTo="/driver/login">
              <DriverHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/history"
          element={
            <ProtectedRoute role="DRIVER" redirectTo="/driver/login">
              <DriverHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN" redirectTo="/admin/login">
              <AdminHome />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
