import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, TextField, InputAdornment, Chip, Avatar, Breadcrumbs, Link,
  MenuItem, Pagination, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
} from "@mui/material";
import {
  ArrowBack, Search, Add, Refresh, Edit, Delete, Visibility, Business,
  FilterList, Phone, Email,
} from "@mui/icons-material";
import axios from "axios";

const categoryColors = { platinum: "#6a1b9a", gold: "#f9a825", silver: "#78909c", bronze: "#8d6e63" };
const statusColors = { active: "success", inactive: "default", blocked: "error" };

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const navigate = useNavigate();
  const rowsPerPage = 15;

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get("/api/customers/", { headers: { Authorization: `Bearer ${token}` }, params });
      setCustomers(res.data);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`/api/customers/${deleteDialog.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: "Customer deleted", severity: "success" });
      setDeleteDialog(null);
      fetchCustomers();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Delete failed", severity: "error" });
    }
  };

  const filtered = customers.filter((c) => {
    const s = search.toLowerCase();
    return (
      (!s || c.name.toLowerCase().includes(s) || c.customer_code.toLowerCase().includes(s) || (c.phone_primary || "").includes(s)) &&
      (!categoryFilter || c.category === categoryFilter) &&
      (!statusFilter || c.status === statusFilter)
    );
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const stats = [
    { label: "Total", count: customers.length, color: "#1976d2" },
    { label: "Active", count: customers.filter((c) => c.status === "active").length, color: "#2e7d32" },
    { label: "Platinum", count: customers.filter((c) => c.category === "platinum").length, color: "#6a1b9a" },
    { label: "Gold", count: customers.filter((c) => c.category === "gold").length, color: "#f9a825" },
  ];

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Top Bar */}
      <Paper elevation={0} sx={{ px: 3, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e0e0e0", bgcolor: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} size="small" sx={{ border: "1px solid #e0e0e0" }}><ArrowBack fontSize="small" /></IconButton>
          <Breadcrumbs separator="›" sx={{ fontSize: 14 }}>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/"); }} sx={{ fontSize: 14 }}>Dashboard</Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>Customers</Typography>
          </Breadcrumbs>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate("/create-customer")} sx={{ textTransform: "none", fontWeight: 600 }}>
          Add Customer
        </Button>
      </Paper>

      <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 3 }}>
        {/* Header + Stats */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>Customer Master</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{filtered.length} customer{filtered.length !== 1 ? "s" : ""} found</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            {stats.map((s) => (
              <Paper key={s.label} variant="outlined" sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 90, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: s.color }}>{s.count}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Filters */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField size="small" placeholder="Search by name, code, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} sx={{ minWidth: 280 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
          <TextField select size="small" label="Category" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} sx={{ minWidth: 140 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="platinum">Platinum</MenuItem>
            <MenuItem value="gold">Gold</MenuItem>
            <MenuItem value="silver">Silver</MenuItem>
            <MenuItem value="bronze">Bronze</MenuItem>
          </TextField>
          <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} sx={{ minWidth: 120 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
          </TextField>
          <IconButton onClick={fetchCustomers} size="small" sx={{ border: "1px solid #e0e0e0" }}><Refresh fontSize="small" /></IconButton>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>CODE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>CUSTOMER NAME</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>CONTACT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>CATEGORY</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PAYMENT TERMS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>CREDIT LIMIT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>SALES REP</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Business sx={{ fontSize: 48, color: "#ccc", mb: 1 }} />
                  <Typography color="text.secondary">No customers found</Typography>
                </TableCell></TableRow>
              ) : paginated.map((c) => (
                <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/customers/${c.id}`)}>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace" }}>{c.customer_code}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: categoryColors[c.category] || "#1976d2", fontSize: 13 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography>
                        {c.contact_person && <Typography variant="caption" color="text.secondary">{c.contact_person}</Typography>}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Phone sx={{ fontSize: 12, color: "text.secondary" }} />
                        <Typography variant="caption">{c.phone_primary}</Typography>
                      </Box>
                      {c.email_primary && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Email sx={{ fontSize: 12, color: "text.secondary" }} />
                          <Typography variant="caption">{c.email_primary}</Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={c.category.charAt(0).toUpperCase() + c.category.slice(1)} size="small"
                      sx={{ fontWeight: 600, fontSize: 11, bgcolor: categoryColors[c.category] + "22", color: categoryColors[c.category], border: `1px solid ${categoryColors[c.category]}44` }} />
                  </TableCell>
                  <TableCell><Typography variant="body2">{c.net_payment_terms} days</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace" }}>₹{(c.credit_limit || 0).toLocaleString()}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{c.assigned_sales_rep_name || "—"}</Typography></TableCell>
                  <TableCell><Chip label={c.status.charAt(0).toUpperCase() + c.status.slice(1)} size="small" color={statusColors[c.status] || "default"} variant="outlined" sx={{ fontWeight: 600, fontSize: 11 }} /></TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => navigate(`/customers/${c.id}`)}><Visibility fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => navigate(`/customers/${c.id}?edit=true`)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteDialog(c)}><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
          </Box>
        )}
      </Box>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>Delete <b>{deleteDialog?.name}</b> ({deleteDialog?.customer_code})? This cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomersPage;
