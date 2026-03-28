import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, TextField, InputAdornment, Chip, Breadcrumbs, Link,
  MenuItem, Pagination, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Grid,
} from "@mui/material";
import {
  ArrowBack, Search, Add, Refresh, Edit, Delete, Inventory, Save, Cancel,
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const statusColors = { active: "success", inactive: "default", discontinued: "error" };

const SKUCatalogPage = () => {
  const { role } = useAuth();
  const canManageSKU = role === "manager";
  const [skus, setSkus] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [form, setForm] = useState({ name: "", description: "", category: "", unit: "pcs", hsn_code: "", gst_rate: 18, base_price: 0 });
  const navigate = useNavigate();
  const rowsPerPage = 15;

  const fetchSkus = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get("/api/skus/", { headers: { Authorization: `Bearer ${token}` }, params });
      setSkus(res.data);
    } catch { setSkus([]); }
  };

  useEffect(() => { fetchSkus(); }, []);

  const handleAdd = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post("/api/skus/", { ...form, gst_rate: parseFloat(form.gst_rate), base_price: parseFloat(form.base_price) },
        { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: "SKU created", severity: "success" });
      setAddDialog(false);
      setForm({ name: "", description: "", category: "", unit: "pcs", hsn_code: "", gst_rate: 18, base_price: 0 });
      fetchSkus();
    } catch (err) { setSnackbar({ open: true, message: err.response?.data?.detail || "Failed", severity: "error" }); }
  };

  const handleEdit = async () => {
    if (!editDialog) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.put(`/api/skus/${editDialog.id}`, { ...form, gst_rate: parseFloat(form.gst_rate), base_price: parseFloat(form.base_price) },
        { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: "SKU updated", severity: "success" });
      setEditDialog(null);
      fetchSkus();
    } catch (err) { setSnackbar({ open: true, message: err.response?.data?.detail || "Failed", severity: "error" }); }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`/api/skus/${deleteDialog.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: "SKU deleted", severity: "success" });
      setDeleteDialog(null);
      fetchSkus();
    } catch (err) { setSnackbar({ open: true, message: err.response?.data?.detail || "Failed", severity: "error" }); }
  };

  const openEdit = (sku) => {
    setForm({ name: sku.name, description: sku.description || "", category: sku.category || "", unit: sku.unit, hsn_code: sku.hsn_code || "", gst_rate: sku.gst_rate, base_price: sku.base_price, status: sku.status });
    setEditDialog(sku);
  };

  const filtered = skus.filter((s) => {
    const q = search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q) || s.sku_code.toLowerCase().includes(q)) && (!statusFilter || s.status === statusFilter);
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const fp = { size: "small", fullWidth: true, variant: "outlined", InputLabelProps: { shrink: true } };

  const FormFields = () => (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}><TextField {...fp} label="SKU Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Grid>
      <Grid item xs={12}><TextField {...fp} label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} /></Grid>
      <Grid item xs={6}><TextField {...fp} label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Chemicals, Polymers" /></Grid>
      <Grid item xs={6}>
        <TextField {...fp} select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          {["pcs", "kg", "ltr", "mtr", "box", "ton"].map((u) => <MenuItem key={u} value={u}>{u.toUpperCase()}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={4}><TextField {...fp} label="HSN Code" value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} /></Grid>
      <Grid item xs={4}><TextField {...fp} label="GST Rate (%)" type="number" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} /></Grid>
      <Grid item xs={4}><TextField {...fp} label="Base Price (₹)" type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} /></Grid>
      {editDialog && (
        <Grid item xs={6}>
          <TextField {...fp} select label="Status" value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="discontinued">Discontinued</MenuItem>
          </TextField>
        </Grid>
      )}
    </Grid>
  );

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Top Bar */}
      <Paper elevation={0} sx={{ px: 3, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e0e0e0", bgcolor: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} size="small" sx={{ border: "1px solid #e0e0e0" }}><ArrowBack fontSize="small" /></IconButton>
          <Breadcrumbs separator="›" sx={{ fontSize: 14 }}>
            <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate("/"); }} sx={{ fontSize: 14 }}>Dashboard</Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>SKU Catalog</Typography>
          </Breadcrumbs>
        </Box>
        {canManageSKU && <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ name: "", description: "", category: "", unit: "pcs", hsn_code: "", gst_rate: 18, base_price: 0 }); setAddDialog(true); }} sx={{ textTransform: "none", fontWeight: 600 }}>
          Add SKU
        </Button>}
      </Paper>

      <Box sx={{ maxWidth: 1300, mx: "auto", px: 3, py: 3 }}>
        <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>SKU Catalog</Typography>
            <Typography variant="body2" color="text.secondary">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2" }}>{skus.length}</Typography>
              <Typography variant="caption" color="text.secondary">Total SKUs</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#2e7d32" }}>{skus.filter((s) => s.status === "active").length}</Typography>
              <Typography variant="caption" color="text.secondary">Active</Typography>
            </Paper>
          </Box>
        </Box>

        {/* Filters */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, display: "flex", gap: 2, alignItems: "center" }}>
          <TextField size="small" placeholder="Search by name or code..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} sx={{ minWidth: 280 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
          <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} sx={{ minWidth: 120 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="discontinued">Discontinued</MenuItem>
          </TextField>
          <IconButton onClick={fetchSkus} size="small" sx={{ border: "1px solid #e0e0e0" }}><Refresh fontSize="small" /></IconButton>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>SKU CODE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>NAME</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>CATEGORY</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>UNIT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>HSN</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>GST %</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>BASE PRICE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Inventory sx={{ fontSize: 48, color: "#ccc", mb: 1 }} />
                  <Typography color="text.secondary">No SKUs found</Typography>
                </TableCell></TableRow>
              ) : paginated.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{s.sku_code}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                    {s.description && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{s.description.substring(0, 50)}</Typography>}
                  </TableCell>
                  <TableCell><Typography variant="body2">{s.category || "—"}</Typography></TableCell>
                  <TableCell><Chip label={s.unit.toUpperCase()} size="small" variant="outlined" sx={{ fontSize: 10 }} /></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace" }}>{s.hsn_code || "—"}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{s.gst_rate}%</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace" }}>₹{(s.base_price || 0).toLocaleString()}</Typography></TableCell>
                  <TableCell><Chip label={s.status.charAt(0).toUpperCase() + s.status.slice(1)} size="small" color={statusColors[s.status] || "default"} variant="outlined" sx={{ fontWeight: 600, fontSize: 11 }} /></TableCell>
                  <TableCell align="center">
                    {canManageSKU && <>
                      <IconButton size="small" onClick={() => openEdit(s)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteDialog(s)}><Delete fontSize="small" /></IconButton>
                    </>}
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

      {/* Add Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New SKU</DialogTitle>
        <DialogContent><FormFields /></DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!form.name}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit SKU — {editDialog?.sku_code}</DialogTitle>
        <DialogContent><FormFields /></DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete SKU</DialogTitle>
        <DialogContent>Delete <b>{deleteDialog?.name}</b> ({deleteDialog?.sku_code})?</DialogContent>
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

export default SKUCatalogPage;
