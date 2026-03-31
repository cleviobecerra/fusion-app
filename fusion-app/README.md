# Fusion App

A modern, responsive web application built with React, TypeScript, and Vite. It features secure authentication and data management capabilities.

## 🚀 Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 5](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Styling**: CSS with utility management (`clsx`, `tailwind-merge`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend / BaaS**: [Supabase](https://supabase.com/)
- **Data Processing**: [PapaParse](https://www.papaparse.com/) (CSV), [XLSX](https://sheetjs.com/) (Excel)

## ✨ Key Features

- **Authentication System**: Secure login flow, protected routes, and password reset functionalities powered by Supabase.
- **Dashboard Interface**: A central hub for authenticated users.
- **Data Import/Export**: Built-in support for processing and managing spreadsheet data (CSV & Excel).

## 🛠️ Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (version 22 recommended) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd fusion-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Setup

Create a `.env.local` file in the root of the project and add your Supabase credentials. You can duplicate `.env.example` if it exists, or create a new file with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the App Locally

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## 📦 Build and Deployment

### Building for Production

To create an optimized production build:

```bash
npm run build
```

The built files will be output to the `dist` directory, ready to be deployed to your preferred hosting provider (Vercel, Netlify, Render, etc.).

### Run Linter

To ensure code quality and consistency:

```bash
npm run lint
```

## 📁 Project Structure

A quick overview of the essential directories in the `src` folder:

- `src/components/`: Reusable UI components and layout wrappers (e.g., `ProtectedRoute`).
- `src/contexts/`: React contexts holding global state (like `AuthContext`).
- `src/pages/`: Main route components (`Login`, `Dashboard`, `UpdatePassword`).
- `src/lib/`: Core utilities and integrations (such as the Supabase client initialization).
- `src/types/`: Global TypeScript type definitions and interfaces.
