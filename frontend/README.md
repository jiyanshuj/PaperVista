# PaperVista - Frontend

PaperVista is a React-based web application for generating exam papers. The frontend provides an intuitive user interface for creating and configuring exam papers with various parameters.

## Project Overview

This is a modern React application built with **Vite** as the build tool, **Tailwind CSS** for styling, and **Lucide React** for icons. The application allows users to generate exam papers by specifying course details, questions, and other parameters.

## Tech Stack

- **React 19.1.1** - Frontend library
- **Vite 7.1.7** - Build tool and dev server
- **Tailwind CSS 3.4.18** - Utility-first CSS framework
- **PostCSS 8.5.6** - CSS transformation tool
- **Lucide React 0.544.0** - Icon library
- **ESLint 9.36.0** - Code linter

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

### Development

Start the development server with hot module replacement (HMR):

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or as shown in your terminal).

### Build

Create an optimized production build:

```bash
npm run build
```

The build output will be generated in the `dist/` directory.

### Preview

Preview the production build locally:

```bash
npm run preview
```

### Linting

Check for code quality issues:

```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ExamPaperGenerator.jsx    # Main exam paper generation component
│   ├── assets/                        # Static assets
│   ├── App.jsx                        # Root component
│   ├── App.css                        # Component styles
│   ├── main.jsx                       # Application entry point
│   └── index.css                      # Global styles
├── public/                            # Static files
├── vite.config.js                     # Vite configuration
├── tailwind.config.js                 # Tailwind CSS configuration
├── postcss.config.js                  # PostCSS configuration
├── eslint.config.js                   # ESLint configuration
└── package.json                       # Project dependencies and scripts
```

## Key Features

- **Exam Paper Generation** - Create exam papers with customizable parameters
- **Course Information** - Specify course code, name, department, and semester
- **Question Management** - Add and configure exam questions
- **Download Functionality** - Export generated papers
- **User-Friendly Interface** - Intuitive design with helpful icons

## Configuration Files

- **vite.config.js** - Vite bundler configuration with React plugin support
- **tailwind.config.js** - Tailwind CSS customization
- **postcss.config.js** - CSS processing with Tailwind and Autoprefixer
- **eslint.config.js** - Code quality rules

## Development Notes

- HMR (Hot Module Replacement) is enabled for faster development experience
- Tailwind CSS is configured with PostCSS for optimal CSS compilation
- ESLint is configured to enforce code quality standards

## Future Enhancements

- TypeScript integration for type safety
- Enhanced test coverage
- Performance optimization
- Accessibility improvements

## License

Refer to the main project license file for more information.
