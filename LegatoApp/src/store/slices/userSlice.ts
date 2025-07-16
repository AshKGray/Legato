import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, UserStats, UserSongHistory, Song, SongVersion } from '../../types';
import apiService from '../../services/api';

interface UserState {
  currentProfile: User | null;
  userStats: UserStats | null;
  userSongs: Song[];
  userVersions: SongVersion[];
  likedVersions: SongVersion[];
  collaborations: any[];
  achievements: any[];
  isLoading: boolean;
  statsLoading: boolean;
  historyLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: UserState = {
  currentProfile: null,
  userStats: null,
  userSongs: [],
  userVersions: [],
  likedVersions: [],
  collaborations: [],
  achievements: [],
  isLoading: false,
  statsLoading: false,
  historyLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks for user profile operations
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserProfile(userId);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to fetch user profile');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user profile');
    }
  }
);

export const fetchUserStats = createAsyncThunk(
  'user/fetchStats',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserStats(userId);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to fetch user stats');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user stats');
    }
  }
);

export const fetchUserSongHistory = createAsyncThunk(
  'user/fetchSongHistory',
  async (userId: string, { rejectWithValue }) => {
    try {
      const [songsResponse, versionsResponse, likedResponse, collaborationsResponse] = await Promise.all([
        apiService.getUserSongs(userId),
        apiService.getUserVersions(userId),
        apiService.getUserLikedVersions(userId),
        apiService.getUserCollaborations(userId),
      ]);

      return {
        songs: songsResponse.success ? songsResponse.data : [],
        versions: versionsResponse.success ? versionsResponse.data : [],
        likedVersions: likedResponse.success ? likedResponse.data : [],
        collaborations: collaborationsResponse.success ? collaborationsResponse.data : [],
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user song history');
    }
  }
);

export const fetchUserAchievements = createAsyncThunk(
  'user/fetchAchievements',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getUserAchievements(userId);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to fetch user achievements');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user achievements');
    }
  }
);

export const followUser = createAsyncThunk(
  'user/follow',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.followUser(userId);
      if (response.success) {
        return { userId, action: 'follow' };
      }
      return rejectWithValue(response.error || 'Failed to follow user');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to follow user');
    }
  }
);

export const unfollowUser = createAsyncThunk(
  'user/unfollow',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.unfollowUser(userId);
      if (response.success) {
        return { userId, action: 'unfollow' };
      }
      return rejectWithValue(response.error || 'Failed to unfollow user');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unfollow user');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserProfile: (state) => {
      state.currentProfile = null;
      state.userStats = null;
      state.userSongs = [];
      state.userVersions = [];
      state.likedVersions = [];
      state.collaborations = [];
      state.achievements = [];
      state.error = null;
      state.lastUpdated = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUserStats: (state, action: PayloadAction<Partial<UserStats>>) => {
      if (state.userStats) {
        state.userStats = { ...state.userStats, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProfile = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch user stats
      .addCase(fetchUserStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.userStats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch user song history
      .addCase(fetchUserSongHistory.pending, (state) => {
        state.historyLoading = true;
      })
      .addCase(fetchUserSongHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.userSongs = action.payload.songs || [];
        state.userVersions = action.payload.versions || [];
        state.likedVersions = action.payload.likedVersions || [];
        state.collaborations = action.payload.collaborations || [];
      })
      .addCase(fetchUserSongHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch achievements
      .addCase(fetchUserAchievements.fulfilled, (state, action) => {
        state.achievements = action.payload;
      })
      
      // Follow/unfollow user
      .addCase(followUser.fulfilled, (state, action) => {
        if (state.currentProfile) {
          state.currentProfile.followerCount += 1;
        }
      })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        if (state.currentProfile) {
          state.currentProfile.followerCount -= 1;
        }
      });
  },
});

export const { clearUserProfile, clearError, updateUserStats } = userSlice.actions;
export default userSlice.reducer; 