import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, CircularProgress, TextField, InputAdornment, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Snackbar, TablePagination, Tabs, Tab,
} from "@mui/material";
import { Search, Refresh, AccountBalanceWallet, Visibility, CheckCircle } from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const CollectionQueuePage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(0); // 0=closed (pending collection), 1=collected
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, order: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const statusFilter = tab === 0 ? "closed" : "collected";

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/orders/", {
        ...authHeader,
        params: { status: statusFilter, search: search || undefined },
      });
      setOrders(res.data);
    } catch {
      setSnackbar({ open: true, message: "Failed to load orders", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCollect = async () => {
    if (!confirmDialog.order) return;
    setActionLoading(true);
    try {
      await axios.post(`/api/orders/${confirmDialog.order.id}/collect`, {}, authHeader);
      setSnackbar({ open: true, message: `Payment collected for ${confirmDialog.order.order_number}`, severity: "success" });
      setConfirmDialog({ open: false, order: null });
      fetchOrders();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Payment collection failed", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const paginatedOrders = orders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const isOverdue = (order) => {
    if (!order.payment_due_date) return false;
    return new Date(order.payment_due_date) < new Date();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
            <AccountBalanceWallet color="error" /> Payment Collection Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {orders.length} order{orders.length !== 1 ? "s" : ""} {tab === 0 ? "pending payment collection" : "collected"}
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchOrders}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ borderBottom: "1px solid #e0e0e0" }}>
          <Tabs value={tab} onChange={(e, v) => { setTab(v); setPage(0); }} sx={{ px: 2 }}>
            <Tab label="Pending Payment Collection" />
            <Tab label="Collected" />
          </Tabs>
        </Box>

        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #e0e0e0", bgcolor: "#fafafa" }}>
          <TextField
            size="small"
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ width: 350, bgcolor: "#fff" }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" color="action" /></InputAdornment> }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
            <CircularProgress size={36} />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <AccountBalanceWallet sx={{ fontSize: 48, color: "#bdbdbd", mb: 1 }} />
            <Typography color="text.secondary">
              {tab === 0 ? "No orders pending payment collection" : "No collected orders"}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Order #</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Grand Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Delivered At</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Payment Due</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      hover
                      sx={tab === 0 && isOverdue(order) ? { bgcolor: "#fff3e0" } : {}}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
                          {order.order_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.customer_name || "—"}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>₹{order.grand_total?.toLocaleString()}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: "#666" }}>
                        {order.closed_at ? new Date(order.closed_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        {order.payment_due_date ? (
                          <Chip
                            label={new Date(order.payment_due_date).toLocaleDateString()}
                            size="small"
                            color={isOverdue(order) ? "error" : "default"}
                            variant={isOverdue(order) ? "filled" : "outlined"}
                            sx={{ fontSize: 11, height: 22 }}
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {tab === 1 ? (
                          <Chip label="Collected" size="small" color="success" sx={{ fontSize: 11, height: 22 }} />
                        ) : isOverdue(order) ? (
                          <Chip label="Overdue" size="small" color="error" sx={{ fontSize: 11, height: 22 }} />
                        ) : (
                          <Chip label="Pending" size="small" color="warning" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/orders/${order.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {tab === 0 && (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<CheckCircle />}
                            onClick={() => setConfirmDialog({ open: true, order })}
                            sx={{ ml: 1, textTransform: "none", fontSize: 12 }}
                          >
                            Collect
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={orders.length}
              page={page}
              onPageChange={(e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Paper>

      {/* Confirm Payment Collection Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, order: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Payment Collection</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Mark payment collected for order <strong>{confirmDialog.order?.order_number}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customer: {confirmDialog.order?.customer_name}
          </Typography>
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: "#2e7d32" }}>
            ₹{confirmDialog.order?.grand_total?.toLocaleString()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, order: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleCollect} disabled={actionLoading}>
            {actionLoading ? "Processing..." : "Confirm Payment Collection"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CollectionQueuePage;
