import React, { useState } from "react";
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
  Divider,
  Switch,
  FormControlLabel,
  IconButton,
  Breadcrumbs,
  Link,
  Snackbar,
  InputAdornment,
} from "@mui/material";
import {
  ArrowBack,
  Person,
  LocationOn,
  Phone,
  Save,
  RotateLeft,
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
const contactTypes = ["Home Phone", "Work Phone", "Fax", "Email", "Other"];
const countries = ["India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Japan", "Singapore"];

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

const sectionIconSx = {
  color: "primary.main",
  fontSize: 20,
};

const CreateUserPage = () => {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    password: "",
    role: roles[0].value,
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    contactType: contactTypes[0],
    contactValue: "",
    isPrimary: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleReset = () => {
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      mobile: "",
      password: "",
      role: roles[0].value,
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      contactType: contactTypes[0],
      contactValue: "",
      isPrimary: true,
    });
  };

  const contactTypeMap = {
    "Home Phone": "home_phone",
    "Work Phone": "work_phone",
    "Fax": "fax",
    "Email": "email",
    "Other": "other",
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("access_token");

      const contacts = [];
      if (form.contactValue.trim()) {
        contacts.push({
          contact_type: contactTypeMap[form.contactType] || "other",
          contact_value: form.contactValue.trim(),
          is_primary: form.isPrimary,
        });
      }

      const addresses = [];
      if (form.addressLine1.trim()) {
        addresses.push({
          address_line1: form.addressLine1.trim(),
          address_line2: form.addressLine2.trim() || null,
          city: form.city.trim(),
          state: form.state.trim(),
          postal_code: form.postalCode.trim(),
          country: form.country || "India",
          is_primary: true,
        });
      }

      await axios.post(
        "/api/users/",
        {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          mobile: form.mobile,
          password: form.password,
          role: form.role,
          contacts,
          addresses,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("User created successfully!");
      handleReset();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg || JSON.stringify(e)).join("; "));
      } else if (err.response) {
        setError(`Error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      } else {
        setError(`Network error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldProps = {
    size: "small",
    fullWidth: true,
    variant: "outlined",
    InputLabelProps: { shrink: true },
  };

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
            <Link
              underline="hover"
              color="inherit"
              href="#"
              onClick={(e) => { e.preventDefault(); navigate("/users"); }}
              sx={{ fontSize: 14 }}
            >
              Users
            </Link>
            <Typography color="text.primary" sx={{ fontSize: 14, fontWeight: 600 }}>
              Create New User
            </Typography>
          </Breadcrumbs>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1100, mx: "auto", px: 3, py: 3 }}>
        {/* Page Title */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a1a2e" }}>
              Create New User
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Fill in the details below to register a new user in the system
            </Typography>
          </Box>
        </Box>

        <form onSubmit={handleCreateUser}>
          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2.5}>
            {/* User Information Card */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}>
                  <Person sx={sectionIconSx} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>
                    User Information
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <TextField {...fieldProps} label="First Name" value={form.first_name} onChange={handleChange("first_name")} required />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField {...fieldProps} label="Last Name" value={form.last_name} onChange={handleChange("last_name")} required />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField {...fieldProps} label="Mobile Number" value={form.mobile} onChange={handleChange("mobile")} required />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField {...fieldProps} label="Email Address" type="email" value={form.email} onChange={handleChange("email")} required />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        {...fieldProps}
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange("password")}
                        required
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
                    <Grid item xs={6}>
                      <TextField {...fieldProps} select label="Role" value={form.role} onChange={handleChange("role")} required>
                        {roles.map((r) => (
                          <MenuItem key={r.value} value={r.value}>
                            {r.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Contact Information Card */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}>
                  <Phone sx={sectionIconSx} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>
                    Contact Information
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField {...fieldProps} select label="Contact Type" value={form.contactType} onChange={handleChange("contactType")} required>
                        {contactTypes.map((t) => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField {...fieldProps} label="Contact Value" placeholder="e.g. +91 98765 43210" value={form.contactValue} onChange={handleChange("contactValue")} required />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={form.isPrimary}
                            onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="body2" color="text.secondary">
                            Set as primary contact
                          </Typography>
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Address Card - Full Width */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={sectionHeaderSx}>
                  <LocationOn sx={sectionIconSx} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>
                    Address Details
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField {...fieldProps} label="Address Line 1" value={form.addressLine1} onChange={handleChange("addressLine1")} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField {...fieldProps} label="Address Line 2" value={form.addressLine2} onChange={handleChange("addressLine2")} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField {...fieldProps} label="City" value={form.city} onChange={handleChange("city")} required />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField {...fieldProps} label="State / Province" value={form.state} onChange={handleChange("state")} required />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField {...fieldProps} label="Postal Code" value={form.postalCode} onChange={handleChange("postalCode")} required />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField {...fieldProps} select label="Country" value={form.country} onChange={handleChange("country")} required>
                        <MenuItem value="">-- Select --</MenuItem>
                        {countries.map((c) => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Sticky Footer Action Bar */}
          <Paper
            variant="outlined"
            sx={{
              mt: 3,
              p: 2,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 2,
              borderRadius: 2,
              bgcolor: "#fff",
            }}
          >
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RotateLeft />}
              onClick={handleReset}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Reset Form
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate("/users")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={loading}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                px: 4,
                boxShadow: "0 2px 8px rgba(25,118,210,0.3)",
              }}
            >
              {loading ? "Creating..." : "Create User"}
            </Button>
          </Paper>
        </form>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={() => setSuccess("")} severity="success" variant="filled" sx={{ width: "100%" }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateUserPage;
