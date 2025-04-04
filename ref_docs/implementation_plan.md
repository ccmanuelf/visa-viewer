# Implementation plan

## Phase 1: Environment Setup

1.  **Prevalidation**: Check if the current directory is already a Vue project (e.g., look for a package.json and a /src folder). If it is, skip project initialization. (Project Document: Project Goal)
2.  **Project Initialization**: If not already set up, create a new Vue.js project named `visa-declaration-viewer` using Vue CLI. For example, run:

`vue create visa-declaration-viewer`

and follow the prompts. (Project Document: Tech Stack - Frontend)

1.  **Navigate to Project Directory**: Change directory into the created project:

`cd visa-declaration-viewer`

(Project Document: Project Goal)

1.  **Install Bulma**: In the project root, install Bulma by running:

`npm install bulma`

(Project Document: Tech Stack - Frontend)

1.  **Install Tailwind CSS**: Follow Tailwind CSS installation steps. For example:

`npm install -D tailwindcss postcss autoprefixer npx tailwindcss init -p`

Then configure Tailwind per the official docs. (Project Document: Tech Stack - Frontend)

1.  **Install Tabulator.js**: Add Tabulator.js to the project by running:

`npm install tabulator-tables`

(Project Document: Core Functionality - Tab-based Navigation, Data Display)

1.  **Add Reference File for Tab Styling**: Place the provided `sample_tab.html` in the `public/` directory (e.g., `public/sample_tab.html`) so it can be used for reference in styling the tabs. (Project Document: Documents)
2.  **Validation**: Verify that Node modules are installed correctly by running `npm run serve` and checking that a default Vue page loads in the browser. (Project Document: Tech Stack - Development Tools)

## Phase 2: Frontend Development

1.  **Create Tab Navigation Component**: Create a new Vue component at `/src/components/TabNavigation.vue` that holds the four tabs. (Project Document: Core Functionality - Tab-based Navigation)

2.  **Implement Tab Layout**: In `TabNavigation.vue`, structure the four tabs (Tab 1, Tab 2, Tab 3, Tab 4) using Bulma’s tab styling, and include Tailwind CSS classes for responsive design. Reference `sample_tab.html` for styling details. (Project Document: Core Functionality - UI Framework)

3.  **Setup Router (Optional)**: If desired, configure Vue Router to manage tab navigation. Otherwise, manage tab states internally within the component. (Project Document: Core Functionality - Tab-based Navigation)

4.  **Create Tab 1 Component (Tabulator Table)**: Create `/src/components/Tab1ListTable.vue` which will:

    *   Use Tabulator.js to display a selectable table of visa declarations.
    *   Fetch data via an API call (API configuration already available).
    *   Render selectable rows with tickboxes. (Project Document: Core Functionality - Tab 1)

5.  **API Call in Tab 1**: In `Tab1ListTable.vue`, implement a method to fetch the visa declaration list from the provided API endpoint. (Project Document: Core Functionality - API Integration)

6.  **Row Selection Logic**: Code the row selection event so that when a user selects a row from the table, an API call is triggered to fetch detailed data for that declaration, and automatically communicate a switch to Tab 2. (Project Document: Core Functionality - Tabular Navigation & User Interaction)

7.  **Validation**: Test Tab 1 by running the Vue application, ensuring the table loads data and row selection triggers a console log (simulate API call if necessary).

8.  **Create Tab 2 Component (Detailed View)**: Create `/src/components/Tab2Details.vue`. This component should:

    *   Display detailed information about the selected declaration in a centered card.
    *   Render an HTML table including aggregates/details.
    *   Include a "Download" button to export the table to an XLSX file with a timestamp. (Project Document: Core Functionality - Tab 2, Download Functionality)

9.  **Implement XLSX Export**: In `Tab2Details.vue`, integrate a library (such as SheetJS) to implement exporting the table data to an XLSX file. (Project Document: Core Functionality - Download Functionality)

10. **Validation**: Run the application, select a row in Tab 1, and verify that Tab 2 displays detailed data and that clicking "Download" triggers XLSX generation (you may simulate data for testing).

11. **Create Tab 3 Component (Editable Grid)**: Create `/src/components/Tab3EditableGrid.vue`. This component should:

    *   Display data related to the selected row in an editable grid format.
    *   Allow editing of cells, drag-and-drop row reordering, and adding new rows.
    *   Use temporary local state that resets when a new row is selected in Tab 1. (Project Document: Core Functionality - Tab 3)

