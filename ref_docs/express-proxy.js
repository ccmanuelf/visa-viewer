// proxy-server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 3000;

// Enable CORS for your frontend
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true
}));

app.use(express.json());

// Proxy endpoint
app.post('/api', async (req, res) => {
  try {
    const apiKey = req.query.apiKey || "YOUR_API_KEY"; // Get from query or use default
    const action = req.query.action || "EXEC_QUERY"; // Get from query or use default
    
    // Make the request to the external API
    const response = await axios({
      method: 'post',
      url: `https://www.appsynergy.com/api?action=${action}&apiKey=${apiKey}`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: req.body // Forward the request body
    });
    
    // Return the API response to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Forward error details if available
    if (error.response) {
      res.status(error.response.status).json({
        error: 'API request failed',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Proxy server error',
        message: error.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});

// To use:
// 1. Install dependencies: npm install express cors axios
// 2. Run the server: node proxy-server.js
// 3. Update your frontend to call http://localhost:3000/api instead
