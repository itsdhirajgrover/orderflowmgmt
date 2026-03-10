import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, CircularProgress, TextField, InputAdornment, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Snackbar, TablePagination, Tabs, Tab,
} from "@mui/material";
import { Search, Refresh, LocalShipping, Visibility, CheckCircle, DoneAll } from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const DispatchQueuePage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(0); // 0=to_be_dispatched, 1=dispatched
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionDialog, setActionDialog] = useState({ open: false, order: null, action: "" });
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const statusFilter = tab === 0 ? "to_be_dispatched" : "dispatched";

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

  const handleAction = async () => {
    if (!actionDialog.order) return;
    setActionLoading(true);
    const endpoint = actionDialog.action === "dispatch" ? "dispatch" : "close";
    try {
      await axios.post(
        `/api/orders/${actionDialog.order.id}/${endpoint}`,
        endpoint === "dispatch" ? { dispatch_notes: notes || null } : {},
        authHeader,
      );
      const label = endpoint === "dispatch" ? "dispatched" : "closed (delivered)";
      setSnackbar({ open: true, message: `Order ${actionDialog.order.order_number} ${label}`, severity: "success" });
      setActionDialog({ open: false, order: null, action: "" });
      setNotes("");
      fetchOrders();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Action failed", severity: "error" });
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
            <LocalShipping color="success" /> Dispatch Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {orders.length} order{orders.length !== 1 ? "s" : ""} in queue
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchOrders}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ borderBottom: "1px solid #e0e0e0" }}>
          <Tabs value={tab} onChange={(e, v) => { setTab(v); setPage(0); }} sx={{ px: 2 }}>
            <Tab label="Ready to Dispatch" />
            <Tab label="Dispatched (Pending Delivery)" />
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
            <LocalShipping sx={{ fontSize: 48, color: "#bdbdbd", mb: 1 }} />
            <Typography color="text.secondary">
              {tab === 0 ? "No orders ready for dispatch" : "No dispatched orders"}
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
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Items</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Grand Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>
                      {tab === 0 ? "Billed At" : "Dispatched At"}
                    </TableCell>
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
                        {tab === 0
                          ? order.billed_at ? new Date(order.billed_at).toLocaleDateString() : "—"
                          : order.dispatched_at ? new Date(order.dispatched_at).toLocaleDateString() : "—"
                        }
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/orders/${order.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {tab === 0 ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<LocalShipping />}
                            onClick={() => setActionDialog({ open: true, order, action: "dispatch" })}
                            sx={{ ml: 1, textTransform: "none", fontSize: 12 }}
                          >
                            Dispatch
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            color="info"
                            startIcon={<DoneAll />}
                            onClick={() => setActionDialog({ open: true, order, action: "close" })}
                            sx={{ ml: 1, textTransform: "none", fontSize: 12 }}
                          >
                            Mark Delivered
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

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, order: null, action: "" })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.action === "dispatch" ? "Dispatch Order" : "Mark as Delivered"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {actionDialog.action === "dispatch"
              ? `Dispatch order ${actionDialog.order?.order_number}?`
              : `Mark order ${actionDialog.order?.order_number} as delivered?`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customer: {actionDialog.order?.customer_name} | Total: ₹{actionDialog.order?.grand_total?.toLocaleString()}
          </Typography>
          {actionDialog.action === "dispatch" && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Dispatch Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionDialog({ open: false, order: null, action: "" }); setNotes(""); }}>Cancel</Button>
          <Button
            variant="contained"
            color={actionDialog.action === "dispatch" ? "success" : "info"}
            onClick={handleAction}
            disabled={actionLoading}
          >
            {actionLoading ? "Processing..." : actionDialog.action === "dispatch" ? "Dispatch" : "Mark Delivered"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DispatchQueuePage;
