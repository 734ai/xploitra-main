# Xploitra

Xploitra is an AI-powered web security scanning and vulnerability analysis tool that helps identify and analyze potential security threats in web applications.

## Features

- 🔍 **Advanced Scanning**: Comprehensive web application security scanning
- 🤖 **AI-Powered Analysis**: Intelligent vulnerability detection and analysis
- 📊 **Real-time Monitoring**: Active scan monitoring and progress tracking
- 📝 **Detailed Reporting**: In-depth vulnerability assessment reports
- 📈 **Security Statistics**: Visual representation of security metrics
- 🔄 **Scan History**: Track and compare previous scan results

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Framework**: Tailwind CSS + Shadcn/ui
- **Backend**: Node.js
- **State Management**: React Query
- **AI Integration**: Custom AI vulnerability analyzer

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/734ai/xploitra-main.git
cd xploitra-main
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install
cd ..

# Install server dependencies
cd server && npm install
cd ..
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
NODE_ENV=development
```

### Development

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Project Structure

```
xploitra/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   └── pages/        # Page components
├── server/                # Backend Node.js server
│   ├── services/         # Backend services
│   └── routes.ts         # API routes
└── shared/               # Shared types and utilities
    └── schema.ts         # Database schema
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
