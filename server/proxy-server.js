// proxy-server.js
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();
const app = express();
const PORT = 3000;

// Enable CORS for the frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5176'], // Frontend URLs (Vite defaults)
  credentials: true
}));

app.use(express.json());

// Proxy endpoint
app.post('/api', async (req, res) => {
  try {
    // Get API key from query parameters or environment variable
    const apiKey = req.query.apiKey || process.env.VITE_API_KEY;
    // Default action is EXEC_QUERY for SELECT statements
    const action = req.query.action || "EXEC_QUERY";
    
    if (!apiKey) {
      return res.status(400).json({
        status: "ERROR",
        errorMessage: "API Key is required"
      });
    }
    
    console.log('Proxying request to AppSynergy API');
    console.log('Request body:', JSON.stringify(req.body));
    
    // Format the request exactly as specified in the AppSynergy documentation
    // The API expects action and apiKey in the URL, and sqlCmd and responseFormat in the body
    // Make sure to properly encode the URL parameters
    const apiUrl = `https://www.appsynergy.com/api?action=${encodeURIComponent(action)}&apiKey=${encodeURIComponent(apiKey)}`;
    
    // According to AppSynergy documentation, we need to ensure the SQL command is properly formatted
    // Escape single quotes in SQL if needed
    const escapedSql = req.body.sqlCmd.replace(/'/g, "''");
    
    // Ensure we have the correct data structure in the request body
    const requestData = {
      sqlCmd: escapedSql,
      responseFormat: req.body.responseFormat || 'JSON'
    };
    
    // Log the SQL command for debugging
    console.log('Original SQL Command:', req.body.sqlCmd);
    console.log('Escaped SQL Command:', escapedSql);
    
    console.log('Request URL:', apiUrl);
    console.log('Request data:', JSON.stringify(requestData));
    
    // Make the request to the external API
    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: requestData,
      validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
      }
    });
    
    console.log('API response status:', response.status);
    
    // Return the API response to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Forward error details if available
    if (error.response) {
      console.error('API Error Response:', JSON.stringify(error.response.data));
      console.error('API Error Status:', error.response.status);
      console.error('API Error Headers:', JSON.stringify(error.response.headers));
      
      res.status(error.response.status).json({
        status: "ERROR",
        errorMessage: error.response.data.errorMessage || error.response.data.message || error.message,
        details: error.response.data,
        requestData: {
          url: apiUrl,
          body: requestData
        }
      });
    } else {
      console.error('Non-response error:', error);
      res.status(500).json({
        status: "ERROR",
        errorMessage: error.message,
        details: "Proxy server error"
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});