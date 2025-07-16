export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  createdAt: string;
}

// New interfaces for comprehensive user profile features
export interface UserStats {
  totalSongs: number;
  totalVersions: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  followerCount: number;
  followingCount: number;
  chartPositions: number;
  averageEngagementScore: number;
  joinedDate: string;
  lastActiveDate: string;
  topGenres: string[];
  monthlyStats: {
    month: string;
    songs: number;
    versions: number;
    likes: number;
    views: number;
  }[];
}

export interface UserSongHistory {
  songs: Song[];
  versions: SongVersion[];
  likedVersions: SongVersion[];
  collaborations: {
    song: Song;
    version: SongVersion;
    collaborationType: 'duet' | 'remix' | 'cover';
  }[];
  achievements: {
    id: string;
    type: 'first_song' | 'viral_hit' | 'collaboration_master' | 'chart_topper' | 'prolific_creator';
    title: string;
    description: string;
    unlockedAt: string;
    icon: string;
  }[];
  // New grouped song data for better profile display
  groupedSongs: {
    song: Song;
    topVersion: SongVersion; // Most liked version for this song
    allVersions: SongVersion[]; // All versions for this song
    totalVersions: number;
    userParticipated: boolean; // Did current user contribute to this song?
    userVersions: SongVersion[]; // User's own versions of this song
  }[];
}

export interface Song {
  id: string;
  title: string;
  lyrics: string;
  originalAuthor: User;
  collaborationWindowStart: string;
  collaborationWindowEnd: string;
  isCollaborationActive: boolean;
  featuredVersionId?: string;
  totalVersions: number;
  createdAt: string;
}

// New comprehensive collaboration window types
export interface CollaborationWindow {
  isOpen: boolean;
  startTime: string;
  endTime: string;
  hoursRemaining: number;
  totalHours: number;
  percentComplete: number;
  daysRemaining: number;
  status: 'active' | 'ending_soon' | 'closed' | 'expired';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface VersionHierarchy {
  song: {
    id: string;
    title: string;
    userId: string;
    user: User;
    featuredVersionId: string;
  };
  collaborationWindow: CollaborationWindow;
  featuredVersion: SongVersion;
  allVersions: SongVersion[];
  versionsByEngagement: SongVersion[];
  totalVersions: number;
  canJoin: boolean;
  userVersions: SongVersion[];
  hasUserParticipated: boolean;
}

export interface CollaborationJoinOptions {
  collaborationType: 'duet' | 'remix' | 'cover' | 'harmony' | 'instrument';
  parentVersionId?: string;
  notes?: string;
  playAlongMode: boolean;
}

export interface OpenCollaboration {
  song: Song;
  collaborationWindow: CollaborationWindow;
  featuredVersion: SongVersion;
  recentVersions: SongVersion[];
  collaborationCount: number;
  popularityScore: number;
  userCanJoin: boolean;
  joinOptions: string[];
}

export interface SongVersion {
  id: string;
  songId: string;
  userId: string;
  user: User;
  audioUrl: string;
  videoUrl?: string;
  description?: string;
  likes: number;
  comments: number;
  engagementScore: number;
  isFeatured: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  songVersionId: string;
  content: string;
  createdAt: string;
}

export interface Vote {
  id: string;
  userId: string;
  songVersionId: string;
  type: 'like';
  createdAt: string;
}

export interface ChartEntry {
  position: number;
  songVersion: SongVersion;
  song: Song;
  changeFromPrevious: number;
  weeksOnChart: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  recordedUri?: string;
  duration: number;
  hasPermission: boolean;
  // New comprehensive recording features
  recordingMode: 'audio' | 'video';
  isVideoEnabled: boolean;
  selectedFilter: string | null;
  playbackUri?: string; // For play-along functionality
  isPlayingAlong: boolean;
  recordingQuality: 'low' | 'medium' | 'high';
  flashMode: 'on' | 'off' | 'auto';
  cameraType: 'front' | 'back';
  volume: number;
  effects: {
    reverb: boolean;
    echo: boolean;
    pitch: number; // -12 to +12 semitones
  };
}

export interface NavigationProps {
  navigation: any;
  route: any;
} 