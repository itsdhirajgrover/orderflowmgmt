import React from "react";
import { Box } from "@mui/material";

const Logo = ({ width = 220 }) => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
    <img src="/logo.png" alt="Company Logo" width={width} style={{ maxWidth: "100%", height: "auto" }} />
  </Box>
);

export default Logo;
