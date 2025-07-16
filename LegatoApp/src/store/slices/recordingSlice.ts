import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RecordingState } from '../../types';
import apiService from '../../services/api';

interface ExtendedRecordingState extends RecordingState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

const initialState: ExtendedRecordingState = {
  isRecording: false,
  recordedUri: undefined,
  duration: 0,
  hasPermission: false,
  // New comprehensive recording features
  recordingMode: 'video',
  isVideoEnabled: true,
  selectedFilter: null,
  playbackUri: undefined,
  isPlayingAlong: false,
  recordingQuality: 'high',
  flashMode: 'off',
  cameraType: 'front',
  volume: 1.0,
  effects: {
    reverb: false,
    echo: false,
    pitch: 0,
  },
  isUploading: false,
  uploadProgress: 0,
  error: null,
};

export const uploadRecording = createAsyncThunk(
  'recording/upload',
  async ({ songId, audioFile, description }: { songId: string; audioFile: FormData; description?: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.uploadRecording(songId, audioFile, description);
      if (response.success && response.data) {
        return response.data;
      }
      return rejectWithValue(response.error || 'Failed to upload recording');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload recording');
    }
  }
);

const recordingSlice = createSlice({
  name: 'recording',
  initialState,
  reducers: {
    startRecording: (state) => {
      state.isRecording = true;
      state.duration = 0;
      state.error = null;
    },
    stopRecording: (state, action: PayloadAction<{ uri: string; duration: number }>) => {
      state.isRecording = false;
      state.recordedUri = action.payload.uri;
      state.duration = action.payload.duration;
    },
    updateDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    setPermission: (state, action: PayloadAction<boolean>) => {
      state.hasPermission = action.payload;
    },
    clearRecording: (state) => {
      state.recordedUri = undefined;
      state.duration = 0;
      state.isRecording = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    // New comprehensive recording actions
    setRecordingMode: (state, action: PayloadAction<'audio' | 'video'>) => {
      state.recordingMode = action.payload;
      state.isVideoEnabled = action.payload === 'video';
    },
    toggleVideoEnabled: (state) => {
      state.isVideoEnabled = !state.isVideoEnabled;
      state.recordingMode = state.isVideoEnabled ? 'video' : 'audio';
    },
    setFilter: (state, action: PayloadAction<string | null>) => {
      state.selectedFilter = action.payload;
    },
    setPlaybackUri: (state, action: PayloadAction<string>) => {
      state.playbackUri = action.payload;
    },
    startPlayAlong: (state) => {
      state.isPlayingAlong = true;
    },
    stopPlayAlong: (state) => {
      state.isPlayingAlong = false;
    },
    setRecordingQuality: (state, action: PayloadAction<'low' | 'medium' | 'high'>) => {
      state.recordingQuality = action.payload;
    },
    setFlashMode: (state, action: PayloadAction<'on' | 'off' | 'auto'>) => {
      state.flashMode = action.payload;
    },
    toggleCameraType: (state) => {
      state.cameraType = state.cameraType === 'front' ? 'back' : 'front';
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
    },
    updateEffects: (state, action: PayloadAction<Partial<ExtendedRecordingState['effects']>>) => {
      state.effects = { ...state.effects, ...action.payload };
    },
    resetSettings: (state) => {
      state.selectedFilter = null;
      state.recordingQuality = 'high';
      state.flashMode = 'off';
      state.cameraType = 'front';
      state.volume = 1.0;
      state.effects = {
        reverb: false,
        echo: false,
        pitch: 0,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadRecording.pending, (state) => {
        state.isUploading = true;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadRecording.fulfilled, (state) => {
        state.isUploading = false;
        state.uploadProgress = 100;
        state.recordedUri = undefined;
        state.duration = 0;
      })
      .addCase(uploadRecording.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 0;
        state.error = action.payload as string;
      });
  },
});

export const {
  startRecording,
  stopRecording,
  updateDuration,
  setPermission,
  clearRecording,
  setError,
  clearError,
  setUploadProgress,
  // New comprehensive recording actions
  setRecordingMode,
  toggleVideoEnabled,
  setFilter,
  setPlaybackUri,
  startPlayAlong,
  stopPlayAlong,
  setRecordingQuality,
  setFlashMode,
  toggleCameraType,
  setVolume,
  updateEffects,
  resetSettings,
} = recordingSlice.actions;

export default recordingSlice.reducer; 