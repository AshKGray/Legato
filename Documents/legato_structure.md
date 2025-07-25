# Legato Mobile App - Technical Structure

## Architecture Overview

The Legato mobile app is a React Native application built with Expo that serves as the frontend client for a distributed backend system. The app follows a Redux-based state management pattern with TypeScript for type safety.

### Client-Server Architecture
```
Mobile App (React Native + Expo)
    ↓ HTTP/REST API
Backend Agents (Node.js + Docker)
    ↓ Database Layer
PostgreSQL + Redis
```

## Tech Stack

### Frontend
- **Framework**: React Native with Expo SDK
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation v6
- **HTTP Client**: Axios
- **Build Tool**: Expo CLI

### Backend Integration
The app connects to 6 specialized backend agents:
- **Agent 1**: Database Schema & Models (PostgreSQL)
- **Agent 2**: Audio Storage & Processing (File handling)
- **Agent 3**: API Core & Authentication (JWT, user management)
- **Agent 4**: Charts & Discovery System (Trending algorithms)
- **Agent 5**: Recording & Media Management (Audio processing)
- **Agent 6**: Democratic Voting System (Like/comment system)

## Project Structure

```
legato-mobile/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/          # Generic components (buttons, inputs)
│   │   ├── music/           # Music-specific components
│   │   └── social/          # Social features (comments, votes)
│   ├── screens/             # Screen-level components
│   │   ├── HomeScreen.tsx   # Main feed (TikTok-style)
│   │   ├── ChartsScreen.tsx # Music charts display
│   │   ├── LoginScreen.tsx  # Authentication
│   │   ├── ProfileScreen.tsx # User profiles
│   │   ├── RecordScreen.tsx # Recording interface
│   │   └── SongDetailScreen.tsx # Song versions view
│   ├── services/            # API layer
│   │   ├── api.ts          # Main API client (Axios)
│   │   ├── auth.ts         # Authentication services
│   │   ├── songs.ts        # Song-related API calls
│   │   └── voting.ts       # Voting system API
│   ├── store/              # Redux state management
│   │   ├── index.ts        # Store configuration
│   │   └── slices/         # Redux Toolkit slices
│   │       ├── authSlice.ts     # Authentication state
│   │       ├── songsSlice.ts    # Songs, charts, comments
│   │       └── recordingSlice.ts # Recording/upload state
│   ├── types/              # TypeScript definitions
│   │   ├── index.ts        # Global type definitions
│   │   ├── api.ts          # API response types
│   │   └── navigation.ts   # Navigation types
│   └── utils/              # Utility functions
│       ├── constants.ts    # App constants
│       ├── helpers.ts      # Helper functions
│       └── validation.ts   # Form validation
├── assets/                 # Static assets
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## Data Models

### Core Entities
```typescript
// User
interface User {
  id: string;
  username: string;
  email: string;
  profileImage?: string;
  stats: UserStats;
}

// Song
interface Song {
  id: string;
  title: string;
  originalArtist: string;
  collaborationWindow: Date;
  versions: SongVersion[];
  chartPosition?: number;
}

// Song Version
interface SongVersion {
  id: string;
  songId: string;
  userId: string;
  audioUrl: string;
  votes: number;
  comments: Comment[];
  createdAt: Date;
}
```

## State Management

### Redux Store Structure
```typescript
interface RootState {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
  };
  songs: {
    trending: Song[];
    charts: {
      overall: Song[];
      byGenre: Record<string, Song[]>;
      rising: Song[];
    };
    currentSong: Song | null;
    comments: Comment[];
    loading: boolean;
  };
  recording: {
    isRecording: boolean;
    audioUri: string | null;
    uploadProgress: number;
    loading: boolean;
  };
}
```

## API Integration

### Base Configuration
```typescript
// src/services/api.ts
class ApiService {
  private baseURL = 'http://192.168.0.232:3001'; // Backend base URL
  private axiosInstance: AxiosInstance;
  
