# Project Requirements Document (PRD)

## 1. Project Overview

The project is focused on creating a web application page titled "VISA DECLARATION VIEWER". The page will be organized into 3 or 4 tabs and is intended to guide standard users through a streamlined process of viewing and interacting with visa declaration data. The design is based on Bulma (for classic styling with borders) along with Tailwind for additional design customizations. At its core, the application efficiently displays a dynamic table, detailed records, an editable grid, and printable label outputs—all interconnected through API calls.

This application is being built to offer a single-point interactive interface for users who need to review and manage visa declaration details with ease. The key objectives include intuitive navigation via tab-based sections, seamless API-driven data population, inline editing capabilities (even if temporary for now), and an easy-to-use download function for exporting data to XLSX format. Success will be measured by a smooth user journey, efficient data handling, and clear, non-intrusive notifications that keep users informed throughout the process.

## 2. In-Scope vs. Out-of-Scope

**In-Scope**

*   A centered application card with a main title "VISA DECLARATION VIEWER".

*   A tab-based navigation interface with:

    *   **Tab 1:** A Tabulator.js table displaying a selectable listing based on API data (columns provided by the API call) with tickbox selections.
    *   **Tab 2:** Detailed information display. When an item in Tab 1 is selected, another API call retrieves detailed data that auto-populates this tab along with a centered HTML table containing aggregates and details. A Download button is included to export the table to an XLSX file (complete with a download date).
    *   **Tab 3:** An editable grid that lets users manipulate data related to the selected item (supporting inline editing, drag-and-drop row reordering, and adding new rows) with changes that are temporary until a new selection is made.
    *   **Tab 4:** A labels section that generates and displays printable labels based on content from Tab 2 and Tab 3, following formatting logic defined in the "Packing_labels.md" document.

*   Integration of API calls to fetch data for the Tabulator table and detailed views.

*   Industry-standard non-intrusive notifications and error-handling practices to inform users of success or failure during operations.

**Out-of-Scope**

*   Persistent data storage for the changes made in the editable grid (Tab 3) – data resets when a new row selection is made.
*   Fully detailed logic for data arrangement and validation in the editable grid (only preliminary functionality is implemented).
*   Extensive custom error-handling logic beyond using industry standard practices.
*   Advanced user roles or permissions (all users are treated as standard users without special privileges).

## 3. User Flow

When a user lands on the application page, they are greeted with a centered header displaying the title "VISA DECLARATION VIEWER", along with a clear tab-based navigation at the top styled with Bulma and enhanced by Tailwind. The first tab immediately presents a dynamic Tabulator.js table which is populated via an API call. The table lists data in columns directly received from the backend, and each row includes a tickbox for selection rather than an action button.

Upon ticking a row, the application triggers an API call to retrieve detailed data for that specific item. Once the detailed data is fetched, the system automatically switches the user to the second tab where the information is displayed in a centered card formatted as an HTML table with aggregates and details. Next, the user may navigate to the third tab where they have a temporary, editable grid to modify data through inline editing, drag-and-drop reordering, and row additions. Finally, the fourth tab generates printable labels based on the detailed data (Tab 2) and adjustments from the editable grid (Tab 3), allowing users to print or review the labels as needed.

## 4. Core Features (Bullet Points)

*   **Main Application Layout & Navigation**

    *   Centered card layout with the title "VISA DECLARATION VIEWER".
    *   Tab-based navigation using Bulma classic styling with borders and Tailwind enhancements.

*   **Tab 1: Data Listing with Tabulator.js**

    *   Dynamic table populated using an API call.
    *   Columns directly received from API data.
    *   Each row features a selectable tickbox for user selection.

*   **Tab 2: Detailed Information Display**

    *   Automatically populated detail view upon selection from Tab 1 via a second API call.
    *   Display of data in a centered card formatted as an HTML table.
    *   Includes aggregates and a Download button for XLSX file export, with download date included.

*   **Tab 3: Editable Grid**

    *   Editable grid linked to data from the detailed view.
    *   Inline cell editing, drag-and-drop row reordering, and the ability to add rows.
    *   Temporary data storage until a new row selection occurs.

*   **Tab 4: Printable Labels**

    *   Generation of printable labels based on data from Tab 2 and modifications in Tab 3.
    *   Follows formatting and layout rules provided in "Packing_labels.md".
    *   Includes functionality for printing the labels directly.

*   **Notifications & Error Handling**

    *   Non-intrusive, non-modal visual notifications for status updates on API calls, downloads, and data updates.
    *   Industry-standard error-handling practices ensuring graceful user experience even if API calls fail.

*   **API Integrations**

    *   API calls to the database to pull both list and detailed data.
    *   Automatic fetching on tick selection and subsequent tab switching.

## 5. Tech Stack & Tools

