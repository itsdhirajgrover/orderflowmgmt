import React, { useState, useEffect } from "react";
import {
  Box, Typography, Grid, Paper, CircularProgress, Chip,
} from "@mui/material";
import {
  ShoppingCart, Receipt, LocalShipping, AccountBalanceWallet,
  People, TrendingUp, Inventory, CheckCircle,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, token, role } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("/api/users/dashboard-stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch {
        // Stats unavailable
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const roleLabels = {
    manager: "Manager",
    sales_rep: "Sales Rep",
    billing_exec: "Billing Executive",
    dispatch_agent: "Dispatch Agent",
    collection_exec: "Payment Collection Executive",
  };

  const statCards = [
    {
      label: "Total Orders",
      value: stats?.total_orders || 0,
      icon: <ShoppingCart sx={{ fontSize: 32 }} />,
      color: "#1976d2",
      path: "/orders",
      roles: "all",
    },
    {
      label: "Total Revenue",
      value: `₹${(stats?.total_revenue || 0).toLocaleString()}`,
      icon: <TrendingUp sx={{ fontSize: 32 }} />,
      color: "#2e7d32",
      roles: ["manager"],
    },
    {
      label: "Pending Billing",
      value: stats?.pending_billing || 0,
      icon: <Receipt sx={{ fontSize: 32 }} />,
      color: "#ed6c02",
      path: "/billing-queue",
      roles: ["manager", "billing_exec"],
    },
    {
      label: "To Be Dispatched",
      value: stats?.to_be_dispatched || 0,
      icon: <LocalShipping sx={{ fontSize: 32 }} />,
      color: "#0288d1",
      path: "/dispatch-queue",
      roles: ["manager", "dispatch_agent"],
    },
    {
      label: "Pending Payment Collection",
      value: stats?.pending_collection || 0,
      icon: <AccountBalanceWallet sx={{ fontSize: 32 }} />,
      color: "#c62828",
      path: "/collection-queue",
      roles: ["manager", "collection_exec"],
    },
    {
      label: "Active Customers",
      value: stats?.total_customers || 0,
      icon: <People sx={{ fontSize: 32 }} />,
      color: "#7b1fa2",
      path: "/customers",
      roles: ["manager", "sales_rep"],
    },
  ];

  const visibleCards = statCards.filter(
    (c) => c.roles === "all" || c.roles.includes(role)
  );

  const statusBreakdown = stats?.status_counts || {};

  const statusLabels = {
    pending_billing: { label: "Pending Billing", color: "#ed6c02" },
    billed: { label: "Billed", color: "#1976d2" },
    to_be_dispatched: { label: "To Be Dispatched", color: "#0288d1" },
    dispatched: { label: "Dispatched", color: "#2e7d32" },
    closed: { label: "Delivered", color: "#7b1fa2" },
    collected: { label: "Collected", color: "#388e3c" },
    cancelled: { label: "Cancelled", color: "#9e9e9e" },
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Welcome, {user?.first_name || "User"}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Role: {roleLabels[role] || role} | {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {visibleCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={card.label}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                cursor: card.path ? "pointer" : "default",
                transition: "all 0.2s",
                "&:hover": card.path ? { borderColor: card.color, boxShadow: `0 4px 12px ${card.color}20` } : {},
              }}
              onClick={() => card.path && navigate(card.path)}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: card.color, mt: 0.5 }}>
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color, opacity: 0.3 }}>{card.icon}</Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Order Status Breakdown - Manager & Sales Rep */}
      {(role === "manager" || role === "sales_rep") && Object.keys(statusBreakdown).length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Order Status Breakdown
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {Object.entries(statusBreakdown).map(([status, count]) => {
              const info = statusLabels[status] || { label: status, color: "#666" };
              return (
                <Chip
                  key={status}
                  label={`${info.label}: ${count}`}
                  sx={{
                    fontWeight: 600,
                    fontSize: 13,
                    px: 1,
                    bgcolor: `${info.color}15`,
                    color: info.color,
                    border: `1px solid ${info.color}40`,
                  }}
                />
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default DashboardPage;
