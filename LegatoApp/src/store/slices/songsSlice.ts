import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Song, SongVersion, ChartEntry, Comment } from '../../types';
import apiService from '../../services/api';

interface SongsState {
  songs: Song[];
  currentSong: Song | null;
  currentVersions: SongVersion[];
  charts: ChartEntry[];
  trending: SongVersion[];
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SongsState = {
  songs: [],
  currentSong: null,
  currentVersions: [],
  charts: [],
  trending: [],
  comments: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const createSong = createAsyncThunk(
  'songs/create',
  async ({ title, lyrics }: { title: string; lyrics: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.createSong(title, lyrics);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to create song');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create song');
    }
  }
);

export const fetchSong = createAsyncThunk(
  'songs/fetchSong',
  async (songId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getSong(songId);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to fetch song');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch song');
    }
  }
);

export const fetchSongVersions = createAsyncThunk(
  'songs/fetchVersions',
  async (songId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getSongVersions(songId);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to fetch versions');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch versions');
    }
  }
);

export const fetchCharts = createAsyncThunk(
  'songs/fetchCharts',
  async ({ type, limit }: { type: 'overall' | 'genre' | 'rising'; limit: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.getCharts(type, limit);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to fetch charts');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch charts');
    }
  }
);

export const fetchTrending = createAsyncThunk(
  'songs/fetchTrending',
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await apiService.getTrendingSongs(limit);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to fetch trending');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch trending');
    }
  }
);

export const likeVersion = createAsyncThunk(
  'songs/like',
  async (versionId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.likeSongVersion(versionId);
      if (response.success) {
        return versionId;
      }
      return rejectWithValue(response.error || 'Failed to like version');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to like version');
    }
  }
);

export const unlikeVersion = createAsyncThunk(
  'songs/unlike',
  async (versionId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.unlikeSongVersion(versionId);
      if (response.success) {
        return versionId;
      }
      return rejectWithValue(response.error || 'Failed to unlike version');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unlike version');
    }
  }
);

export const addComment = createAsyncThunk(
  'songs/addComment',
  async ({ versionId, content }: { versionId: string; content: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.addComment(versionId, content);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to add comment');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

export const fetchComments = createAsyncThunk(
  'songs/fetchComments',
  async (versionId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getComments(versionId);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to fetch comments');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch comments');
    }
  }
);

const songsSlice = createSlice({
  name: 'songs',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentSong: (state, action: PayloadAction<Song>) => {
      state.currentSong = action.payload;
    },
    clearCurrentSong: (state) => {
      state.currentSong = null;
      state.currentVersions = [];
      state.comments = [];
    },
    updateVersionLikes: (state, action: PayloadAction<{ versionId: string; increment: boolean }>) => {
      const version = state.currentVersions.find(v => v.id === action.payload.versionId);
      if (version) {
        version.likes += action.payload.increment ? 1 : -1;
        version.engagementScore = version.likes + (version.comments * 2);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create song
      .addCase(createSong.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSong.fulfilled, (state, action) => {
        state.isLoading = false;
        state.songs.push(action.payload);
        state.currentSong = action.payload;
      })
      .addCase(createSong.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch song
      .addCase(fetchSong.fulfilled, (state, action) => {
        state.currentSong = action.payload;
      })
      // Fetch versions
      .addCase(fetchSongVersions.fulfilled, (state, action) => {
        state.currentVersions = action.payload;
      })
      // Fetch charts
      .addCase(fetchCharts.fulfilled, (state, action) => {
        state.charts = action.payload;
      })
      // Fetch trending
      .addCase(fetchTrending.fulfilled, (state, action) => {
        state.trending = action.payload;
      })
      // Like/unlike
      .addCase(likeVersion.fulfilled, (state, action) => {
        const version = state.currentVersions.find(v => v.id === action.payload);
        if (version) {
          version.likes += 1;
          version.engagementScore = version.likes + (version.comments * 2);
        }
      })
      .addCase(unlikeVersion.fulfilled, (state, action) => {
        const version = state.currentVersions.find(v => v.id === action.payload);
        if (version) {
          version.likes -= 1;
          version.engagementScore = version.likes + (version.comments * 2);
        }
      })
      // Comments
      .addCase(addComment.fulfilled, (state, action) => {
        state.comments.push(action.payload);
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.comments = action.payload;
      });
  },
});

export const { clearError, setCurrentSong, clearCurrentSong, updateVersionLikes } = songsSlice.actions;
export default songsSlice.reducer; 