*   **Frontend Frameworks & Libraries**

    *   Vue.js for building the reactive user interface.
    *   Bulma for classic CSS styling to achieve a bordered, classic tab look.
    *   Tailwind CSS for additional responsive utility classes and custom styling.
    *   Tabulator.js for handling dynamic data tables with tickbox selection.

*   **Backend & API Integration**

    *   JavaScript for managing API calls and data manipulation.
    *   Backend API endpoints (configuration available) that provide the data needed for both the Tabulator table and the detailed view.

*   **Export & Download Functionality**

    *   Integration of XLSX export functionality for downloading the detailed HTML table.

*   **Development Tools**

    *   Replit, Cursor, and VS Code are suggested IDEs and tools for code editing and real-time collaboration.
    *   AI models such as Claude 3.7 Sonnet, Deepseek R1, and Gemini 2.5 Pro can be referenced for advanced reasoning or code suggestions if necessary.

## 6. Non-Functional Requirements

*   **Performance**

    *   The page should load the initial data via API calls within industry-standard time limits.
    *   Smooth, rapid transition when switching tabs, especially after a row selection triggers an API call.

*   **Security**

    *   All API endpoints must be secured, ensuring data is fetched in a secure manner.
    *   Basic browser-side security practices should be in place.

*   **Usability**

    *   The interface must be intuitive and user-friendly with clearly labeled tabs and feedback notifications.
    *   Non-intrusive, visually consistent notifications provide real-time feedback on user actions (e.g., download completed, API errors).

*   **Compliance**

    *   Follow web development best practices and accessibility standards to ensure the application is usable across various devices and browsers.

*   **Responsiveness**

    *   Utilize Tailwind CSS to guarantee that the layout looks good on both desktop and mobile devices.

## 7. Constraints & Assumptions

*   **Constraints**

    *   The editable grid (Tab 3) does not support persistent storage; any changes will be temporary until a new selection occurs.
    *   The detailed logic for data re-arrangement and cell validation in the editable grid is preliminary and may need further refinement.
    *   API call configurations for pulling both list and detailed data are already set up, but error-handling relies on industry best practices.
    *   The printable labels’ formatting follows the logic provided in the "Packing_labels.md" file; any changes there must be reflected accordingly.

*   **Assumptions**

    *   The application will be used by standard users without the need for user roles or privilege-based access.
    *   The initial API calls will reliably return the necessary data based on the provided configuration.
    *   Developers have access to the referenced sample_tab.html and Packing_labels.md files.
    *   Future updates may add data persistence and more advanced features based on evolving requirements.

## 8. Known Issues & Potential Pitfalls

*   **API Failures & Data Loading**

    *   If API calls fail or return incomplete data, ensure that non-intrusive error notifications are displayed and that the user is not left stranded on a blank screen.
    *   Implement retry mechanisms or fallback messages based on industry best practices.

*   **Editable Grid Limitations**

    *   Since the data in Tab 3 is not persistent, users might be confused when modifications disappear upon selecting a new row. Clear visual cues should be provided to indicate the temporary nature of the changes.
    *   Potential issues with drag-and-drop or inline editing should be tested thoroughly to avoid conflicts or UI freezes.

*   **Export Functionality**

    *   The conversion of the HTML table (with aggregates, details, and download timestamps) to an XLSX file may encounter formatting issues. Ensure robust testing across different browsers.
    *   Validate that the downloaded file consistently reflects the current state of data on Tab 2.

*   **User Experience & Notifications**

    *   Notifications must be subtle yet clear; ensure the design does not disrupt the overall user flow.
    *   Consider edge cases where multiple rapid actions might trigger overlapping notifications; implement a clear queue or damping mechanism.

This document serves as the clear and comprehensive blueprint for the AI model or developer team to generate subsequent technical documents and develop the "VISA DECLARATION VIEWER" application without any ambiguity.

## 9. Reference data and notes

*   **Reference Data**

    *   The reference data used in the application is sourced from the ref_docs folder.
    *   The data is to be used for reference purposes only - style, color, formatting, layout and code snippets guideance (i.e., Theme - NovaLink PIX.pdf and NovaLink PIX.pdf)
    *   The data includes logo file: Novalink_Medium-03.webp
    *   The data includes reference for Bulma tab configuration: bulma_tab_style_with_borders.html
    *   The data includes reference for Tabulator table configuration: tabulator_tickbox_ref.js and tabulator_filter_code.js
    *   The data includes reference for Tabulator table configuration: tabulator_filter_reference.png and tabulator_tickbox_reference.png


*   **Notes**

    *   The application is designed to be used by authorized personnel only.
    *   The application is not intended for public use.
    *   The API endpoints and detailed configuration will be provided until the application skeleton (UI) is complete.
    *   The application logic to handle and consume the information obtained from the API calls will be provided once we start using the API calls.
