import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Dashboard,
  ShoppingCart,
  People,
  Inventory,
  Receipt,
  LocalShipping,
  AccountBalanceWallet,
  Menu as MenuIcon,
  Logout,
  Person,
  AddShoppingCart,
  PersonAdd,
  GroupAdd,
  Category,
} from "@mui/icons-material";

const DRAWER_WIDTH = 260;

const roleLabels = {
  manager: "Manager",
  sales_rep: "Sales Rep",
  billing_exec: "Billing Exec",
  dispatch_agent: "Dispatch Agent",
  collection_exec: "Payment Collection Exec",
};

const roleColors = {
  manager: "#7b1fa2",
  sales_rep: "#1976d2",
  billing_exec: "#ed6c02",
  dispatch_agent: "#2e7d32",
  collection_exec: "#c62828",
};

// Navigation items with role-based visibility
const getNavItems = (role) => {
  const items = [
    { label: "Dashboard", path: "/", icon: <Dashboard />, roles: "all" },
    { label: "Orders", path: "/orders", icon: <ShoppingCart />, roles: "all" },
    { label: "Create Order", path: "/create-order", icon: <AddShoppingCart />, roles: ["manager", "sales_rep"] },
    { divider: true },
    { label: "Billing Queue", path: "/billing-queue", icon: <Receipt />, roles: ["manager", "billing_exec"] },
    { label: "Dispatch Queue", path: "/dispatch-queue", icon: <LocalShipping />, roles: ["manager", "dispatch_agent"] },
    { label: "Payment Collection Queue", path: "/collection-queue", icon: <AccountBalanceWallet />, roles: ["manager", "collection_exec"] },
    { divider: true },
    { label: "Customers", path: "/customers", icon: <People />, roles: ["manager", "sales_rep"] },
    { label: "SKU Catalog", path: "/skus", icon: <Category />, roles: ["manager", "sales_rep", "billing_exec"] },
    { divider: true },
    { label: "Users", path: "/users", icon: <GroupAdd />, roles: ["manager"] },
    { label: "Add User", path: "/create-user", icon: <PersonAdd />, roles: ["manager"] },
  ];

  return items.filter((item) => {
    if (item.divider) return true;
    if (item.roles === "all") return true;
    return item.roles.includes(role);
  });
};

const AppLayout = () => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Outlet />;
  }

  const navItems = getNavItems(user?.role);

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Brand */}
      <Box sx={{ px: 2, py: 2.5, borderBottom: "1px solid #e0e0e0" }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#1976d2", letterSpacing: -0.5 }}>
          OrderFlow
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Neo Plast Chem Pvt. Ltd.
        </Typography>
      </Box>

      {/* Nav Items */}
      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {navItems.map((item, idx) =>
          item.divider ? (
            <Divider key={`div-${idx}`} sx={{ my: 1 }} />
          ) : (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.3 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 1.5,
                  py: 1,
                  "&.Mui-selected": {
                    bgcolor: "#e3f2fd",
                    color: "#1976d2",
                    "& .MuiListItemIcon-root": { color: "#1976d2" },
                  },
                  "&:hover": { bgcolor: "#f5f5f5" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: "#666" }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: location.pathname === item.path ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          )
        )}
      </List>

      {/* User Info at Bottom */}
      <Box
        sx={{
          p: 2,
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: roleColors[user?.role] || "#1976d2",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {user?.first_name?.charAt(0)?.toUpperCase() || "U"}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {user?.first_name} {user?.last_name}
          </Typography>
          <Chip
            label={roleLabels[user?.role] || user?.role}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: `${roleColors[user?.role]}15`,
              color: roleColors[user?.role],
              mt: 0.3,
            }}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f8f9fa" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: "#fff",
          borderBottom: "1px solid #e0e0e0",
          color: "#333",
        }}
      >
        <Toolbar sx={{ minHeight: "56px !important" }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Account">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: roleColors[user?.role] || "#1976d2",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {user?.first_name?.charAt(0)?.toUpperCase() || "U"}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem disabled>
              <Person sx={{ mr: 1 }} /> {user?.first_name} {user?.last_name} ({roleLabels[user?.role]})
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                logout();
                navigate("/login");
              }}
            >
              <Logout sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar - Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>

      {/* Sidebar - Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: "1px solid #e0e0e0",
          },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          mt: "56px",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
