# Backend Structure Document

This document outlines the overall backend setup for the VISA DECLARATION VIEWER application. The goal is to present a clear, everyday language explanation of our backend architecture, database management, API design, hosting, and security principles, ensuring that anyone can understand how the system is put together.

## 1. Backend Architecture

*   Our backend is designed as an API-driven system, built primarily on Node.js using the Express framework.
*   We follow a modular, middleware-based architecture that separates different concerns (such as authentication, error handling, and logging) for ease of maintenance and scalability.
*   The system is constructed with scalability in mind. This means that as traffic increases, new servers or containers can be launched, ensuring performance remains strong.
*   Code is structured into clear service layers to separate data access, business logic, and API endpoints, which makes it easier to update or expand functionalities in the future.

## 2. Database Management

*   We are using a relational database (SQL) for persisting visa declaration data. The most likely choice is PostgreSQL due to its robustness and community support.
*   Data is organized into well-defined tables where each table represents a set of related data (for instance, visa declarations, user logs, etc.).
*   The database is managed with practices including strict schema definitions and indexing of key fields. This ensures quick look-ups, efficient join operations, and overall fast query performance.
*   Temporary data such as what's used in the editable grid (Tab 3) is managed in memory and is not stored permanently.

## 3. Database Schema

### Human-Readable Overview

*   **VisaDeclarations Table:** Contains the primary data records showing visa declarations. Each record carries an identifier, declaration details, timestamps, and potentially a status.
*   **UserLogs Table:** (If needed) Stores logs for API calls and operations, helping with debugging and system monitoring.
*   **Additional Tables:** Depending on extended requirements, extra tables may include data relationships for generated labels or download logs.

### Example SQL Schema for PostgreSQL

Below is an example schema snippet in SQL format for the main table:

`-- Table: visa_declarations CREATE TABLE visa_declarations ( id SERIAL PRIMARY KEY, applicant_name VARCHAR(255) NOT NULL, visa_type VARCHAR(50), declaration_date DATE NOT NULL, details JSONB, -- Detailed data in JSON format created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ); -- Optional Table: user_logs CREATE TABLE user_logs ( log_id SERIAL PRIMARY KEY, user_id INT, operation VARCHAR(100), log_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, details TEXT );`

## 4. API Design and Endpoints

*   The backend offers a RESTful API design, facilitating straightforward communication between the frontend and backend services.

*   **Key Endpoints:**

    *   **GET /api/declarations**: Retrieves the list of visa declarations (used in Tab 1’s table display).
    *   **GET /api/declarations/:id**: Fetches detailed information about a single visa declaration (for Tab 2).
    *   **GET /api/declarations/:id/grid-data**: Provides data for the editable grid view in Tab 3. Note that these changes are temporary in nature.
    *   **GET /api/declarations/:id/export**: Generates and returns an XLSX file for download, including the export date, matching the requirements of Tab 2.

*   Clear response statuses and error messages are implemented, using standard HTTP status codes to signal success (200 series) or failure (400-500 series).

## 5. Hosting Solutions

*   **Hosting Environment:**

    *   We are planning to use cloud providers such as AWS or Heroku. These platforms offer built-in scalability and reliability.
    *   Containerization using Docker is considered to ease deployment and scaling across different environments.

*   **Benefits:**

    *   **Reliability:** Cloud providers generally offer high uptime guarantees.
    *   **Scalability:** The infrastructure can automatically scale to handle heavy traffic.
    *   **Cost-Effectiveness:** Pay-as-you-go models help in optimally utilizing resources without upfront heavy investments.

## 6. Infrastructure Components

*   **Load Balancers:** Distribute incoming API requests evenly across multiple instances of the backend to ensure no single server becomes overwhelmed.
*   **Caching Mechanisms:** Use in-memory caches like Redis to temporarily store frequent queries, thus speeding up response times.
*   **Content Delivery Network (CDN):** Serves static assets (if any) quickly to users by using edge servers located closer to them.
*   These components work together to maintain high performance, secure data delivery, and a smooth user experience.

## 7. Security Measures

*   **Authentication and Authorization:**

    *   Use middleware to verify tokens or API keys, ensuring that only authorized API calls are processed.
    *   Implement role-based access control (even if the current users are standard) to keep future expansions in mind.

*   **Data Encryption:**

    *   All API communications are protected using HTTPS to ensure that data remains secure during transit.
    *   Sensitive data is encrypted both in transit and at rest as required.

*   **Other Protocols:**

    *   Regular security audits and the use of external libraries to mitigate common vulnerabilities (such as SQL injection and cross-site scripting) help in maintaining a secure backend.

## 8. Monitoring and Maintenance

*   **Monitoring Tools:**

    *   Tools such as CloudWatch (if using AWS) or third-party services like Datadog are in place for tracking API performance, system metrics, and error logging.
    *   Logging through middleware (e.g., Morgan in Express) provides a real-time stream of API activities.

*   **Maintenance Strategies:**

    *   Regular updates of dependencies and adherence to best practices in coding keep the system secure and up-to-date.
    *   Scheduled backups and database maintenance routines ensure data integrity and quick recovery in unforeseen circumstances.

## 9. Conclusion and Overall Backend Summary

*   In summary, the backend for the VISA DECLARATION VIEWER application is built using a robust, API-driven approach with Node.js and Express.
*   The combination of a relational database (such as PostgreSQL), clear RESTful API endpoints, a scalable hosting solution, and solid security measures ensures the system is both reliable and efficient.
*   Our backend design meets the project goals by offering a structured and scalable solution that supports all core functionalities—from fetching visa declaration data to generating downloadable reports and handling temporary grid data.

This structured approach not only aligns well with the needs of standard users but also leaves ample room for future enhancements and potential feature expansions.