12. **Implement Editable Functionality**: Add necessary methods and optionally incorporate a drag-and-drop library (e.g., Vue.Draggable) for row reordering within `Tab3EditableGrid.vue`. (Project Document: Core Functionality - Data Handling)

13. **Validation**: Test editing cells and reordering rows in Tab 3 by simulating a row selection change from Tab 1 and ensuring the grid resets appropriately.

14. **Create Tab 4 Component (Printable Labels)**: Create `/src/components/Tab4PrintableLabels.vue`. This component should:

    *   Generate printable labels based on the combined data from Tab 2 and Tab 3.
    *   Follow the label layout and formatting rules defined in the `Packing_labels.md` file. (Project Document: Core Functionality - Tab 4, Label Generation)

15. **Integrate Packing_labels.md**: Read and implement the specific business logic from `Packing_labels.md` in `Tab4PrintableLabels.vue`. (Project Document: Documents - Packing_labels.md)

16. **Validation**: Simulate data input from Tabs 2 and 3 to verify that Tab 4 correctly displays label content for printing.

17. **Implement Non-intrusive Notifications**: In the global app or within individual components, implement a toast notification system to inform users of API call successes or failures. (Project Document: Core Functionality - User Interaction)

18. **Validation**: Trigger sample API call errors and successes to verify that non-modal notifications are displayed correctly.

## Phase 3: Backend Integration

1.  **Integrate Existing API Endpoints**: Since the API configuration is already available and backend is preconfigured, integrate frontend API calls in Tab 1 and Tab 2 with the provided endpoints. Ensure that the fetch methods use the correct URL and error handling in each component. (Project Document: Core Functionality - API Integration)
2.  **Error Handling**: In each API call, implement industry-standard error handling to catch failures and display notifications to the user. (Project Document: Core Functionality - Error Handling)
3.  **Validation**: Use browser developer tools to inspect network calls and ensure that API endpoints return expected data or error messages.

## Phase 4: Integration

1.  **Connect Components via Parent State**: In your main App component (e.g., `/src/App.vue`), import and include the four tab components, and add parent-level state or a shared store (e.g., Vuex or the newer Composition API state) to track the currently selected visa declaration row across Tab 1, Tab 2, and Tab 3. (Project Document: Core Functionality - Tab-based Navigation)
2.  **Implement Tab Switching Logic**: Ensure that selecting a row in Tab 1 automatically updates the shared state and switches the app view to Tab 2. (Project Document: Core Functionality - User Interaction)
3.  **Validation**: Manually test navigation between tabs and data passing by selecting rows and verifying that the detailed and editable components update accordingly.

## Phase 5: Deployment

1.  **Build for Production**: Run the build process for Vue.js by executing:

`npm run build`

(Project Document: Core Functionality - Deployment)

1.  **Deployment Setup**: Deploy the production build to your chosen hosting service (e.g., Replit’s hosting, Netlify, or Vercel). Follow the relevant deployment documentation. (Project Document: Tech Stack - Tools)
2.  **Validation**: Visit the deployed URL and verify that all functionality works as expected across all tabs.

## Final Checks and Edge Cases

1.  **Cross-browser Testing**: Test the application in multiple browsers to ensure consistent appearance and functionality. (Project Document: Branding, User Interface)
2.  **Responsive Design Check**: Verify that Bulma and Tailwind CSS styles render correctly on various screen sizes. (Project Document: UI Framework)
3.  **API Failure Simulation**: Test error handling by simulating API failures (e.g., by using developer tools to block network calls) and confirm that notifications are shown. (Project Document: Core Functionality - Error Handling)
4.  **Download File Verification**: Confirm that the XLSX export includes the correct timestamp and data, matching the specifications in Tab 2. (Project Document: Core Functionality - Download Functionality)
5.  **Label Layout Verification**: Cross-check that the generated labels in Tab 4 conform to the layout specified in `Packing_labels.md`. (Project Document: Documents - Packing_labels.md)
6.  **Final Code Review**: Review all changes, ensuring that each component has proper comments and meets the design requirements. (Project Document: Branding)
7.  **Merge and Version Control**: Commit your changes with clear commit messages and push to your remote repository. (Project Document: Tech Stack - Tools)
8.  **Final Validation**: Run an end-to-end manual test of the entire workflow from visa declaration viewing to label generation to ensure everything integrates seamlessly.

# Note

If you plan to extend or modify the backend logic in the future, ensure that the frontend API calls remain compatible with the existing configurations. The backend is already configured, so frontend integrations are the primary focus.

This completes the step-by-step plan.
