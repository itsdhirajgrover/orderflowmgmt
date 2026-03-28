import React from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import CreateUserPage from "./pages/CreateUserPage";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import CreateOrderPage from "./pages/CreateOrderPage";
import CustomersPage from "./pages/CustomersPage";
import CreateCustomerPage from "./pages/CreateCustomerPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import SKUCatalogPage from "./pages/SKUCatalogPage";
import BillingQueuePage from "./pages/BillingQueuePage";
import DispatchQueuePage from "./pages/DispatchQueuePage";
import CollectionQueuePage from "./pages/CollectionQueuePage";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetailPage />} />
              <Route path="/create-order" element={<ProtectedRoute allowedRoles={['manager', 'sales_rep']}><CreateOrderPage /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute allowedRoles={['manager', 'sales_rep']}><CustomersPage /></ProtectedRoute>} />
              <Route path="/customers/:customerId" element={<ProtectedRoute allowedRoles={['manager', 'sales_rep']}><CustomerDetailPage /></ProtectedRoute>} />
              <Route path="/create-customer" element={<ProtectedRoute allowedRoles={['manager']}><CreateCustomerPage /></ProtectedRoute>} />
              <Route path="/skus" element={<ProtectedRoute allowedRoles={['manager', 'sales_rep', 'billing_exec']}><SKUCatalogPage /></ProtectedRoute>} />
              <Route path="/billing-queue" element={<ProtectedRoute allowedRoles={['manager', 'billing_exec']}><BillingQueuePage /></ProtectedRoute>} />
              <Route path="/dispatch-queue" element={<ProtectedRoute allowedRoles={['manager', 'dispatch_agent']}><DispatchQueuePage /></ProtectedRoute>} />
              <Route path="/collection-queue" element={<ProtectedRoute allowedRoles={['manager', 'collection_exec']}><CollectionQueuePage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute allowedRoles={['manager']}><UsersPage /></ProtectedRoute>} />
              <Route path="/create-user" element={<ProtectedRoute allowedRoles={['manager']}><CreateUserPage /></ProtectedRoute>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
