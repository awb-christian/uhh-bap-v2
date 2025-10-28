# Odoo Attendance Pusher

A Next.js application that synchronizes attendance data from ZKTeco devices to Odoo ERP system with comprehensive logging and connectivity monitoring.

## Overview

This application bridges ZKTeco attendance devices (Biotime and Time systems) with Odoo, automatically fetching attendance records and pushing them to your Odoo instance. It includes real-time connectivity monitoring and detailed request logging.

## Features

- **ZKTeco Integration**: Fetch attendance data from ZKTeco Biotime and Time devices via local network
- **Odoo Sync**: Automatic attendance record synchronization to Odoo ERP
- **Request Logging**: Track all HTTP requests to Odoo with detailed logs
- **Connectivity Monitoring**: Monitor connection status for Sentry, Securelink, and UHH systems
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Prerequisites

- Node.js 20+ 
- Access to ZKTeco devices on local network
- Odoo instance with API access
- Firebase project (optional, for hosting)

## Getting Started

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Odoo Configuration
ODOO_URL=https://your-odoo-instance.com
ODOO_DB=your_database
ODOO_USERNAME=your_username
ODOO_PASSWORD=your_password

# ZKTeco Biotime Configuration
ZKTECO_BIOTIME_URL=http://192.168.1.100:8080
ZKTECO_BIOTIME_USERNAME=admin
ZKTECO_BIOTIME_PASSWORD=password

# ZKTeco Time Configuration
ZKTECO_TIME_URL=http://192.168.1.101
ZKTECO_TIME_USERNAME=admin
ZKTECO_TIME_PASSWORD=password
```

### Development

```bash
npm run dev
```

The application runs on `http://localhost:9002`

### Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── attendance-transactions/  # Attendance data view
│   ├── logs/              # Request logs viewer
│   ├── zkteco-biotime/    # Biotime integration
│   ├── zkteco-time/       # Time integration
│   ├── securelink/        # Securelink monitoring
│   ├── sentry/            # Sentry monitoring
│   └── uhh-connectivity/  # UHH connectivity monitoring
├── components/            # React components
│   ├── layout/           # Navigation and layout components
│   ├── logs/             # Log display components
│   └── ui/               # shadcn/ui components
├── lib/                  # Core business logic
│   ├── attendance-manager.ts  # Attendance sync logic
│   ├── app-logger.ts     # Logging utilities
│   ├── odoo/            # Odoo API client
│   └── zkteco/          # ZKTeco API clients
└── hooks/               # React hooks

```

## Available Scripts

- `npm run dev` - Start development server with Turbopack on port 9002
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit AI development server
- `npm run genkit:watch` - Start Genkit with watch mode

## Key Technologies

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Forms**: React Hook Form + Zod validation
- **Database**: SQLite (better-sqlite3) for local logging
- **AI**: Google Genkit for AI features

## Architecture

The application follows a modular architecture:

1. **Data Fetching**: ZKTeco APIs are called to fetch attendance records
2. **Processing**: Attendance data is normalized and validated
3. **Synchronization**: Processed records are pushed to Odoo via API
4. **Logging**: All requests and responses are logged to SQLite
5. **Monitoring**: Connection health checks for external systems

## Troubleshooting

### Cannot connect to ZKTeco device
- Verify the device is accessible on the local network
- Check firewall settings
- Ensure correct IP address and port in environment variables

### Odoo authentication fails
- Verify credentials in `.env.local`
- Check Odoo API access permissions
- Ensure database name is correct

### Attendance records not syncing
- Check logs page for error details
- Verify employee mappings between ZKTeco and Odoo
- Ensure Odoo attendance module is installed

## Contributing

When making changes:
1. Follow existing code patterns
2. Add proper error handling
3. Update documentation if needed
4. Test thoroughly before committing

## License

Private - Internal use only
