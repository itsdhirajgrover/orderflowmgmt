import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, Chip, IconButton, Breadcrumbs, Link, Button,
  TextField, MenuItem, Snackbar, Alert, Divider, Table, TableHead, TableRow, TableCell, TableBody,
} from "@mui/material";
import {
  ArrowBack, Edit, Save, Cancel, Business, Phone, LocationOn, CreditCard,
  ShoppingCart,
} from "@mui/icons-material";
import axios from "axios";

const categoryColors = { platinum: "#6a1b9a", gold: "#f9a825", silver: "#78909c", bronze: "#8d6e63" };
const statusColors = { active: "success", inactive: "default", blocked: "error" };
const categories = ["platinum", "gold", "silver", "bronze"];
const statuses = ["active", "inactive", "blocked"];

const sectionHeaderSx = {
  display: "flex", alignItems: "center", gap: 1, py: 1.5, px: 2,
  bgcolor: "#f5f7fa", borderBottom: "2px solid #e0e0e0", borderRadius: "4px 4px 0 0",
};
const sectionIconSx = { color: "primary.main", fontSize: 20 };

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: "flex", py: 0.8 }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, fontWeight: 500 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>{value || "—"}</Typography>
  </Box>
);

const CustomerDetailPage = () => {
  const { customerId } = useParams();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "true");
  const [editForm, setEditForm] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const [custRes, ordersRes] = await Promise.all([
          axios.get(`/api/customers/${customerId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`/api/orders/?customer_id=${customerId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        ]);
        setCustomer(custRes.data);
        setEditForm(custRes.data);
        setOrders(ordersRes.data || []);
      } catch {
        setSnackbar({ open: true, message: "Failed to load customer", severity: "error" });
      }
    };
    fetchData();
  }, [customerId]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.put(`/api/customers/${customerId}`, editForm, { headers: { Authorization: `Bearer ${token}` } });
      setCustomer(res.data);
      setEditMode(false);
      setSnackbar({ open: true, message: "Customer updated", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Update failed", severity: "error" });
    }
  };

  const handleChange = (field) => (e) => setEditForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (!customer) return <Box sx={{ p: 4 }}><Typography>Loading...</Typography></Box>;

  const fp = { size: "small", fullWidth: true, variant: "outlined", InputLabelProps: { shrink: true } };

  const statusTotals = {
    pending_billing: orders.filter((o) => o.status === "pending_billing").length,
    billed: orders.filter((o) => o.status === "billed").length,
    dispatched: orders.filter((o) => o.status === "dispatched").length,
    closed: orders.filter((o) => o.status === "closed").length,
  };

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Top Bar */}
      <Paper elevation={0} sx={{ px: 3, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e0e0e0", bgcolor: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/customers")} size="small" sx={{ border: "1px solid #e0e0e0" }}><ArrowBack fontSize="small" /></IconButton>
          <Breadcrumbs separator="›" sx={{ fontSize: 14 }}>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/"); }} sx={{ fontSize: 14 }}>Dashboard</Link>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/customers"); }} sx={{ fontSize: 14 }}>Customers</Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>{customer.customer_code}</Typography>
          </Breadcrumbs>
        </Box>
        {!editMode ? (
          <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditMode(true)} sx={{ textTransform: "none", fontWeight: 600 }}>Edit</Button>
        ) : (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Cancel />} onClick={() => { setEditMode(false); setEditForm(customer); }} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" startIcon={<Save />} onClick={handleSave} sx={{ textTransform: "none", fontWeight: 600 }}>Save</Button>
          </Box>
        )}
      </Paper>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: categoryColors[customer.category] || "#1976d2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>{customer.name.charAt(0)}</Typography>
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{customer.name}</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <Chip label={customer.customer_code} size="small" sx={{ fontFamily: "monospace", fontWeight: 600 }} />
              <Chip label={customer.category.charAt(0).toUpperCase() + customer.category.slice(1)} size="small"
                sx={{ bgcolor: categoryColors[customer.category] + "22", color: categoryColors[customer.category], fontWeight: 600 }} />
              <Chip label={customer.status.charAt(0).toUpperCase() + customer.status.slice(1)} size="small"
                color={statusColors[customer.status]} variant="outlined" sx={{ fontWeight: 600 }} />
            </Box>
          </Box>
        </Box>

        <Grid container spacing={2.5}>
          {/* Business Info */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={sectionHeaderSx}><Business sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Business Information</Typography></Box>
              <Box sx={{ p: 2.5 }}>
                {editMode ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}><TextField {...fp} label="Name" value={editForm.name} onChange={handleChange("name")} /></Grid>
                    <Grid item xs={6}><TextField {...fp} label="Contact Person" value={editForm.contact_person || ""} onChange={handleChange("contact_person")} /></Grid>
                    <Grid item xs={6}>
                      <TextField {...fp} select label="Category" value={editForm.category} onChange={handleChange("category")}>
                        {categories.map((c) => <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={4}><TextField {...fp} label="Payment Terms" type="number" value={editForm.net_payment_terms} onChange={handleChange("net_payment_terms")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="Credit Limit" type="number" value={editForm.credit_limit} onChange={handleChange("credit_limit")} /></Grid>
                    <Grid item xs={4}>
                      <TextField {...fp} select label="Status" value={editForm.status} onChange={handleChange("status")}>
                        {statuses.map((s) => <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
                      </TextField>
                    </Grid>
                  </Grid>
                ) : (
                  <>
                    <InfoRow label="Contact Person" value={customer.contact_person} />
                    <InfoRow label="Category" value={customer.category.charAt(0).toUpperCase() + customer.category.slice(1)} />
                    <InfoRow label="Payment Terms" value={`${customer.net_payment_terms} days`} />
                    <InfoRow label="Credit Limit" value={`₹${(customer.credit_limit || 0).toLocaleString()}`} />
                    <InfoRow label="Sales Rep" value={customer.assigned_sales_rep_name} />
                    <InfoRow label="GST Number" value={customer.gst_number} />
                    <InfoRow label="PAN Number" value={customer.pan_number} />
                  </>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Contact */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={sectionHeaderSx}><Phone sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Contact Details</Typography></Box>
              <Box sx={{ p: 2.5 }}>
                {editMode ? (
                  <Grid container spacing={2}>
                    <Grid item xs={6}><TextField {...fp} label="Primary Phone" value={editForm.phone_primary} onChange={handleChange("phone_primary")} /></Grid>
                    <Grid item xs={6}><TextField {...fp} label="Secondary Phone" value={editForm.phone_secondary || ""} onChange={handleChange("phone_secondary")} /></Grid>
                    <Grid item xs={6}><TextField {...fp} label="Primary Email" value={editForm.email_primary || ""} onChange={handleChange("email_primary")} /></Grid>
                    <Grid item xs={6}><TextField {...fp} label="Secondary Email" value={editForm.email_secondary || ""} onChange={handleChange("email_secondary")} /></Grid>
                  </Grid>
                ) : (
                  <>
                    <InfoRow label="Primary Phone" value={customer.phone_primary} />
                    <InfoRow label="Secondary Phone" value={customer.phone_secondary} />
                    <InfoRow label="Primary Email" value={customer.email_primary} />
                    <InfoRow label="Secondary Email" value={customer.email_secondary} />
                    <InfoRow label="Preferred" value={customer.preferred_communication} />
                  </>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Billing Address */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={sectionHeaderSx}><LocationOn sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Billing Address</Typography></Box>
              <Box sx={{ p: 2.5 }}>
                {editMode ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}><TextField {...fp} label="Line 1" value={editForm.billing_address_line1 || ""} onChange={handleChange("billing_address_line1")} /></Grid>
                    <Grid item xs={12}><TextField {...fp} label="Line 2" value={editForm.billing_address_line2 || ""} onChange={handleChange("billing_address_line2")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="City" value={editForm.billing_city || ""} onChange={handleChange("billing_city")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="State" value={editForm.billing_state || ""} onChange={handleChange("billing_state")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="Pincode" value={editForm.billing_pincode || ""} onChange={handleChange("billing_pincode")} /></Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2">
                    {[customer.billing_address_line1, customer.billing_address_line2, customer.billing_city, customer.billing_state, customer.billing_pincode].filter(Boolean).join(", ") || "—"}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Shipping Address */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={sectionHeaderSx}><LocationOn sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Shipping Address</Typography></Box>
              <Box sx={{ p: 2.5 }}>
                {editMode ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}><TextField {...fp} label="Line 1" value={editForm.shipping_address_line1 || ""} onChange={handleChange("shipping_address_line1")} /></Grid>
                    <Grid item xs={12}><TextField {...fp} label="Line 2" value={editForm.shipping_address_line2 || ""} onChange={handleChange("shipping_address_line2")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="City" value={editForm.shipping_city || ""} onChange={handleChange("shipping_city")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="State" value={editForm.shipping_state || ""} onChange={handleChange("shipping_state")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="Pincode" value={editForm.shipping_pincode || ""} onChange={handleChange("shipping_pincode")} /></Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2">
                    {[customer.shipping_address_line1, customer.shipping_address_line2, customer.shipping_city, customer.shipping_state, customer.shipping_pincode].filter(Boolean).join(", ") || "—"}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Recent Orders */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ ...sectionHeaderSx, justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ShoppingCart sx={sectionIconSx} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>
                    Orders ({orders.length})
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {Object.entries(statusTotals).filter(([,v]) => v > 0).map(([k, v]) => (
                    <Chip key={k} label={`${k.replace(/_/g, " ")}: ${v}`} size="small" variant="outlined" sx={{ fontSize: 10, textTransform: "capitalize" }} />
                  ))}
                </Box>
              </Box>
              {orders.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">No orders yet</Typography>
                  <Button variant="outlined" size="small" sx={{ mt: 1, textTransform: "none" }} onClick={() => navigate("/create-order")}>Create Order</Button>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#fafafa" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>ORDER #</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>DATE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>ITEMS</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>TOTAL</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>STATUS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.slice(0, 10).map((o) => (
                      <TableRow key={o.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/orders/${o.id}`)}>
                        <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{o.order_number}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{new Date(o.order_date).toLocaleDateString()}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{o.total_items} items</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(o.grand_total || 0).toLocaleString()}</Typography></TableCell>
                        <TableCell><Chip label={o.status.replace(/_/g, " ")} size="small" variant="outlined" sx={{ fontSize: 10, textTransform: "capitalize" }} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Grid>

          {/* Notes */}
          {customer.notes && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Internal Notes</Typography>
                <Typography variant="body2" color="text.secondary">{customer.notes}</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerDetailPage;
