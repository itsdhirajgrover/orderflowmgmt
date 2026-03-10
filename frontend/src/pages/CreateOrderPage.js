import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  MenuItem,
  Grid,
  Paper,
  IconButton,
  Breadcrumbs,
  Link,
  Snackbar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack,
  ShoppingCart,
  Description,
  Save,
  RotateLeft,
  Business,
  Add,
  DeleteOutline,
} from "@mui/icons-material";
import axios from "axios";

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const sectionHeaderSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  py: 1.5,
  px: 2,
  bgcolor: "#f5f7fa",
  borderBottom: "2px solid #e0e0e0",
  borderRadius: "4px 4px 0 0",
};

const sectionIconSx = { color: "primary.main", fontSize: 20 };

const CreateOrderPage = () => {
  const [customer, setCustomer] = useState(null);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [priority, setPriority] = useState("medium");
  const [internalNotes, setInternalNotes] = useState("");
  const [lineItems, setLineItems] = useState([
    { sku: null, skuSearch: "", quantity: 1, unit_price: 0, gst_rate: 18, discount_amount: 0 },
  ]);
  const [skuOptions, setSkuOptions] = useState([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch customer autocomplete
  const fetchCustomers = useCallback(async (q) => {
    setCustomerLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`/api/customers/autocomplete?q=${encodeURIComponent(q || "")}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomerOptions(res.data);
    } catch (e) { /* ignore */ }
    finally { setCustomerLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, fetchCustomers]);

  // Fetch SKU autocomplete
  const fetchSkus = useCallback(async (q) => {
    setSkuLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`/api/skus/autocomplete?q=${encodeURIComponent(q || "")}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSkuOptions(res.data);
    } catch (e) { /* ignore */ }
    finally { setSkuLoading(false); }
  }, []);

  // Load SKU options on mount
  useEffect(() => { fetchSkus(""); }, [fetchSkus]);

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, [field]: value } : li)));
  };

  const handleSkuSelect = (index, skuObj) => {
    if (!skuObj) {
      updateLineItem(index, "sku", null);
      return;
    }
    setLineItems((prev) => prev.map((li, i) =>
      i === index
        ? { ...li, sku: skuObj, unit_price: skuObj.base_price || 0, gst_rate: skuObj.gst_rate || 18 }
        : li
    ));
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { sku: null, skuSearch: "", quantity: 1, unit_price: 0, gst_rate: 18, discount_amount: 0 },
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const getLineTotal = (li) => {
    const base = li.quantity * li.unit_price;
    const tax = base * (li.gst_rate / 100);
    return base + tax - (li.discount_amount || 0);
  };

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
  const totalTax = lineItems.reduce((s, li) => s + li.quantity * li.unit_price * (li.gst_rate / 100), 0);
  const totalDiscount = lineItems.reduce((s, li) => s + (li.discount_amount || 0), 0);
  const grandTotal = subtotal + totalTax - totalDiscount;

  const handleReset = () => {
    setCustomer(null);
    setCustomerSearch("");
    setPriority("medium");
    setInternalNotes("");
    setLineItems([{ sku: null, skuSearch: "", quantity: 1, unit_price: 0, gst_rate: 18, discount_amount: 0 }]);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!customer) { setError("Please select a customer"); return; }
    if (lineItems.some((li) => !li.sku)) { setError("Please select a SKU for every line item"); return; }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        customer_id: customer.id,
        priority,
        internal_notes: internalNotes || null,
        line_items: lineItems.map((li) => ({
          sku_id: li.sku.id,
          sku_code: li.sku.sku_code,
          sku_name: li.sku.name,
          quantity: Number(li.quantity),
          unit: li.sku.unit || "pcs",
          unit_price: Number(li.unit_price),
          gst_rate: Number(li.gst_rate),
          discount_amount: Number(li.discount_amount || 0),
        })),
      };
      await axios.post("/api/orders/", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("Order created successfully!");
      handleReset();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const fp = { size: "small", fullWidth: true, variant: "outlined", InputLabelProps: { shrink: true } };

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
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/orders"); }} sx={{ fontSize: 14 }}>Orders</Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>Create New Order</Typography>
          </Breadcrumbs>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1300, mx: "auto", px: 3, py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Create New Order</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Select a customer and add line items to create a sales order</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <form onSubmit={handleCreateOrder}>
          <Grid container spacing={2.5}>
            {/* Customer & Order Info */}
            <Grid item xs={12} md={8}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}>
                  <Business sx={sectionIconSx} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Customer & Order Info</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <Autocomplete
                        options={customerOptions}
                        getOptionLabel={(o) => `${o.customer_code} — ${o.name}`}
                        filterOptions={(x) => x}
                        value={customer}
                        onChange={(_, v) => setCustomer(v)}
                        onInputChange={(_, v) => setCustomerSearch(v)}
                        loading={customerLoading}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        renderInput={(params) => (
                          <TextField {...params} {...fp} label="Customer *" placeholder="Search by name or code..."
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {customerLoading ? <CircularProgress color="inherit" size={18} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField {...fp} select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} required>
                        {priorities.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                      </TextField>
                    </Grid>
                    {customer && (
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#f5f7fa", borderRadius: 1 }}>
                          <Grid container spacing={1}>
                            <Grid item xs={3}><Typography variant="caption" color="text.secondary">Code</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{customer.customer_code}</Typography></Grid>
                            <Grid item xs={3}><Typography variant="caption" color="text.secondary">Category</Typography><Typography variant="body2" sx={{ fontWeight: 600, textTransform: "capitalize" }}>{customer.category}</Typography></Grid>
                            <Grid item xs={3}><Typography variant="caption" color="text.secondary">Credit Limit</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(customer.credit_limit || 0).toLocaleString("en-IN")}</Typography></Grid>
                            <Grid item xs={3}><Typography variant="caption" color="text.secondary">Payment Terms</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{customer.net_payment_terms || 30} days</Typography></Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Order Summary */}
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}>
                  <ShoppingCart sx={sectionIconSx} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Order Summary</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Items</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{lineItems.length}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Tax (GST)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{totalTax.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Discount</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#d32f2f" }}>-₹{totalDiscount.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Grand Total</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1565c0" }}>₹{grandTotal.toFixed(2)}</Typography>
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
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Line Items</Typography>
                  </Box>
                  <Button size="small" startIcon={<Add />} onClick={addLineItem} sx={{ textTransform: "none", fontWeight: 600 }}>Add Item</Button>
                </Box>
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
                      {lineItems.map((li, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ color: "#999", fontSize: 12 }}>{idx + 1}</TableCell>
                          <TableCell>
                            <Autocomplete
                              options={skuOptions}
                              getOptionLabel={(o) => `${o.sku_code} — ${o.name}`}
                              filterOptions={(x) => x}
                              value={li.sku}
                              onChange={(_, v) => handleSkuSelect(idx, v)}
                              onInputChange={(_, v) => { updateLineItem(idx, "skuSearch", v); fetchSkus(v); }}
                              loading={skuLoading}
                              isOptionEqualToValue={(o, v) => o.id === v.id}
                              size="small"
                              renderInput={(params) => (
                                <TextField {...params} variant="outlined" size="small" placeholder="Search SKU..."
                                  InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                      <>
                                        {skuLoading ? <CircularProgress color="inherit" size={16} /> : null}
                                        {params.InputProps.endAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField variant="outlined" size="small" type="number" value={li.quantity}
                              onChange={(e) => updateLineItem(idx, "quantity", Math.max(0.01, Number(e.target.value)))}
                              inputProps={{ min: 0.01, step: 0.01 }} sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField variant="outlined" size="small" type="number" value={li.unit_price}
                              onChange={(e) => updateLineItem(idx, "unit_price", Math.max(0, Number(e.target.value)))}
                              inputProps={{ min: 0, step: 0.01 }} sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField variant="outlined" size="small" type="number" value={li.gst_rate}
                              onChange={(e) => updateLineItem(idx, "gst_rate", Math.max(0, Number(e.target.value)))}
                              inputProps={{ min: 0, step: 0.5 }} sx={{ width: 70 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField variant="outlined" size="small" type="number" value={li.discount_amount}
                              onChange={(e) => updateLineItem(idx, "discount_amount", Math.max(0, Number(e.target.value)))}
                              inputProps={{ min: 0, step: 0.01 }} sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>₹{getLineTotal(li).toFixed(2)}</Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => removeLineItem(idx)} disabled={lineItems.length <= 1} sx={{ color: "#d32f2f" }}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}>
                  <Description sx={sectionIconSx} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Internal Notes</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <TextField {...fp} label="Notes" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} multiline rows={2} placeholder="Any internal remarks..." />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Action Bar */}
          <Paper
            variant="outlined"
            sx={{
              mt: 3, p: 2,
              display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2,
              borderRadius: 2, bgcolor: "#fff",
            }}
          >
            <Button variant="outlined" color="inherit" startIcon={<RotateLeft />} onClick={handleReset} sx={{ textTransform: "none", fontWeight: 600 }}>
              Reset Form
            </Button>
            <Button variant="outlined" onClick={() => navigate("/orders")} sx={{ textTransform: "none", fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              type="submit" variant="contained" startIcon={<Save />} disabled={loading}
              sx={{ textTransform: "none", fontWeight: 600, px: 4, boxShadow: "0 2px 8px rgba(25,118,210,0.3)" }}
            >
              {loading ? "Creating..." : "Create Order"}
            </Button>
          </Paper>
        </form>
      </Box>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess("")} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={() => setSuccess("")} severity="success" variant="filled" sx={{ width: "100%" }}>{success}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateOrderPage;
