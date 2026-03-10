import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, Button, Alert, MenuItem, Grid, Paper, Divider,
  IconButton, Breadcrumbs, Link, Snackbar, InputAdornment,
} from "@mui/material";
import {
  ArrowBack, Business, Phone, LocationOn, Save, RotateLeft, AccountBalance,
  Person, CreditCard,
} from "@mui/icons-material";
import axios from "axios";

const categories = [
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
];

const commPrefs = ["phone", "email", "whatsapp"];

const sectionHeaderSx = {
  display: "flex", alignItems: "center", gap: 1, py: 1.5, px: 2,
  bgcolor: "#f5f7fa", borderBottom: "2px solid #e0e0e0", borderRadius: "4px 4px 0 0",
};
const sectionIconSx = { color: "primary.main", fontSize: 20 };

const CreateCustomerPage = () => {
  const [form, setForm] = useState({
    name: "", contact_person: "",
    phone_primary: "", phone_secondary: "",
    email_primary: "", email_secondary: "",
    preferred_communication: "phone",
    billing_address_line1: "", billing_address_line2: "",
    billing_city: "", billing_state: "", billing_pincode: "",
    shipping_address_line1: "", shipping_address_line2: "",
    shipping_city: "", shipping_state: "", shipping_pincode: "",
    category: "silver", net_payment_terms: 30, credit_limit: 0,
    gst_number: "", pan_number: "",
    assigned_sales_rep_id: "", notes: "",
  });
  const [salesReps, setSalesReps] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [copyBilling, setCopyBilling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReps = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await axios.get("/api/users/", { headers: { Authorization: `Bearer ${token}` } });
        setSalesReps((res.data || []).filter((u) => u.role === "sales_rep" || u.role === "manager"));
      } catch { /* ignore */ }
    };
    fetchReps();
  }, []);

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (copyBilling && field.startsWith("billing_")) {
        const shipField = field.replace("billing_", "shipping_");
        next[shipField] = val;
      }
      return next;
    });
  };

  const handleCopyBilling = () => {
    setCopyBilling(!copyBilling);
    if (!copyBilling) {
      setForm((prev) => ({
        ...prev,
        shipping_address_line1: prev.billing_address_line1,
        shipping_address_line2: prev.billing_address_line2,
        shipping_city: prev.billing_city,
        shipping_state: prev.billing_state,
        shipping_pincode: prev.billing_pincode,
      }));
    }
  };

  const handleReset = () => {
    setForm({
      name: "", contact_person: "",
      phone_primary: "", phone_secondary: "",
      email_primary: "", email_secondary: "",
      preferred_communication: "phone",
      billing_address_line1: "", billing_address_line2: "",
      billing_city: "", billing_state: "", billing_pincode: "",
      shipping_address_line1: "", shipping_address_line2: "",
      shipping_city: "", shipping_state: "", shipping_pincode: "",
      category: "silver", net_payment_terms: 30, credit_limit: 0,
      gst_number: "", pan_number: "",
      assigned_sales_rep_id: "", notes: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      const token = localStorage.getItem("access_token");
      const payload = { ...form };
      if (!payload.assigned_sales_rep_id) delete payload.assigned_sales_rep_id;
      else payload.assigned_sales_rep_id = parseInt(payload.assigned_sales_rep_id);
      payload.net_payment_terms = parseInt(payload.net_payment_terms);
      payload.credit_limit = parseFloat(payload.credit_limit);
      await axios.post("/api/customers/", payload, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess("Customer created successfully!");
      handleReset();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create customer");
    } finally { setLoading(false); }
  };

  const fp = { size: "small", fullWidth: true, variant: "outlined", InputLabelProps: { shrink: true } };

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Top Bar */}
      <Paper elevation={0} sx={{ px: 3, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e0e0e0", bgcolor: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/customers")} size="small" sx={{ border: "1px solid #e0e0e0" }}><ArrowBack fontSize="small" /></IconButton>
          <Breadcrumbs separator="›" sx={{ fontSize: 14 }}>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/"); }} sx={{ fontSize: 14 }}>Dashboard</Link>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/customers"); }} sx={{ fontSize: 14 }}>Customers</Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>Add New Customer</Typography>
          </Breadcrumbs>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: 1100, mx: "auto", px: 3, py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Add New Customer</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Customer code will be auto-generated</Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

          <Grid container spacing={2.5}>
            {/* Business Info */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}><Business sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Business Information</Typography></Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}><TextField {...fp} label="Company / Customer Name" value={form.name} onChange={handleChange("name")} required /></Grid>
                    <Grid item xs={6}><TextField {...fp} label="Contact Person" value={form.contact_person} onChange={handleChange("contact_person")} /></Grid>
                    <Grid item xs={6}>
                      <TextField {...fp} select label="Category" value={form.category} onChange={handleChange("category")} required>
                        {categories.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={4}><TextField {...fp} label="Net Payment Terms (days)" type="number" value={form.net_payment_terms} onChange={handleChange("net_payment_terms")} required /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="Credit Limit (₹)" type="number" value={form.credit_limit} onChange={handleChange("credit_limit")} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} /></Grid>
                    <Grid item xs={4}>
                      <TextField {...fp} select label="Assigned Sales Rep" value={form.assigned_sales_rep_id} onChange={handleChange("assigned_sales_rep_id")}>
                        <MenuItem value="">— None —</MenuItem>
                        {salesReps.map((u) => <MenuItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</MenuItem>)}
                      </TextField>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Contact */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}><Phone sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Contact Details</Typography></Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}><TextField {...fp} label="Primary Phone" value={form.phone_primary} onChange={handleChange("phone_primary")} required /></Grid>
                    <Grid item xs={12}><TextField {...fp} label="Secondary Phone" value={form.phone_secondary} onChange={handleChange("phone_secondary")} /></Grid>
                    <Grid item xs={12}><TextField {...fp} label="Primary Email" type="email" value={form.email_primary} onChange={handleChange("email_primary")} /></Grid>
                    <Grid item xs={12}><TextField {...fp} label="Secondary Email" type="email" value={form.email_secondary} onChange={handleChange("email_secondary")} /></Grid>
                    <Grid item xs={12}>
                      <TextField {...fp} select label="Preferred Communication" value={form.preferred_communication} onChange={handleChange("preferred_communication")}>
                        {commPrefs.map((p) => <MenuItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</MenuItem>)}
                      </TextField>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Tax Info */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}><CreditCard sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Tax & Registration</Typography></Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}><TextField {...fp} label="GST Number" value={form.gst_number} onChange={handleChange("gst_number")} placeholder="e.g. 22AAAAA0000A1Z5" /></Grid>
                    <Grid item xs={6}><TextField {...fp} label="PAN Number" value={form.pan_number} onChange={handleChange("pan_number")} placeholder="e.g. ABCDE1234F" /></Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Notes */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}><Person sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Internal Notes</Typography></Box>
                <Box sx={{ p: 2.5 }}>
                  <TextField {...fp} multiline rows={3} label="Notes" value={form.notes} onChange={handleChange("notes")} placeholder="Any internal remarks..." />
                </Box>
              </Paper>
            </Grid>

            {/* Billing Address */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}><LocationOn sx={sectionIconSx} /><Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Billing Address</Typography></Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}><TextField {...fp} label="Address Line 1" value={form.billing_address_line1} onChange={handleChange("billing_address_line1")} /></Grid>
                    <Grid item xs={12}><TextField {...fp} label="Address Line 2" value={form.billing_address_line2} onChange={handleChange("billing_address_line2")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="City" value={form.billing_city} onChange={handleChange("billing_city")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="State" value={form.billing_state} onChange={handleChange("billing_state")} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="Pincode" value={form.billing_pincode} onChange={handleChange("billing_pincode")} /></Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Shipping Address */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ ...sectionHeaderSx, justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationOn sx={sectionIconSx} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>Shipping Address</Typography>
                  </Box>
                  <Button size="small" onClick={handleCopyBilling} sx={{ textTransform: "none", fontSize: 11 }}>
                    {copyBilling ? "✓ Synced with Billing" : "Copy from Billing"}
                  </Button>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}><TextField {...fp} label="Address Line 1" value={form.shipping_address_line1} onChange={handleChange("shipping_address_line1")} disabled={copyBilling} /></Grid>
                    <Grid item xs={12}><TextField {...fp} label="Address Line 2" value={form.shipping_address_line2} onChange={handleChange("shipping_address_line2")} disabled={copyBilling} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="City" value={form.shipping_city} onChange={handleChange("shipping_city")} disabled={copyBilling} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="State" value={form.shipping_state} onChange={handleChange("shipping_state")} disabled={copyBilling} /></Grid>
                    <Grid item xs={4}><TextField {...fp} label="Pincode" value={form.shipping_pincode} onChange={handleChange("shipping_pincode")} disabled={copyBilling} /></Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Action Bar */}
          <Paper variant="outlined" sx={{ mt: 3, p: 2, display: "flex", justifyContent: "flex-end", gap: 2, borderRadius: 2, bgcolor: "#fff" }}>
            <Button variant="outlined" color="inherit" startIcon={<RotateLeft />} onClick={handleReset} sx={{ textTransform: "none", fontWeight: 600 }}>Reset</Button>
            <Button variant="outlined" onClick={() => navigate("/customers")} sx={{ textTransform: "none", fontWeight: 600 }}>Cancel</Button>
            <Button type="submit" variant="contained" startIcon={<Save />} disabled={loading} sx={{ textTransform: "none", fontWeight: 600, px: 4 }}>
              {loading ? "Creating..." : "Create Customer"}
            </Button>
          </Paper>
        </form>
      </Box>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess("")} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccess("")}>{success}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateCustomerPage;
