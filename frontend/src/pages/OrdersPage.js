import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  TextField,
  MenuItem,
  TablePagination,
  IconButton,
  Chip,
  Tooltip,
  InputAdornment,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Delete,
  Visibility,
  ArrowBack,
  Add,
  Search,
  Refresh,
  ShoppingCart,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const statusOptions = [
  { value: "pending_billing", label: "Pending Billing" },
  { value: "billed", label: "Billed" },
  { value: "to_be_dispatched", label: "To Be Dispatched" },
  { value: "dispatched", label: "Dispatched" },
  { value: "closed", label: "Closed" },
  { value: "collected", label: "Collected" },
  { value: "cancelled", label: "Cancelled" },
];

const OrdersPage = () => {
  const { role } = useAuth();
  const canManageOrders = ["manager", "sales_rep"].includes(role);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, order: null });
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const response = await axios.get("/api/orders/", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setOrders(response.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = [...orders].sort((a, b) => {
    let cmp = 0;
    if (sort === "created_at") cmp = new Date(a.created_at) - new Date(b.created_at);
    else if (sort === "grand_total") cmp = (a.grand_total || 0) - (b.grand_total || 0);
    else if (sort === "status") cmp = (a.status || "").localeCompare(b.status || "");
    else if (sort === "order_number") cmp = (a.order_number || "").localeCompare(b.order_number || "");
    else if (sort === "customer_name") cmp = (a.customer_name || "").localeCompare(b.customer_name || "");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const paginatedOrders = filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (field) => {
    if (sort === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSort(field); setSortDir("asc"); }
  };

  const handleDelete = async () => {
    if (!deleteDialog.order) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`/api/orders/${deleteDialog.order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteDialog({ open: false, order: null });
      fetchOrders();
    } catch (err) {
      setError("Failed to delete order");
      setDeleteDialog({ open: false, order: null });
    }
  };

  const getStatusChip = (status) => {
    const config = {
      pending_billing: { label: "Pending Billing", bg: "#fff3e0", color: "#e65100" },
      billed: { label: "Billed", bg: "#e3f2fd", color: "#1565c0" },
      to_be_dispatched: { label: "To Be Dispatched", bg: "#ede7f6", color: "#4527a0" },
      dispatched: { label: "Dispatched", bg: "#e0f2f1", color: "#00695c" },
      closed: { label: "Closed", bg: "#e8f5e9", color: "#2e7d32" },
      collected: { label: "Collected", bg: "#f3e5f5", color: "#6a1b9a" },
      cancelled: { label: "Cancelled", bg: "#fbe9e7", color: "#c62828" },
    };
    const c = config[status] || { label: status, bg: "#f5f5f5", color: "#666" };
    return <Chip label={c.label} size="small" sx={{ fontWeight: 600, fontSize: 11, height: 24, bgcolor: c.bg, color: c.color, border: "none" }} />;
  };

  const getPriorityChip = (priority) => {
    const config = { low: "default", medium: "info", high: "warning", urgent: "error" };
    const labels = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
    return <Chip label={labels[priority] || priority} size="small" color={config[priority] || "default"} variant="outlined" sx={{ fontWeight: 600, fontSize: 11, height: 24 }} />;
  };

  const thSx = {
    fontWeight: 700, fontSize: 12, textTransform: "uppercase",
    letterSpacing: 0.5, color: "#666", py: 1.5, cursor: "pointer",
    userSelect: "none", "&:hover": { color: "#333" },
  };

  const SortIcon = ({ field }) => {
    if (sort !== field) return null;
    return sortDir === "asc" ? <ArrowUpward sx={{ fontSize: 14, ml: 0.5 }} /> : <ArrowDownward sx={{ fontSize: 14, ml: 0.5 }} />;
  };

  // Summary stats
  const totalValue = orders.reduce((sum, o) => sum + (o.grand_total || 0), 0);
  const stats = [
    { label: "Total Orders", count: orders.length, color: "#1976d2" },
    { label: "Pending Billing", count: orders.filter((o) => o.status === "pending_billing").length, color: "#e65100" },
    { label: "Dispatched", count: orders.filter((o) => o.status === "dispatched").length, color: "#00695c" },
    { label: "Collected", count: orders.filter((o) => o.status === "collected").length, color: "#6a1b9a" },
    { label: "Total Value", count: `₹${totalValue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`, color: "#0277bd", isAmount: true },
  ];

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Top Bar */}
      <Paper
        elevation={0}
        sx={{
          px: 3, py: 1.5,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e0e0e0", bgcolor: "#fff",
          position: "sticky", top: 0, zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} size="small" sx={{ border: "1px solid #e0e0e0" }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Breadcrumbs separator="›" sx={{ fontSize: 14 }}>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/"); }} sx={{ fontSize: 14 }}>Dashboard</Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>Orders</Typography>
          </Breadcrumbs>
        </Box>
        {canManageOrders && <Button
          variant="contained" startIcon={<Add />} onClick={() => navigate("/create-order")}
          sx={{ textTransform: "none", fontWeight: 600, boxShadow: "0 2px 8px rgba(25,118,210,0.3)" }}
        >
          Create New Order
        </Button>}
      </Paper>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 3 }}>
        {/* Title & Stats */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Order Management</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            {stats.map((s) => (
              <Paper key={s.label} variant="outlined" sx={{ px: 2, py: 1, borderRadius: 2, minWidth: 90, textAlign: "center" }}>
                <Typography variant={s.isAmount ? "body1" : "h6"} sx={{ fontWeight: 700, color: s.color, fontSize: s.isAmount ? 14 : undefined }}>{s.count}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{s.label}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Table Card */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          {/* Toolbar */}
          <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e0e0e0", bgcolor: "#fafafa", gap: 2 }}>
            <TextField
              size="small" placeholder="Search by order #, customer name or code..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              sx={{ width: 340, bgcolor: "#fff", borderRadius: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" color="action" /></InputAdornment> }}
              onKeyDown={(e) => { if (e.key === "Enter") fetchOrders(); }}
            />
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ width: 170, bgcolor: "#fff" }} InputLabelProps={{ shrink: true }}>
                <MenuItem value="">All</MenuItem>
                {statusOptions.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
              <Button size="small" variant="outlined" onClick={fetchOrders} sx={{ textTransform: "none", fontWeight: 600 }}>
                Apply
              </Button>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={() => { setSearch(""); setStatusFilter(""); fetchOrders(); }} sx={{ border: "1px solid #e0e0e0", bgcolor: "#fff" }}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Table */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 6 }}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Loading orders...</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="error">{error}</Typography>
              <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={fetchOrders}>Retry</Button>
            </Box>
          ) : filteredOrders.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <ShoppingCart sx={{ fontSize: 48, color: "#bdbdbd", mb: 1 }} />
              <Typography variant="body1" color="text.secondary">{search || statusFilter ? "No orders match your filters" : "No orders found"}</Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      <TableCell sx={thSx} onClick={() => handleSort("order_number")}>Order # <SortIcon field="order_number" /></TableCell>
                      <TableCell sx={thSx} onClick={() => handleSort("customer_name")}>Customer <SortIcon field="customer_name" /></TableCell>
                      <TableCell sx={thSx}>Items</TableCell>
                      <TableCell sx={thSx}>Priority</TableCell>
                      <TableCell sx={thSx} onClick={() => handleSort("status")}>Status <SortIcon field="status" /></TableCell>
                      <TableCell sx={thSx} onClick={() => handleSort("grand_total")}>Grand Total <SortIcon field="grand_total" /></TableCell>
                      <TableCell sx={thSx}>Created By</TableCell>
                      <TableCell sx={thSx} onClick={() => handleSort("created_at")}>Created <SortIcon field="created_at" /></TableCell>
                      <TableCell sx={{ ...thSx, cursor: "default" }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedOrders.map((order) => (
                      <TableRow
                        key={order.id} hover
                        sx={{ "&:hover": { bgcolor: "#f5f8ff" }, transition: "background-color 0.15s", cursor: "pointer" }}
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#1976d2" }}>
                            {order.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {order.customer_name || "—"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{order.customer_code}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>{order.total_items} items · {order.total_quantity} qty</Typography>
                        </TableCell>
                        <TableCell>{getPriorityChip(order.priority)}</TableCell>
                        <TableCell>{getStatusChip(order.status)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                            ₹{(order.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{order.created_by_name || "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
                            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => navigate(`/orders/${order.id}`)} sx={{ color: "#1976d2" }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canManageOrders && <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => setDeleteDialog({ open: true, order })} sx={{ color: "#d32f2f" }}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div" count={filteredOrders.length} page={page}
                onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{ borderTop: "1px solid #e0e0e0", ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": { fontSize: 13 } }}
              />
            </>
          )}
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, order: null })}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete order <strong>{deleteDialog.order?.order_number}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, order: null })} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ textTransform: "none" }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrdersPage;
