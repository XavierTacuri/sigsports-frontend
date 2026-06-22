# SigSports Frontend

## Description

SigSports Frontend is a web application for managing sports events, players, registrations, calendars, match sheets, statistics, sanctions, individual events, and printable reports.

This project provides the user interface for the SigSports platform. It is designed to work with the separate backend repository, `sigsports-api`.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| React | User interface development |
| TypeScript | Static typing and safer application code |
| Vite | Development server and production build tooling |
| TailwindCSS | Utility-first styling |
| Axios | HTTP client for API requests |
| React Router | Client-side routing |

## Main Features

- Role-based login
- Dashboards by user role
- Player management
- Player validation
- Competition registrations
- Player transfer requests
- Sports calendar
- Match management
- Match sheets
- Football/indoor football events
- Final score registration for other sports
- Standings, scorers and sanctions
- Individual events and results
- Printable reports
- Password change
- Responsive interface

## User Roles

| Role | Description |
| --- | --- |
| Administrator | Manages the platform configuration, users, clubs, competitions, players, sanctions, and system-wide operations. |
| Secretary | Reviews and validates player information, registrations, reports, and administrative workflows. |
| Delegate | Manages club-related players, registrations, and requests according to assigned permissions. |
| Scorekeeper | Handles match sheets, match events, and score registration during sports activities. |

## Project Structure

```text
src/
  api/
  components/
  context/
  hooks/
  pages/
  routes/
  utils/
```

## Environment Variables

Create a `.env` file based on `.env.example` and configure the backend API URL:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Do not commit real credentials, secrets, or environment-specific private values.

## Installation

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

## Build for Production

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Backend API

This frontend consumes the SigSports API from the separate `sigsports-api` backend repository.

Make sure `VITE_API_URL` points to the correct backend server before running the application.

## Version

Current version: v1.0.0

## Author

Oscar Xavier Tacuri

## License

MIT License
