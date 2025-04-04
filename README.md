# VISA Declaration Viewer

A web application for viewing and managing VISA declarations using data from the AppSynergy API.

## Features

- View VISA transactions in a tabular format
- Filter and sort transaction data
- Generate cover pages, packing lists, and packing labels
- Secure API integration with AppSynergy

## Tech Stack

- **Frontend**: Vue 3 + Vite
- **Backend**: Node.js with Express (proxy server)
- **UI Components**: Custom Vue components
- **Data Visualization**: Tabulator.js

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/visa-viewer.git
   cd visa-viewer
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_API_KEY=your_api_key_here
   VITE_API_URL=https://www.appsynergy.com/api
   VITE_DEFAULT_SQL_CMD="your_default_sql_query_here"
   ```

### Running the Application

1. Start the proxy server
   ```bash
   node server/proxy-server.js
   ```

2. In a separate terminal, start the development server
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

[MIT](LICENSE)
