# Man-Hours Tracking Web App

A web-based application for tracking monthly man-hours, replacing manual Excel sheets. It features distinct user roles (Admin, Manager), structured data entry, monthly summaries, and a modern dark glassmorphism UI.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

*   **Node.js**: Ensure Node.js is installed on your machine.
*   **MongoDB**: Ensure MongoDB is installed and running locally on port `27017`.

### Installation

1.  Open a terminal in the project root.
2.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

1.  Make sure your MongoDB service is running.
2.  From the `backend` directory, start the server:
    ```bash
    npm start
    ```
    *   To run in development mode with auto-reload: `npm run dev`

3.  The server will start on port **5000**.

### Accessing the Website

Open your web browser and navigate to:
[http://localhost:5000](http://localhost:5000)

The backend is configured to serve the frontend static files automatically.

## Credentials

To log in to the application, you can use the following default admin credentials:

*   **Email**: `admin@example.com`
*   **Password**: `adminpass`

### Creating the Admin User (If Login Fails)

If the default admin user does not exist in your database yet, you can run the seed script to create it:

1.  Open your terminal in the `backend` directory.
2.  Run the seed script:
    ```bash
    node src/seedAdmin.js
    ```
3.  You should see "Admin user created" (or "Admin user already exists").

## Free Hosting

This project is prepared for a free hobby deployment on Render with MongoDB Atlas.

### Included deploy config

The repo now includes:

- `render.yaml` for a Render web service
- `backend/.env.example` for local and hosted environment setup
- a Node `20.x` engine pin in `backend/package.json`

### Recommended stack

- Render Free Web Service for the app
- MongoDB Atlas Free Cluster for the database

### Render setup

1. Push this repo to GitHub.
2. Create a free MongoDB Atlas cluster and get its connection string.
3. In Render, create a new Blueprint deployment from this repo.
4. Set these environment variables in Render:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `OPENAI_API_KEY` only if you want the AI import feature enabled
5. Deploy.

Render will run:

```bash
cd backend && npm install
cd backend && npm start
```

The Express server already serves the static frontend from the repository, so no separate frontend host is required.

### Important notes

- Render free services spin down after idle time, so the first request can be slow.
- `backend/.env` should stay local only. Use `backend/.env.example` as the template.
- If a real API key has ever been stored in `backend/.env`, rotate it before publishing the repo.
