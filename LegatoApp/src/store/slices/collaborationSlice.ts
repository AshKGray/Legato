import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CollaborationWindow, VersionHierarchy, OpenCollaboration, CollaborationJoinOptions } from '../../types';
import apiService from '../../services/api';

interface CollaborationState {
  openCollaborations: OpenCollaboration[];
  currentVersionHierarchy: VersionHierarchy | null;
  collaborationWindow: CollaborationWindow | null;
  isLoading: boolean;
  isJoining: boolean;
  hierarchyLoading: boolean;
  error: string | null;
  joinError: string | null;
  lastUpdated: string | null;
  windowTimers: Map<string, NodeJS.Timeout>;
}

const initialState: CollaborationState = {
  openCollaborations: [],
  currentVersionHierarchy: null,
  collaborationWindow: null,
  isLoading: false,
  isJoining: false,
  hierarchyLoading: false,
  error: null,
  joinError: null,
  lastUpdated: null,
  windowTimers: new Map(),
};

// Helper function to calculate collaboration window status
const calculateWindowStatus = (window: any): CollaborationWindow => {
  const now = new Date();
  const endTime = new Date(window.endTime);
  const startTime = new Date(window.startTime);
  
  const hoursRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const totalHours = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
  const percentComplete = Math.max(0, Math.min(100, ((totalHours - hoursRemaining) / totalHours) * 100));
  
  let status: CollaborationWindow['status'] = 'active';
  let urgencyLevel: CollaborationWindow['urgencyLevel'] = 'low';
  
  if (hoursRemaining === 0) {
    status = 'expired';
    urgencyLevel = 'critical';
  } else if (hoursRemaining <= 6) {
    status = 'ending_soon';
    urgencyLevel = 'critical';
  } else if (hoursRemaining <= 24) {
    status = 'ending_soon';
    urgencyLevel = 'high';
  } else if (hoursRemaining <= 48) {
    status = 'active';
    urgencyLevel = 'medium';
  }
  
  return {
    isOpen: window.isOpen && hoursRemaining > 0,
    startTime: window.startTime,
    endTime: window.endTime,
    hoursRemaining,
    totalHours,
    percentComplete: Math.round(percentComplete),
    daysRemaining,
    status,
    urgencyLevel,
  };
};

// Async thunks
export const fetchOpenCollaborations = createAsyncThunk(
  'collaboration/fetchOpen',
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await apiService.getOpenCollaborations(limit);
      if (response.success && response.data) {
        // Process each collaboration to calculate window status
        const processedCollaborations = response.data.map((collab: any) => ({
          ...collab,
          collaborationWindow: calculateWindowStatus(collab.collaborationWindow),
        }));
        return processedCollaborations;
      }
      return rejectWithValue(response.error || 'Failed to fetch open collaborations');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch open collaborations');
    }
  }
);

export const fetchVersionHierarchy = createAsyncThunk(
  'collaboration/fetchHierarchy',
  async (songId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getVersionHierarchy(songId);
      if (response.success && response.data) {
        const hierarchyData = {
          ...response.data,
          collaborationWindow: calculateWindowStatus(response.data.collaborationWindow),
        };
        return hierarchyData;
      }
      return rejectWithValue(response.error || 'Failed to fetch version hierarchy');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch version hierarchy');
    }
  }
);

export const joinCollaboration = createAsyncThunk(
  'collaboration/join',
  async ({ songId, options }: { songId: string; options: CollaborationJoinOptions }, { rejectWithValue }) => {
    try {
      const response = await apiService.joinCollaboration(songId, options);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to join collaboration');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to join collaboration');
    }
  }
);

export const createSongWithWindow = createAsyncThunk(
  'collaboration/createSong',
  async (songData: any, { rejectWithValue }) => {
    try {
      const response = await apiService.createSongWithCollaborationWindow(songData);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to create song');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create song');
    }
  }
);

export const getCollaborationWindow = createAsyncThunk(
  'collaboration/getWindow',
  async (songId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getCollaborationWindow(songId);
      if (response.success && response.data) {
        return calculateWindowStatus(response.data);
      }
      return rejectWithValue(response.error || 'Failed to get collaboration window');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get collaboration window');
    }
  }
);

const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.joinError = null;
    },
    clearHierarchy: (state) => {
      state.currentVersionHierarchy = null;
      state.collaborationWindow = null;
    },
    updateWindowTimer: (state, action: PayloadAction<{ songId: string; window: CollaborationWindow }>) => {
      const { songId, window } = action.payload;
      
      // Update open collaborations
      state.openCollaborations = state.openCollaborations.map(collab => 
        collab.song.id === songId 
          ? { ...collab, collaborationWindow: window }
          : collab
      );
      
      // Update current hierarchy if it matches
      if (state.currentVersionHierarchy?.song.id === songId) {
        state.currentVersionHierarchy.collaborationWindow = window;
      }
      
      // Update standalone window
      if (state.collaborationWindow) {
        state.collaborationWindow = window;
      }
    },
    filterExpiredCollaborations: (state) => {
      state.openCollaborations = state.openCollaborations.filter(
        collab => collab.collaborationWindow.isOpen
      );
    },
    sortCollaborationsByUrgency: (state) => {
      const urgencyOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      state.openCollaborations.sort((a, b) => {
        return urgencyOrder[a.collaborationWindow.urgencyLevel] - urgencyOrder[b.collaborationWindow.urgencyLevel];
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch open collaborations
      .addCase(fetchOpenCollaborations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOpenCollaborations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.openCollaborations = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchOpenCollaborations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch version hierarchy
      .addCase(fetchVersionHierarchy.pending, (state) => {
        state.hierarchyLoading = true;
        state.error = null;
      })
      .addCase(fetchVersionHierarchy.fulfilled, (state, action) => {
        state.hierarchyLoading = false;
        state.currentVersionHierarchy = action.payload;
        state.collaborationWindow = action.payload.collaborationWindow;
      })
      .addCase(fetchVersionHierarchy.rejected, (state, action) => {
        state.hierarchyLoading = false;
        state.error = action.payload as string;
      })
      
      // Join collaboration
      .addCase(joinCollaboration.pending, (state) => {
        state.isJoining = true;
        state.joinError = null;
      })
      .addCase(joinCollaboration.fulfilled, (state, action) => {
        state.isJoining = false;
        // Refresh hierarchy after successful join
        if (state.currentVersionHierarchy) {
          state.currentVersionHierarchy.hasUserParticipated = true;
          state.currentVersionHierarchy.totalVersions += 1;
        }
      })
      .addCase(joinCollaboration.rejected, (state, action) => {
        state.isJoining = false;
        state.joinError = action.payload as string;
      })
      
      // Create song with window
      .addCase(createSongWithWindow.fulfilled, (state, action) => {
        // Add to open collaborations if successful
        const newCollab = {
          song: action.payload.song,
          collaborationWindow: calculateWindowStatus(action.payload.collaborationWindow),
          featuredVersion: action.payload.originalCollaboration,
          recentVersions: [action.payload.originalCollaboration],
          collaborationCount: 1,
          popularityScore: 0,
          userCanJoin: false, // Can't join your own song initially
          joinOptions: [],
        };
        state.openCollaborations.unshift(newCollab);
      })
      
      // Get collaboration window
      .addCase(getCollaborationWindow.fulfilled, (state, action) => {
        state.collaborationWindow = action.payload;
      });
  },
});

export const {
  clearError,
  clearHierarchy,
  updateWindowTimer,
  filterExpiredCollaborations,
  sortCollaborationsByUrgency,
} = collaborationSlice.actions;

export default collaborationSlice.reducer; 