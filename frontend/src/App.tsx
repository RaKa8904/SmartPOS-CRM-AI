import { Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import Pricing from "./pages/Pricing";
import Notifications from "./pages/Notifications";
import MLInsights from "./pages/MLInsights";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import RoleRoute from "./components/RoleRoute";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC ONLY WHEN LOGGED OUT */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* PROTECTED + LAYOUT */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/"
          element={
            <RoleRoute allowedRoles={["admin", "manager"]}>
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route path="/billing" element={<Billing />} />
        <Route
          path="/products"
          element={
            <RoleRoute allowedRoles={["admin", "manager"]}>
              <Products />
            </RoleRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <RoleRoute allowedRoles={["admin", "manager"]}>
              <Categories />
            </RoleRoute>
          }
        />
        <Route path="/customers" element={<Customers />} />
        <Route
          path="/pricing"
          element={
            <RoleRoute allowedRoles={["admin", "manager"]}>
              <Pricing />
            </RoleRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <RoleRoute allowedRoles={["admin", "manager"]}>
              <Notifications />
            </RoleRoute>
          }
        />
        <Route
          path="/ml"
          element={
            <RoleRoute allowedRoles={["admin", "manager"]}>
              <MLInsights />
            </RoleRoute>
          }
        />
      </Route>
    </Routes>
  );
}
