# Legato Mobile App

A React Native music collaboration platform built with Expo.

## Features

- **TikTok-style Interface** - Swipe through trending music collaborations
- **Democratic Voting** - Like and comment on song versions
- **Live Charts** - See what's trending in real-time
- **7-Day Collaboration Windows** - Join song collaborations within time limits
- **User Profiles** - Track your musical journey and stats

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Redux Toolkit** for state management
- **React Navigation** for navigation
- **Axios** for API calls

## Backend Integration

Connects to existing Legato backend agents:
- **Agent 1**: Database Schema & Models
- **Agent 2**: Audio Storage & Processing  
- **Agent 3**: API Core & Authentication
- **Agent 4**: Charts & Discovery System
- **Agent 5**: Recording & Media Management
- **Agent 6**: Democratic Voting System

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Xcode) or Android Studio (optional)
- Expo Go app on your phone (for testing)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Update API base URL:**
   Edit `src/services/api.ts` and update the `baseURL` to point to your backend:
   ```typescript
   this.baseURL = 'http://192.168.0.232:3001';
   ```

### Running the App

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Test in browser:**
   ```bash
   npm run web
   ```

3. **Test on iOS simulator:**
   ```bash
   npm run ios
   ```

4. **Test on Android:**
   ```bash
   npm run android
   ```

5. **Test on physical device:**
   - Install Expo Go from App Store/Play Store
   - Scan QR code from `npm start`

### Backend Setup

Make sure your backend agents are running:

1. **Start Docker containers:**
   ```bash
   cd ../
   docker-compose up -d
   ```

2. **Start backend agents:**
   ```bash
   # Terminal 1 - Charts & Discovery
   cd agents/charts-discovery
   npm start
   
   # Terminal 2 - Voting System  
   cd agents/voting
   npm start
   
   # Terminal 3 - API Core
   cd agents/api-core
   npm start
   ```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── services/       # API services
├── store/         # Redux store and slices
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Screens

- **HomeScreen** - Trending music feed
- **ChartsScreen** - Music charts (Overall, Genre, Rising)
- **LoginScreen** - Authentication
- **ProfileScreen** - User profile and stats
- **RecordScreen** - Recording interface (coming soon)
- **SongDetailScreen** - Song details and versions

## API Integration

The app connects to your existing backend through the API service layer:

- **Authentication** - Login, register, logout
- **Songs** - Create, fetch, get versions
- **Voting** - Like/unlike, comments
- **Charts** - Get charts, trending songs
- **Recording** - Upload recordings

## Development

### Adding New Features

1. Create types in `src/types/index.ts`
2. Add API methods in `src/services/api.ts`
3. Create Redux slice in `src/store/slices/`
4. Build UI components in `src/components/`
5. Create screens in `src/screens/`

### State Management

Uses Redux Toolkit with three main slices:
- **authSlice** - User authentication state
- **songsSlice** - Songs, versions, charts, comments
- **recordingSlice** - Recording and upload state

## Next Steps

- [ ] Implement camera/audio recording interface
- [ ] Add real-time collaboration features
- [ ] Build detailed song version UI
- [ ] Add user profile enhancements
- [ ] Implement push notifications
- [ ] Add offline support

## Troubleshooting

### iOS Simulator Issues
- Make sure Xcode is fully installed
- Run: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

### Package Version Issues
- Run: `npx expo install --fix` to fix compatibility issues

### Backend Connection Issues
- Verify backend is running on correct port
- Check API base URL in `src/services/api.ts`
- For iOS simulator, use your computer's IP address instead of localhost 