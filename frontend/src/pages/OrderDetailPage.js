import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
  Paper,
  Grid,
  IconButton,
  Breadcrumbs,
  Link,
  Chip,
  Divider,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Autocomplete,
  InputAdornment,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  Description,
  ShoppingCart,
  Business,
  Schedule,
  CheckCircle,
  LocalShipping,
  Receipt,
  AccountBalance,
  Undo,
  Add,
  DeleteOutline,
  CallSplit,
  OpenInNew,
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statusFlow = ["pending_billing", "billed", "to_be_dispatched", "dispatched", "closed", "collected"];

const statusLabels = {
  pending_billing: "Pending Billing",
  billed: "Billed",
  to_be_dispatched: "To Be Dispatched",
  dispatched: "Dispatched",
  closed: "Closed / Delivered",
  collected: "Payment Collected",
  cancelled: "Cancelled",
};

const sectionHeaderSx = {
  display: "flex", alignItems: "center", gap: 1,
  py: 1.5, px: 2, bgcolor: "#f5f7fa",
  borderBottom: "2px solid #e0e0e0", borderRadius: "4px 4px 0 0",
};
const sectionIconSx = { color: "primary.main", fontSize: 20 };

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.8, borderBottom: "1px solid #f0f0f0" }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, minWidth: 140 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>{value || "—"}</Typography>
  </Box>
);

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const { role } = useAuth();
  const canEditOrders = ["manager", "sales_rep"].includes(role);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ priority: "medium", internal_notes: "" });
  const [editLineItems, setEditLineItems] = useState([]);
  const [editCustomer, setEditCustomer] = useState(null);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [skuOptions, setSkuOptions] = useState([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [actionLoading, setActionLoading] = useState(false);
  const [billingDialog, setBillingDialog] = useState(false);
  const [splitDialog, setSplitDialog] = useState(false);
  const [splitItems, setSplitItems] = useState([]);
  const [splitNotes, setSplitNotes] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [dispatchDialog, setDispatchDialog] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`/api/orders/${orderId}`, authHeader);
      setOrder(response.data);
      setEditForm({ priority: response.data.priority, internal_notes: response.data.internal_notes || "" });
      setEditLineItems((response.data.line_items || []).map((li) => ({
        sku: { id: li.sku_id, sku_code: li.sku_code, name: li.sku_name, base_price: li.unit_price, gst_rate: li.gst_rate, unit: li.unit },
        quantity: li.quantity, unit_price: li.unit_price, gst_rate: li.gst_rate, discount_amount: li.discount_amount || 0,
      })));
      setEditCustomer({ id: response.data.customer_id, customer_code: response.data.customer_code, name: response.data.customer_name });
    } catch (err) {
      setError("Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  // Customer autocomplete for edit mode
  const fetchCustomers = useCallback(async (q) => {
    setCustomerLoading(true);
    try {
      const res = await axios.get(`/api/customers/autocomplete?q=${encodeURIComponent(q || "")}`, authHeader);
      setCustomerOptions(res.data);
    } catch { /* ignore */ }
    finally { setCustomerLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(() => fetchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch, editing, fetchCustomers]);

  // SKU autocomplete for edit mode
  const fetchSkus = useCallback(async (q) => {
    setSkuLoading(true);
    try {
      const res = await axios.get(`/api/skus/autocomplete?q=${encodeURIComponent(q || "")}`, authHeader);
      setSkuOptions(res.data);
    } catch { /* ignore */ }
    finally { setSkuLoading(false); }
  }, [token]);

  useEffect(() => {
    if (editing) fetchSkus("");
  }, [editing, fetchSkus]);

  const updateEditLineItem = (index, field, value) => {
    setEditLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, [field]: value } : li)));
  };

  const handleSkuSelect = (index, skuObj) => {
    if (!skuObj) { updateEditLineItem(index, "sku", null); return; }
    setEditLineItems((prev) => prev.map((li, i) =>
      i === index ? { ...li, sku: skuObj, unit_price: skuObj.base_price || 0, gst_rate: skuObj.gst_rate || 18 } : li
    ));
  };

  const addEditLineItem = () => {
    setEditLineItems((prev) => [...prev, { sku: null, quantity: 1, unit_price: 0, gst_rate: 18, discount_amount: 0 }]);
  };

  const removeEditLineItem = (index) => {
    if (editLineItems.length <= 1) return;
    setEditLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getEditLineTotal = (li) => {
    const base = li.quantity * li.unit_price;
    return base + base * (li.gst_rate / 100) - (li.discount_amount || 0);
  };

  const editSubtotal = editLineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
  const editTotalTax = editLineItems.reduce((s, li) => s + li.quantity * li.unit_price * (li.gst_rate / 100), 0);
  const editTotalDiscount = editLineItems.reduce((s, li) => s + (li.discount_amount || 0), 0);
  const editGrandTotal = editSubtotal + editTotalTax - editTotalDiscount;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (order.status === "pending_billing") {
        payload.line_items = editLineItems.filter((li) => li.sku).map((li) => ({
          sku_id: li.sku.id, sku_code: li.sku.sku_code, sku_name: li.sku.name,
          quantity: Number(li.quantity), unit: li.sku.unit || "pcs",
          unit_price: Number(li.unit_price), gst_rate: Number(li.gst_rate),
          discount_amount: Number(li.discount_amount || 0),
        }));
      }
      await axios.put(`/api/orders/${orderId}`, payload, authHeader);
      setEditing(false);
      setSnackbar({ open: true, message: "Order updated successfully!", severity: "success" });
      fetchOrder();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Failed to update order", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const performAction = async (endpoint, body = {}, successMsg) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/orders/${orderId}/${endpoint}`, body, authHeader);
      setSnackbar({ open: true, message: successMsg, severity: "success" });
      fetchOrder();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Action failed", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBilling = () => {
    performAction("confirm-billing", { billing_notes: billingNotes || null }, "Billing confirmed!");
    setBillingDialog(false);
    setBillingNotes("");
  };

  const handleMarkReadyDispatch = () => performAction("mark-ready-dispatch", {}, "Marked ready for dispatch!");
  const handleDispatch = () => {
    performAction("dispatch", { dispatch_notes: dispatchNotes || null }, "Order dispatched!");
    setDispatchDialog(false);
    setDispatchNotes("");
  };
  const handleClose = () => performAction("close", {}, "Order closed / delivered!");
  const handleCollect = () => performAction("collect", {}, "Payment collected!");
  const handleReverseCollection = () => performAction("reverse-collection", {}, "Payment collection reversed!");

  const openSplitDialog = () => {
    setSplitItems(
      (order.line_items || []).map((li) => ({
        line_item_id: li.id,
        sku_name: li.sku_name,
        sku_code: li.sku_code,
        total_quantity: li.quantity,
        ship_quantity: li.quantity,
        unit: li.unit,
      }))
    );
    setSplitNotes("");
    setSplitDialog(true);
  };

  const handleSplit = async () => {
    const itemsToSplit = splitItems.filter((si) => si.ship_quantity < si.total_quantity && si.ship_quantity >= 0);
    if (itemsToSplit.length === 0) {
      setSnackbar({ open: true, message: "Reduce ship quantity on at least one item to split", severity: "warning" });
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(`/api/orders/${orderId}/split`, {
        line_items: itemsToSplit.map((si) => ({ line_item_id: si.line_item_id, ship_quantity: si.ship_quantity })),
        split_notes: splitNotes || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: "Order split successfully! A new order has been created for the remaining items.", severity: "success" });
      setSplitDialog(false);
      fetchOrder();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Failed to split order", severity: "error" });
    } finally {
      setActionLoading(false);
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
    return <Chip label={c.label} size="small" sx={{ fontWeight: 700, fontSize: 12, bgcolor: c.bg, color: c.color, border: "none" }} />;
  };

  const getPriorityChip = (priority) => {
    const config = { low: "default", medium: "info", high: "warning", urgent: "error" };
    const labels = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
    return <Chip label={labels[priority] || priority} size="small" color={config[priority] || "default"} variant="outlined" sx={{ fontWeight: 600, fontSize: 12 }} />;
  };

  const fp = { size: "small", fullWidth: true, variant: "outlined", InputLabelProps: { shrink: true } };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: 2 }}>
        <Typography color="error">{error || "Order not found"}</Typography>
        <Button variant="outlined" onClick={() => navigate("/orders")}>Back to Orders</Button>
      </Box>
    );
  }

  const activeStep = statusFlow.indexOf(order.status);

  // Determine which workflow actions to show
  const actions = [];
  if (order.status === "pending_billing") {
    actions.push({ label: "Confirm Billing", icon: <Receipt />, color: "primary", onClick: () => setBillingDialog(true) });
    actions.push({ label: "Split Order", icon: <CallSplit />, color: "warning", onClick: openSplitDialog });
  }
  if (order.status === "billed") {
    actions.push({ label: "Mark Ready for Dispatch", icon: <CheckCircle />, color: "secondary", onClick: handleMarkReadyDispatch });
    actions.push({ label: "Split Order", icon: <CallSplit />, color: "warning", onClick: openSplitDialog });
  }
  if (order.status === "to_be_dispatched") {
    actions.push({ label: "Dispatch Order", icon: <LocalShipping />, color: "success", onClick: () => setDispatchDialog(true) });
  }
  if (order.status === "dispatched") {
    actions.push({ label: "Close / Confirm Delivery", icon: <CheckCircle />, color: "success", onClick: handleClose });
  }
  if (order.status === "closed") {
    actions.push({ label: "Mark Payment Collected", icon: <AccountBalance />, color: "primary", onClick: handleCollect });
  }
  if (order.status === "collected") {
    actions.push({ label: "Reverse Payment Collection", icon: <Undo />, color: "warning", onClick: handleReverseCollection });
  }

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
          <IconButton onClick={() => navigate("/orders")} size="small" sx={{ border: "1px solid #e0e0e0" }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Breadcrumbs separator="›" sx={{ fontSize: 14 }}>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/"); }} sx={{ fontSize: 14 }}>Dashboard</Link>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/orders"); }} sx={{ fontSize: 14 }}>Orders</Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>{order.order_number}</Typography>
          </Breadcrumbs>
        </Box>
        {canEditOrders && !editing && order.status === "pending_billing" ? (
          <Button variant="contained" startIcon={<Edit />} onClick={() => setEditing(true)} sx={{ textTransform: "none", fontWeight: 600 }}>
            Edit Order
          </Button>
        ) : editing ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Cancel />} onClick={() => setEditing(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving} sx={{ textTransform: "none", fontWeight: 600 }}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        ) : null}
      </Paper>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1300, mx: "auto", px: 3, py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Order {order.order_number}</Typography>
              {getStatusChip(order.status)}
              {getPriorityChip(order.priority)}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {order.customer_name} ({order.customer_code}) · Created {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            </Typography>
            {order.parent_order_number && (
              <Chip
                icon={<CallSplit sx={{ fontSize: 14 }} />}
                label={`Split from ${order.parent_order_number}`}
                size="small"
                color="info"
                variant="outlined"
                onClick={() => navigate(`/orders/${order.parent_order_id}`)}
                sx={{ mt: 0.5, cursor: "pointer", fontWeight: 600, fontSize: 11 }}
              />
            )}
            {order.child_orders && order.child_orders.length > 0 && (
              <Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {order.child_orders.map((child) => (
                  <Chip
                    key={child.id}
                    icon={<OpenInNew sx={{ fontSize: 12 }} />}
                    label={`Split → ${child.order_number} (${statusLabels[child.status] || child.status})`}
                    size="small"
                    color="warning"
                    variant="outlined"
                    onClick={() => navigate(`/orders/${child.id}`)}
                    sx={{ cursor: "pointer", fontWeight: 600, fontSize: 11 }}
                  />
                ))}
              </Box>
            )}
          </Box>
          <Paper variant="outlined" sx={{ px: 3, py: 1.5, textAlign: "center", borderRadius: 2, bgcolor: "#e3f2fd", borderColor: "#90caf9" }}>
            <Typography variant="caption" color="text.secondary">Grand Total</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1565c0" }}>
              ₹{(order.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Box>

        {/* Workflow Progress Stepper */}
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5, mb: 2.5 }}>
          <Stepper activeStep={activeStep >= 0 ? activeStep : 0} alternativeLabel>
            {statusFlow.map((s) => (
              <Step key={s} completed={statusFlow.indexOf(s) < activeStep}>
                <StepLabel>{statusLabels[s]}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Workflow Actions */}
        {actions.length > 0 && (
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 2.5, display: "flex", alignItems: "center", gap: 2, bgcolor: "#fffde7" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mr: 1 }}>Next Action:</Typography>
            {actions.map((a, i) => (
              <Button
                key={i} variant="contained" color={a.color} startIcon={a.icon}
                onClick={a.onClick} disabled={actionLoading}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {actionLoading ? "Processing..." : a.label}
              </Button>
            ))}
          </Paper>
        )}

        <Grid container spacing={2.5}>
          {/* Order Info + Customer */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={sectionHeaderSx}>
                <Description sx={sectionIconSx} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Order Information</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <InfoRow label="Order Number" value={order.order_number} />
                <InfoRow label="Order Date" value={new Date(order.order_date).toLocaleDateString("en-IN")} />
                <InfoRow label="Status" value={getStatusChip(order.status)} />
                <InfoRow label="Priority" value={getPriorityChip(order.priority)} />
                <InfoRow label="Created By" value={order.created_by_name} />
              </Box>
            </Paper>
          </Grid>

          {/* Customer Info */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={sectionHeaderSx}>
                <Business sx={sectionIconSx} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Customer</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <InfoRow label="Customer Name" value={order.customer_name} />
                <InfoRow label="Customer Code" value={order.customer_code} />
                <InfoRow label="Payment Due" value={order.payment_due_date ? new Date(order.payment_due_date).toLocaleDateString("en-IN") : null} />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Internal Notes</Typography>
                  <Typography variant="body2" sx={{ bgcolor: "#f5f5f5", p: 1.5, borderRadius: 1, minHeight: 40 }}>{order.internal_notes || "No notes"}</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Line Items */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ ...sectionHeaderSx, justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ShoppingCart sx={sectionIconSx} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>
                    Line Items ({editing && order.status === "pending_billing" ? editLineItems.length : order.total_items})
                  </Typography>
                </Box>
                {editing && order.status === "pending_billing" && (
                  <Button size="small" startIcon={<Add />} onClick={addEditLineItem} sx={{ textTransform: "none", fontWeight: 600 }}>Add Item</Button>
                )}
              </Box>

              {editing && order.status === "pending_billing" ? (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 40 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, minWidth: 250 }}>SKU / Product</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 90 }}>Qty</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 110 }}>Unit Price (₹)</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 80 }}>GST %</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 110 }}>Discount (₹)</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 110 }} align="right">Line Total (₹)</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 50 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {editLineItems.map((li, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ color: "#999", fontSize: 12 }}>{idx + 1}</TableCell>
                            <TableCell>
                              <Autocomplete
                                options={skuOptions}
                                getOptionLabel={(o) => `${o.sku_code} — ${o.name}`}
                                filterOptions={(x) => x}
                                value={li.sku}
                                onChange={(_, v) => handleSkuSelect(idx, v)}
                                onInputChange={(_, v) => fetchSkus(v)}
                                loading={skuLoading}
                                isOptionEqualToValue={(o, v) => o.id === v.id}
                                size="small"
                                renderInput={(params) => (
                                  <TextField {...params} variant="outlined" size="small" placeholder="Search SKU..."
                                    InputProps={{ ...params.InputProps, endAdornment: (<>{skuLoading ? <CircularProgress color="inherit" size={16} /> : null}{params.InputProps.endAdornment}</>) }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField variant="outlined" size="small" type="number" value={li.quantity}
                                onChange={(e) => updateEditLineItem(idx, "quantity", Math.max(0.01, Number(e.target.value)))}
                                inputProps={{ min: 0.01, step: 0.01 }} sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField variant="outlined" size="small" type="number" value={li.unit_price}
                                onChange={(e) => updateEditLineItem(idx, "unit_price", Math.max(0, Number(e.target.value)))}
                                inputProps={{ min: 0, step: 0.01 }} sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField variant="outlined" size="small" type="number" value={li.gst_rate}
                                onChange={(e) => updateEditLineItem(idx, "gst_rate", Math.max(0, Number(e.target.value)))}
                                inputProps={{ min: 0, step: 0.5 }} sx={{ width: 70 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField variant="outlined" size="small" type="number" value={li.discount_amount}
                                onChange={(e) => updateEditLineItem(idx, "discount_amount", Math.max(0, Number(e.target.value)))}
                                inputProps={{ min: 0, step: 0.01 }} sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>₹{getEditLineTotal(li).toFixed(2)}</Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" color="error" onClick={() => removeEditLineItem(idx)} disabled={editLineItems.length <= 1}>
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                          <TableCell colSpan={6} align="right"><Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12 }}>Grand Total</Typography></TableCell>
                          <TableCell align="right"><Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1565c0" }}>₹{editGrandTotal.toFixed(2)}</Typography></TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 3 }}>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{editSubtotal.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary">Tax</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{editTotalTax.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary">Discount</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#d32f2f" }}>-₹{editTotalDiscount.toFixed(2)}</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary">Grand Total</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "#1565c0" }}>₹{editGrandTotal.toFixed(2)}</Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>SKU Code</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Billed Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Unit</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Unit Price</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">GST %</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Tax</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Discount</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(order.line_items || []).map((li, idx) => (
                      <TableRow key={li.id} hover>
                        <TableCell sx={{ fontSize: 12, color: "#999" }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#1976d2" }}>{li.sku_code}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>{li.sku_name}</Typography>
                          {li.notes && <Typography variant="caption" color="text.secondary">{li.notes}</Typography>}
                        </TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{li.quantity}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontSize: 12, color: li.billed_quantity != null ? "#1565c0" : "#999" }}>{li.billed_quantity != null ? li.billed_quantity : "—"}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{li.unit}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: 12 }}>₹{li.unit_price.toFixed(2)}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: 12 }}>{li.gst_rate}%</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: 12 }}>₹{(li.tax_amount || 0).toFixed(2)}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: 12, color: "#d32f2f" }}>{li.discount_amount > 0 ? `-₹${li.discount_amount.toFixed(2)}` : "—"}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>₹{(li.line_total || 0).toFixed(2)}</Typography></TableCell>
                      </TableRow>
                    ))}
                    {/* Totals */}
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      <TableCell colSpan={8} />
                      <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>₹{(order.total_tax || 0).toFixed(2)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12, color: "#d32f2f" }}>{order.total_discount > 0 ? `-₹${(order.total_discount || 0).toFixed(2)}` : "—"}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1565c0" }}>₹{(order.grand_total || 0).toFixed(2)}</Typography></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 3 }}>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(order.subtotal || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary">Tax</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(order.total_tax || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary">Discount</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#d32f2f" }}>-₹{(order.total_discount || 0).toFixed(2)}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary">Grand Total</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#1565c0" }}>₹{(order.grand_total || 0).toFixed(2)}</Typography>
                </Box>
              </Box>
                </>
              )}
            </Paper>
          </Grid>

          {/* Workflow Timeline */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={sectionHeaderSx}>
                <Schedule sx={sectionIconSx} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Workflow Timeline</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <InfoRow label="Created At" value={new Date(order.created_at).toLocaleString("en-IN")} />
                    <InfoRow label="Last Updated" value={new Date(order.updated_at).toLocaleString("en-IN")} />
                    <InfoRow label="Billed At" value={order.billed_at ? new Date(order.billed_at).toLocaleString("en-IN") : null} />
                    <InfoRow label="Billed By" value={order.billed_by_name} />
                    {order.billing_notes && <InfoRow label="Billing Notes" value={order.billing_notes} />}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InfoRow label="Dispatched At" value={order.dispatched_at ? new Date(order.dispatched_at).toLocaleString("en-IN") : null} />
                    <InfoRow label="Dispatched By" value={order.dispatched_by_name} />
                    {order.dispatch_notes && <InfoRow label="Dispatch Notes" value={order.dispatch_notes} />}
                    <InfoRow label="Closed / Delivered At" value={order.closed_at ? new Date(order.closed_at).toLocaleString("en-IN") : null} />
                    <InfoRow label="Payment Due Date" value={order.payment_due_date ? new Date(order.payment_due_date).toLocaleDateString("en-IN") : null} />
                    <InfoRow label="Total Collected" value={
                      <Typography component="span" sx={{ fontWeight: 700, color: (order.total_collected || 0) >= (order.grand_total || 0) ? "#2e7d32" : "#ed6c02" }}>
                        ₹{(order.total_collected || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} / ₹{(order.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    } />
                    <InfoRow label="Payment Collected At" value={order.collected_at ? new Date(order.collected_at).toLocaleString("en-IN") : null} />
                    <InfoRow label="Collected By" value={order.collected_by_name} />
                  </Grid>
                </Grid>
                {/* Payment Installments Summary */}
                {order.payment_installments && order.payment_installments.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Payment Installments</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Month</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Amount</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Notes</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Collected By</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {order.payment_installments.map((p, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                                {new Date(p.month + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "#2e7d32" }}>
                                ₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, color: "#666" }}>{p.notes || "—"}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{p.collected_by_name || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Billing Confirmation Dialog */}
      <Dialog open={billingDialog} onClose={() => setBillingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Billing</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>Confirm billing for order <strong>{order.order_number}</strong>. This will move the order to "Billed" status.</Typography>
          <TextField fullWidth size="small" label="Billing Notes (optional)" value={billingNotes} onChange={(e) => setBillingNotes(e.target.value)} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBillingDialog(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button onClick={handleConfirmBilling} variant="contained" sx={{ textTransform: "none" }} disabled={actionLoading}>Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchDialog} onClose={() => setDispatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Dispatch Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>Dispatch order <strong>{order.order_number}</strong>.</Typography>
          <TextField fullWidth size="small" label="Dispatch Notes (optional)" value={dispatchNotes} onChange={(e) => setDispatchNotes(e.target.value)} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDispatchDialog(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button onClick={handleDispatch} variant="contained" color="success" sx={{ textTransform: "none" }} disabled={actionLoading}>Dispatch</Button>
        </DialogActions>
      </Dialog>

      {/* Split Order Dialog */}
      <Dialog open={splitDialog} onClose={() => setSplitDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Split Order — {order.order_number}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reduce the <strong>Ship Now</strong> quantity for items that are short. The remaining quantity will be moved to a new pending order.
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>SKU</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>ITEM</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">ORDERED</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">SHIP NOW</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">BACKORDER</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {splitItems.map((si, idx) => {
                  const remainder = Math.max(0, si.total_quantity - si.ship_quantity);
                  return (
                    <TableRow key={si.line_item_id}>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>{si.sku_code || "—"}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{si.sku_name}</Typography></TableCell>
                      <TableCell align="center"><Chip label={`${si.total_quantity} ${si.unit}`} size="small" variant="outlined" /></TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={si.ship_quantity}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(si.total_quantity, parseFloat(e.target.value) || 0));
                            setSplitItems((prev) => prev.map((item, i) => i === idx ? { ...item, ship_quantity: val } : item));
                          }}
                          inputProps={{ min: 0, max: si.total_quantity, step: 1 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${remainder} ${si.unit}`}
                          size="small"
                          color={remainder > 0 ? "warning" : "default"}
                          variant={remainder > 0 ? "filled" : "outlined"}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TextField fullWidth size="small" label="Split Notes (optional)" value={splitNotes} onChange={(e) => setSplitNotes(e.target.value)} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitDialog(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            onClick={handleSplit}
            variant="contained"
            color="warning"
            startIcon={<CallSplit />}
            sx={{ textTransform: "none", fontWeight: 600 }}
            disabled={actionLoading || splitItems.every((si) => si.ship_quantity >= si.total_quantity)}
          >
            {actionLoading ? "Splitting..." : "Split Order"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default OrderDetailPage;
