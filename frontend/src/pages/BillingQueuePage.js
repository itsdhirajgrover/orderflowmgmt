import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, CircularProgress, TextField, InputAdornment, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Snackbar, TablePagination,
} from "@mui/material";
import { Search, Refresh, Receipt, Visibility, CheckCircle } from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const BillingQueuePage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, order: null });
  const [billingNotes, setBillingNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/orders/", {
        ...authHeader,
        params: { status: "pending_billing", search: search || undefined },
      });
      setOrders(res.data);
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to load orders", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleConfirmBilling = async () => {
    if (!confirmDialog.order) return;
    setActionLoading(true);
    try {
      await axios.post(
        `/api/orders/${confirmDialog.order.id}/confirm-billing`,
        { billing_notes: billingNotes || null },
        authHeader,
      );
      setSnackbar({ open: true, message: `Order ${confirmDialog.order.order_number} billed successfully`, severity: "success" });
      setConfirmDialog({ open: false, order: null });
      setBillingNotes("");
      fetchOrders();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Billing failed", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const paginatedOrders = orders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
            <Receipt color="warning" /> Billing Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {orders.length} order{orders.length !== 1 ? "s" : ""} pending billing
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchOrders}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
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
            <Receipt sx={{ fontSize: 48, color: "#bdbdbd", mb: 1 }} />
            <Typography color="text.secondary">No orders pending billing</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Order #</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Items</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Grand Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
                          {order.order_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.customer_name || "—"}</TableCell>
                      <TableCell>{order.total_items}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>₹{order.grand_total?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.priority}
                          size="small"
                          color={order.priority === "high" || order.priority === "urgent" ? "error" : order.priority === "medium" ? "warning" : "default"}
                          variant="outlined"
                          sx={{ fontSize: 11, height: 22 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: "#666" }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/orders/${order.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          startIcon={<CheckCircle />}
                          onClick={() => setConfirmDialog({ open: true, order })}
                          sx={{ ml: 1, textTransform: "none", fontSize: 12 }}
                        >
                          Confirm Billing
                        </Button>
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

      {/* Confirm Billing Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, order: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Billing</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Confirm billing for order <strong>{confirmDialog.order?.order_number}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customer: {confirmDialog.order?.customer_name} | Total: ₹{confirmDialog.order?.grand_total?.toLocaleString()}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Billing Notes (optional)"
            value={billingNotes}
            onChange={(e) => setBillingNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmDialog({ open: false, order: null }); setBillingNotes(""); }}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleConfirmBilling} disabled={actionLoading}>
            {actionLoading ? "Processing..." : "Confirm Billing"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BillingQueuePage;
