import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import songsSlice from './slices/songsSlice';
import recordingSlice from './slices/recordingSlice';
import userSlice from './slices/userSlice';
import collaborationSlice from './slices/collaborationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    songs: songsSlice,
    recording: recordingSlice,
    user: userSlice,
    collaboration: collaborationSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
        ignoredPaths: ['collaboration.windowTimers'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 