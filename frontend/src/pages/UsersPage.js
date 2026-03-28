import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  InputAdornment,
  TextField,
  Avatar,
  Tooltip,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Search,
  Refresh,
  PersonOutline,
  FilterList,
  Edit,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import axios from "axios";

const roles = [
  { value: "manager", label: "Manager" },
  { value: "sales_rep", label: "Sales Representative" },
  { value: "billing_exec", label: "Billing Executive" },
  { value: "dispatch_agent", label: "Dispatch Agent" },
  { value: "collection_exec", label: "Payment Collection Executive" },
];

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get("/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditOpen = (user) => {
    setEditUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      is_active: user.is_active,
      password: "",
    });
    setEditError("");
    setShowPassword(false);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditUser(null);
    setEditForm({});
    setEditError("");
  };

  const handleEditChange = (field) => (e) => {
    setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditError("");
    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        mobile: editForm.mobile,
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }
      await axios.put(`/api/users/${editUser.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ open: true, message: "User updated successfully!", severity: "success" });
      handleEditClose();
      fetchUsers();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setEditError(detail);
      } else if (Array.isArray(detail)) {
        setEditError(detail.map((e) => e.msg || JSON.stringify(e)).join("; "));
      } else {
        setEditError("Failed to update user");
      }
    } finally {
      setEditLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      manager: "warning",
      sales_rep: "primary",
      billing_exec: "info",
      dispatch_agent: "success",
      collection_exec: "secondary",
    };
    return colors[role] || "default";
  };

  const getRoleLabel = (role) => {
    const labels = {
      manager: "Manager",
      sales_rep: "Sales Rep",
      billing_exec: "Billing Exec",
      dispatch_agent: "Dispatch Agent",
      collection_exec: "Payment Collection Exec",
    };
    return labels[role] || role;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name[0].toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = ["#1976d2", "#388e3c", "#f57c00", "#d32f2f", "#7b1fa2", "#0288d1", "#c2185b"];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredUsers = users.filter(
    (u) =>
      `${u.first_name} ${u.last_name} ${u.email} ${u.role}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Top Bar */}
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e0e0e0",
          bgcolor: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} size="small" sx={{ border: "1px solid #e0e0e0" }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Breadcrumbs separator="›" sx={{ fontSize: 14 }}>
            <Link
              underline="hover"
              color="inherit"
              href="#"
              onClick={(e) => { e.preventDefault(); navigate("/"); }}
              sx={{ fontSize: 14 }}
            >
              Dashboard
            </Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>
              Users
            </Typography>
          </Breadcrumbs>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate("/create-user")}
          sx={{ textTransform: "none", fontWeight: 600, boxShadow: "0 2px 8px rgba(25,118,210,0.3)" }}
        >
          Add New User
        </Button>
      </Paper>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 3 }}>
        {/* Page Title & Stats */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>
              Users Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
            </Typography>
          </Box>
          {/* Summary Cards */}
          <Box sx={{ display: "flex", gap: 2 }}>
            {[
              { label: "Total Users", count: users.length, color: "#1976d2" },
              { label: "Active", count: users.filter((u) => u.is_active).length, color: "#2e7d32" },
              { label: "Managers", count: users.filter((u) => u.role === "manager").length, color: "#ed6c02" },
            ].map((stat) => (
              <Paper
                key={stat.label}
                variant="outlined"
                sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 100, textAlign: "center" }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: stat.color }}>
                  {stat.count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Table Card */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          {/* Toolbar */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #e0e0e0",
              bgcolor: "#fafafa",
            }}
          >
            <TextField
              size="small"
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              sx={{ width: 350, bgcolor: "#fff", borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={fetchUsers} sx={{ border: "1px solid #e0e0e0", bgcolor: "#fff" }}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Filter">
                <IconButton size="small" sx={{ border: "1px solid #e0e0e0", bgcolor: "#fff" }}>
                  <FilterList fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Table */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 6 }}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Loading users...
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="error">{error}</Typography>
              <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={fetchUsers}>
                Retry
              </Button>
            </Box>
          ) : filteredUsers.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <PersonOutline sx={{ fontSize: 48, color: "#bdbdbd", mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                {searchQuery ? "No users match your search" : "No users found"}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", py: 1.5 }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", py: 1.5 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", py: 1.5 }}>Contact</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", py: 1.5 }}>Address</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", py: 1.5 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", py: 1.5 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", py: 1.5 }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        hover
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: "#f5f8ff" },
                          transition: "background-color 0.15s",
                        }}
                      >
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: 13,
                                fontWeight: 700,
                                bgcolor: getAvatarColor(`${user.first_name} ${user.last_name}`),
                              }}
                            >
                              {getInitials(`${user.first_name} ${user.last_name}`)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                                {user.first_name} {user.last_name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const primary = (user.contacts || []).find((c) => c.is_primary) || (user.contacts || [])[0];
                            if (!primary) return <Typography variant="body2" color="text.disabled">—</Typography>;
                            const typeLabel = { mobile: "Mobile", home_phone: "Home", work_phone: "Work", fax: "Fax", email: "Email", other: "Other" };
                            return (
                              <Box>
                                <Typography variant="body2" sx={{ fontSize: 13 }}>{primary.contact_value}</Typography>
                                <Typography variant="caption" color="text.secondary">{typeLabel[primary.contact_type] || primary.contact_type}</Typography>
                              </Box>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const addr = (user.addresses || []).find((a) => a.is_primary) || (user.addresses || [])[0];
                            if (!addr) return <Typography variant="body2" color="text.disabled">—</Typography>;
                            return (
                              <Typography variant="body2" sx={{ fontSize: 13, maxWidth: 200 }} noWrap>
                                {[addr.city, addr.state].filter(Boolean).join(", ")}
                              </Typography>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getRoleLabel(user.role)}
                            color={getRoleColor(user.role)}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: 11, height: 24 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? "Active" : "Inactive"}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: 11,
                              height: 24,
                              bgcolor: user.is_active ? "#e8f5e9" : "#f5f5f5",
                              color: user.is_active ? "#2e7d32" : "#9e9e9e",
                              border: "none",
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit User">
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleEditOpen(user); }}
                              sx={{ color: "#1976d2", border: "1px solid #e0e0e0", "&:hover": { bgcolor: "#e3f2fd" } }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredUsers.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{
                  borderTop: "1px solid #e0e0e0",
                  ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": { fontSize: 13 },
                }}
              />
            </>
          )}
        </Paper>
      </Box>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e0e0e0", pb: 1.5 }}>
          Edit User
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEditError("")}>
              {editError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                label="First Name"
                value={editForm.first_name || ""}
                onChange={handleEditChange("first_name")}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                label="Last Name"
                value={editForm.last_name || ""}
                onChange={handleEditChange("last_name")}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                label="Email"
                type="email"
                value={editForm.email || ""}
                onChange={handleEditChange("email")}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                label="Mobile"
                value={editForm.mobile || ""}
                onChange={handleEditChange("mobile")}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                select
                label="Role"
                value={editForm.role || ""}
                onChange={handleEditChange("role")}
                InputLabelProps={{ shrink: true }}
              >
                {roles.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                size="small"
                fullWidth
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={editForm.password || ""}
                onChange={handleEditChange("password")}
                placeholder="Leave blank to keep current"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.is_active ?? true}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    color="success"
                  />
                }
                label={editForm.is_active ? "Active" : "Inactive"}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button onClick={handleEditClose} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={editLoading || !editForm.first_name || !editForm.last_name || !editForm.email || !editForm.mobile}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {editLoading ? <CircularProgress size={20} /> : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersPage;
