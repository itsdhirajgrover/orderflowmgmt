import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, CircularProgress, TextField, InputAdornment, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Snackbar, TablePagination, Tabs, Tab,
  LinearProgress, Grid,
} from "@mui/material";
import { Search, Refresh, AccountBalanceWallet, Visibility, CheckCircle, Save, CalendarMonth } from "@mui/icons-material";
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
  const [paymentDialog, setPaymentDialog] = useState({ open: false, order: null });
  const [installments, setInstallments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
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

  // Generate month rows from order closed_at going forward 12 months
  const generateMonthGrid = (order) => {
    const startDate = order.closed_at ? new Date(order.closed_at) : new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      months.push({ key, label });
    }
    return months;
  };

  const openPaymentDialog = async (order) => {
    setPaymentDialog({ open: true, order });
    setPaymentLoading(true);
    try {
      const res = await axios.get(`/api/orders/${order.id}/payments`, authHeader);
      const existingPayments = res.data;
      const months = generateMonthGrid(order);
      const grid = months.map((m) => {
        const existing = existingPayments.find((p) => p.month === m.key);
        return {
          month: m.key,
          label: m.label,
          amount: existing ? existing.amount : "",
          notes: existing ? existing.notes || "" : "",
          id: existing ? existing.id : null,
        };
      });
      setInstallments(grid);
    } catch {
      setSnackbar({ open: true, message: "Failed to load payment data", severity: "error" });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSavePayments = async () => {
    if (!paymentDialog.order) return;
    setActionLoading(true);
    try {
      const validInstallments = installments
        .filter((inst) => inst.amount !== "" && Number(inst.amount) > 0)
        .map((inst) => ({
          month: inst.month,
          amount: Number(inst.amount),
          notes: inst.notes || null,
        }));

      // Also include months with 0 amount that previously had values (to clear them)
      const zeroMonths = installments
        .filter((inst) => inst.id && (inst.amount === "" || Number(inst.amount) <= 0))
        .map((inst) => ({
          month: inst.month,
          amount: 0,
          notes: null,
        }));

      await axios.post(
        `/api/orders/${paymentDialog.order.id}/payments`,
        { installments: [...validInstallments, ...zeroMonths] },
        authHeader,
      );
      setSnackbar({ open: true, message: "Payments saved successfully!", severity: "success" });
      setPaymentDialog({ open: false, order: null });
      fetchOrders();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Failed to save payments", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const updateInstallment = (index, field, value) => {
    setInstallments((prev) => prev.map((inst, i) => (i === index ? { ...inst, [field]: value } : inst)));
  };

  const paginatedOrders = orders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const isOverdue = (order) => {
    if (!order.payment_due_date) return false;
    return new Date(order.payment_due_date) < new Date();
  };

  const getCollectionProgress = (order) => {
    const total = order.grand_total || 0;
    const collected = order.total_collected || 0;
    if (total <= 0) return 100;
    return Math.min(100, Math.round((collected / total) * 100));
  };

  const dialogTotalCollected = installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);

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
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Collected</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Progress</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Payment Due</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#666" }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOrders.map((order) => {
                    const progress = getCollectionProgress(order);
                    return (
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
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: (order.total_collected || 0) > 0 ? "#2e7d32" : "#999" }}>
                          ₹{(order.total_collected || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                              flex: 1, height: 8, borderRadius: 4,
                              bgcolor: "#e0e0e0",
                              "& .MuiLinearProgress-bar": {
                                bgcolor: progress >= 100 ? "#2e7d32" : progress > 50 ? "#1976d2" : "#ed6c02",
                                borderRadius: 4,
                              },
                            }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 32 }}>{progress}%</Typography>
                        </Box>
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
                        ) : (order.total_collected || 0) > 0 ? (
                          <Chip label="Partial" size="small" color="info" sx={{ fontSize: 11, height: 22 }} />
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
                            color="primary"
                            startIcon={<CalendarMonth />}
                            onClick={() => openPaymentDialog(order)}
                            sx={{ ml: 1, textTransform: "none", fontSize: 12 }}
                          >
                            Record Payments
                          </Button>
                        )}
                        {tab === 1 && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<CalendarMonth />}
                            onClick={() => openPaymentDialog(order)}
                            sx={{ ml: 1, textTransform: "none", fontSize: 12 }}
                          >
                            View Payments
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
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

      {/* Month-wise Payment Grid Dialog */}
      <Dialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ open: false, order: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <CalendarMonth color="primary" />
          Payment Collection — {paymentDialog.order?.order_number}
        </DialogTitle>
        <DialogContent>
          {paymentLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              {/* Summary */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "#e3f2fd" }}>
                    <Typography variant="caption" color="text.secondary">Grand Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#1565c0" }}>
                      ₹{(paymentDialog.order?.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: dialogTotalCollected > 0 ? "#e8f5e9" : "#fff3e0" }}>
                    <Typography variant="caption" color="text.secondary">Total Collected</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: dialogTotalCollected >= (paymentDialog.order?.grand_total || 0) ? "#2e7d32" : "#ed6c02" }}>
                      ₹{dialogTotalCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "#fce4ec" }}>
                    <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#c62828" }}>
                      ₹{Math.max(0, (paymentDialog.order?.grand_total || 0) - dialogTotalCollected).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Progress bar */}
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, ((dialogTotalCollected / (paymentDialog.order?.grand_total || 1)) * 100))}
                  sx={{
                    height: 10, borderRadius: 5,
                    bgcolor: "#e0e0e0",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: dialogTotalCollected >= (paymentDialog.order?.grand_total || 0) ? "#2e7d32" : "#1976d2",
                      borderRadius: 5,
                    },
                  }}
                />
              </Box>

              {/* Month-wise grid */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Month-wise Collection
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Month</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, width: 180 }}>Amount (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Notes</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, width: 100 }} align="right">Running Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {installments.map((inst, idx) => {
                      const runningTotal = installments.slice(0, idx + 1).reduce((s, i) => s + (Number(i.amount) || 0), 0);
                      return (
                        <TableRow key={inst.month} hover sx={(Number(inst.amount) || 0) > 0 ? { bgcolor: "#f1f8e9" } : {}}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{inst.label}</Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={inst.amount}
                              onChange={(e) => updateInstallment(idx, "amount", e.target.value)}
                              placeholder="0.00"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                              }}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 160 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={inst.notes}
                              onChange={(e) => updateInstallment(idx, "notes", e.target.value)}
                              placeholder="Payment notes..."
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600, fontSize: 12,
                                color: runningTotal >= (paymentDialog.order?.grand_total || 0) ? "#2e7d32" : "#666",
                              }}
                            >
                              ₹{runningTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {dialogTotalCollected >= (paymentDialog.order?.grand_total || 0) && (paymentDialog.order?.grand_total || 0) > 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Full payment collected! Order will be marked as "Collected" on save.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog({ open: false, order: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Save />}
            onClick={handleSavePayments}
            disabled={actionLoading || paymentLoading}
          >
            {actionLoading ? "Saving..." : "Save Payments"}
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
