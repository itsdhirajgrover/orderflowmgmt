import React from "react";
import { Container, Typography, Box } from "@mui/material";

import { useNavigate } from "react-router-dom";

const HomePage = () => (
  <Container maxWidth="sm">
    <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate("/")}>Back to Dashboard</Button>
    <Box sx={{ mt: 8, textAlign: "center" }}>
      <Typography variant="h3" component="h1" gutterBottom>
        OrderFlow Management
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Scalable order management for small businesses. Responsive design for web and mobile.
      </Typography>
    </Box>
  </Container>
);

export default HomePage;
