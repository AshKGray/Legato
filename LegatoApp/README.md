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

---

## Step-by-Step Fix

### 1. **Check the Output of Your Port Check**
- When you run the voting agent, look for the output from your `lsof -i :3006` command.
  - If you see a process listed, something else is using port 3006.
  - If it’s empty, nothing else is using the port.

### 2. **If Port 3006 Is Free, But You Still Can’t Connect:**
- The server may be binding to `localhost` (127.0.0.1) only, which is correct for most local development.
- If you’re running the client (browser, mobile app, etc.) on the same machine, `localhost:3006` should work.
- If you’re running the client on a different device (e.g., phone), you need to use your computer’s local IP address (e.g., `192.168.x.x:3006`).

### 3. **If Port 3006 Is In Use:**
- You need to either stop the other process or change the voting agent to use a different port (e.g., 3010).

---

## How to Fix

### **A. Change the Voting Agent Port (if needed)**
1. Open `agents/voting/server.js` (or wherever the orchestrator is instantiated).
2. Pass a different port in the config:
   ```js
   const orchestrator = new DemocraticVotingOrchestrator({
     port: 3010, // or any free port
     antiGamingConfig: { redisClient }
   });
   ```
3. Start the server and try `http://localhost:3010/api/voting/health`.

---

### **B. Make Sure the Server Is Running and Not Crashing**
- If the server crashes, you won’t be able to connect.
- Check the terminal for any error messages.

---

### **C. Test the Endpoint**
- In your browser or terminal, run:
  ```sh
  curl http://localhost:3006/api/voting/health
  ```
  (or use the new port if you changed it)

---

## Next Steps

1. **Check your terminal for the `lsof` output and any errors.**
2. **If port 3006 is in use, change the port as shown above.**
3. **Restart the voting agent and try the health check endpoint again.**

---

Would you like me to:
- Automatically update the voting agent to use a different port (e.g., 3010)?
- Or help you interpret the `lsof` output and guide you step by step?

Let me know your preference, and I’ll fix it for you! 

---

**What to do next:**

---

## 1. Start the Voting Agent

Make sure you are in the `agents/voting` directory, then run:
```sh
npm start
```
You should see logs like:
```
🚀 Democratic Voting System running on port 3010
```

---

## 2. Test the Health Endpoint

Open your browser or run this in your terminal:
```sh
curl http://localhost:3010/api/voting/health
```
You should get a JSON response with `status: "healthy"`.

---

## 3. If You’re Using a Mobile App or Simulator

- **On the same computer:** Use `http://localhost:3010/api/voting/health`
- **On a phone or another device:** Use your computer’s local IP address, e.g.:
  ```
  http://192.168.0.232:3010/api/voting/health
  ```
  (Replace with your actual IP if different.)

---

## 4. If You Still Can’t Connect

- Make sure the server is running and not crashing.
- Double-check the port in the logs and in your requests.
- If you get a connection refused error, let me know the exact error message and what you see in the terminal.

---

**You are very close! Try the steps above and let me know what you see, or paste any error message here and I’ll help you fix it immediately.** 

---

It looks like you ran `npm start` from the **project root**, which started the **charts & discovery agent** (not the voting agent). That’s why you see logs for “Charts & Discovery Orchestrator” and not the voting system.

---

## Here’s What You Need To Do:

1. **Open a new terminal window/tab.**
2. **Navigate to the voting agent directory:**
   ```sh
   cd agents/voting
   ```
3. **Start the voting agent:**
   ```sh
   npm start
   ```
   You should see:
   ```
   🚀 Democratic Voting System running on port 3010
   ```

4. **Test the health endpoint:**
   ```sh
   curl http://localhost:3010/api/voting/health
   ```
   or open that URL in your browser.

---

**Summary:**  
You are currently starting the wrong agent from the project root.  
You need to start the voting agent from its own directory (`agents/voting`).

---

If you do this and still have issues, copy the terminal output and any error messages here, and I’ll help you fix it right away! 

---

**Pushing to a remote repository** means uploading your local code changes (commits) to a remote server, usually on a platform like GitHub, GitLab, or Bitbucket. This allows you to:

- **Back up your code** safely in the cloud
- **Collaborate** with others (they can see, review, and merge your changes)
- **Deploy** your code to production or other environments
- **Access your code** from anywhere

---

## How It Works

- **Local repository:** This is your code and commit history on your own computer.
- **Remote repository:** This is a copy of your repository hosted on a remote server (e.g., GitHub).

When you run:
```sh
git push
```
you are telling git:  
> “Take my local commits and upload them to the remote repository.”

---

## Example

1. You make changes and commit them locally:
   ```sh
   git add .
   git commit -m "My changes"
   ```
2. You push to the remote:
   ```sh
   git push
   ```
3. Now, your changes are available on GitHub (or wherever your remote is set up).

---

## Why Push?

- To **share your work** with teammates
- To **back up** your code
- To **trigger deployments** or CI/CD pipelines
- To **collaborate** and review code

---

If you want to push your changes and you have a remote set up, just run:
```sh
git push
```
If you need help setting up a remote or want to know where your remote is, let me know! 