  // Endpoints for each backend agent
  endpoints = {
    auth: '/api/auth',
    songs: '/api/songs', 
    voting: '/api/voting',
    charts: '/api/charts',
    recording: '/api/recording'
  };
}
```

### Backend Agent Ports
- **API Core & Authentication**: Port 3001
- **Charts & Discovery**: Port 3005
- **Democratic Voting**: Port 3010
- **Recording & Media**: Port 3007
- **Database Models**: Port 3002
- **Audio Processing**: Port 3008

## Navigation Structure

```typescript
// Navigation hierarchy
AppNavigator (Stack)
├── AuthStack (Stack)
│   └── LoginScreen
└── MainTabs (Bottom Tabs)
    ├── HomeTab
    │   ├── HomeScreen (Feed)
    │   └── SongDetailScreen
    ├── ChartsTab
    │   └── ChartsScreen
    ├── RecordTab
    │   └── RecordScreen
    └── ProfileTab
        └── ProfileScreen
```

## Development Workflow

### Environment Setup
1. **Prerequisites**: Node.js v18+, Expo CLI, iOS Simulator/Android Studio
2. **Installation**: `npm install`
3. **Configuration**: Update API baseURL in `src/services/api.ts`
4. **Backend**: Start Docker containers and all 6 backend agents

### Development Commands
```bash
npm start          # Start Expo dev server
npm run web        # Web development
npm run ios        # iOS simulator
npm run android    # Android emulator
```

### Backend Dependencies
The mobile app requires all backend agents to be running:
```bash
# Start in separate terminals
cd agents/api-core && npm start      # Port 3001
cd agents/charts-discovery && npm start # Port 3005  
cd agents/voting && npm start        # Port 3010
cd agents/recording && npm start     # Port 3007
cd agents/database && npm start      # Port 3002
cd agents/audio-processing && npm start # Port 3008
```

## Core Features Implementation

### TikTok-Style Feed
- **Component**: `HomeScreen.tsx`
- **State**: `songs.trending` slice
- **API**: `/api/songs/trending`
- **UI**: Vertical swipe with `FlatList`

### Democratic Voting
- **Component**: Social components in `src/components/social/`
- **State**: `songs.comments` and vote counts
- **API**: `/api/voting/*` endpoints
- **Features**: Like/unlike, comments, real-time updates

### Music Charts
- **Component**: `ChartsScreen.tsx`
- **State**: `songs.charts` slice
- **API**: `/api/charts/*` endpoints
- **Types**: Overall, Genre-based, Rising charts

### 7-Day Collaboration Windows
- **Logic**: Date validation in `utils/validation.ts`
- **Display**: Countdown timers in song components
- **Backend**: Handled by Charts & Discovery agent

## Security & Authentication

### JWT Implementation
- **Storage**: Secure token storage via Expo SecureStore
- **Interceptors**: Axios request/response interceptors for token handling
- **Refresh**: Automatic token refresh on expiry
- **Logout**: Secure token cleanup

### API Security
- **Headers**: Authorization Bearer tokens
- **Validation**: Request/response validation
- **Error Handling**: Centralized error handling with user feedback

## Performance Considerations

### State Management
- **Normalization**: Entity normalization for songs and users
- **Memoization**: React.memo and useMemo for expensive components
- **Lazy Loading**: Screen-level code splitting

### Media Handling
- **Audio**: Streaming with Expo AV
- **Images**: Lazy loading with cached images
- **Upload**: Progress tracking and retry logic

## Future Architecture Considerations

### Planned Enhancements
- **Real-time Features**: WebSocket integration for live collaboration
- **Offline Support**: Redux Persist for offline-first experience  
- **Push Notifications**: Expo Notifications for engagement
- **Camera Integration**: Expo Camera for video recordings
- **Advanced Recording**: Multi-track audio recording capabilities

### Scalability
- **Microservices**: Current agent-based architecture supports horizontal scaling
- **Caching**: Redis integration through backend agents
- **CDN**: Media delivery optimization through audio processing agent