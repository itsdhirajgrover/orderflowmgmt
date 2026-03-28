import React, { useState, useRef, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Alert, Paper, Tabs, Tab,
  InputAdornment, CircularProgress,
} from "@mui/material";
import { Phone, Lock, Email, Sms } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const [tab, setTab] = useState(0); // 0 = Email/Password, 1 = OTP
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithOtp, isAuthenticated } = useAuth();
  const otpRefs = useRef([]);

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!mobile.trim()) { setError("Please enter your mobile number"); return; }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post("/api/otp/send", { mobile: mobile.trim() });
      setOtpSent(true);
      setOtpExpiresIn(res.data.expires_in || 300);
      setCountdown(30); // 30 second cooldown before resend
      setOtp(["", "", "", "", "", ""]);
      setSuccess("OTP sent! Check your phone.");
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) { setError("Please enter the complete 6-digit OTP"); return; }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post("/api/otp/verify", { mobile: mobile.trim(), otp: otpValue });
      await loginWithOtp(res.data.access_token);
      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return; // only digits
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  if (isAuthenticated) return null;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f5f7fa" }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 420, width: "100%", borderRadius: 3 }}>
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1976d2" }}>
            OrderFlow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Neo Plast Chem Pvt. Ltd.
          </Typography>
        </Box>

        <Tabs
          value={tab}
          onChange={(e, v) => { setTab(v); setError(""); setSuccess(""); }}
          variant="fullWidth"
          sx={{ mb: 2, borderBottom: "1px solid #e0e0e0" }}
        >
          <Tab icon={<Lock sx={{ fontSize: 18 }} />} iconPosition="start" label="Password" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab icon={<Sms sx={{ fontSize: 18 }} />} iconPosition="start" label="Login via OTP" sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>

        {/* Password Login */}
        {tab === 0 && (
          <form onSubmit={handlePasswordLogin}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" color="action" /></InputAdornment> }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{ startAdornment: <InputAdornment position="start"><Lock fontSize="small" color="action" /></InputAdornment> }}
            />
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              sx={{ mt: 3, py: 1.5, fontWeight: 600, textTransform: "none" }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        )}

        {/* OTP Login */}
        {tab === 1 && (
          <Box>
            <TextField
              label="Mobile Number"
              fullWidth
              margin="normal"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); if (otpSent) { setOtpSent(false); setOtp(["", "", "", "", "", ""]); } }}
              placeholder="e.g. 9876543210"
              InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" color="action" /></InputAdornment> }}
              disabled={loading}
            />

            {!otpSent ? (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                sx={{ mt: 2, py: 1.5, fontWeight: 600, textTransform: "none" }}
                onClick={handleSendOtp}
                disabled={loading || !mobile.trim()}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Send OTP"}
              </Button>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1, textAlign: "center" }}>
                  Enter the 6-digit OTP sent to <strong>{mobile}</strong>
                </Typography>

                {/* OTP Input Boxes */}
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, my: 2 }} onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <TextField
                      key={idx}
                      inputRef={(el) => (otpRefs.current[idx] = el)}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      inputProps={{
                        maxLength: 1,
                        style: { textAlign: "center", fontSize: 22, fontWeight: 700, padding: "10px 0" },
                      }}
                      sx={{ width: 48, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                      variant="outlined"
                      autoFocus={idx === 0}
                    />
                  ))}
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  sx={{ py: 1.5, fontWeight: 600, textTransform: "none" }}
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.join("").length !== 6}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : "Verify & Sign In"}
                </Button>

                <Box sx={{ textAlign: "center", mt: 1.5 }}>
                  <Button
                    size="small"
                    onClick={handleSendOtp}
                    disabled={countdown > 0 || loading}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
                  </Button>
                </Box>
              </>
            )}

            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default LoginPage;
