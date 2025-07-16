import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, User, Song, SongVersion, Comment, ChartEntry } from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // This will be your backend URL - update when you deploy
    this.baseURL = __DEV__ ? 'http://localhost:3001' : 'https://your-production-url.com';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.api.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    // This will be managed by Redux store
    return null;
  }

  // Auth endpoints (Agent 3)
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.api.post('/api/auth/login', { email, password });
    return response.data;
  }

  async register(username: string, email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.api.post('/api/auth/register', { username, email, password });
    return response.data;
  }

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.api.post('/api/auth/logout');
    return response.data;
  }

  // Song endpoints (Agent 3)
  async createSong(title: string, lyrics: string): Promise<ApiResponse<Song>> {
    const response = await this.api.post('/api/songs', { title, lyrics });
    return response.data;
  }

  async getSong(songId: string): Promise<ApiResponse<Song>> {
    const response = await this.api.get(`/api/songs/${songId}`);
    return response.data;
  }

  async getSongVersions(songId: string): Promise<ApiResponse<SongVersion[]>> {
    const response = await this.api.get(`/api/songs/${songId}/versions`);
    return response.data;
  }

  // Recording endpoints (Agent 5)
  async uploadRecording(songId: string, audioFile: FormData, description?: string): Promise<ApiResponse<SongVersion>> {
    const response = await this.api.post(`/api/songs/${songId}/versions`, audioFile, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: { description }
    });
    return response.data;
  }

  // Voting endpoints (Agent 6)
  async likeSongVersion(versionId: string): Promise<ApiResponse<null>> {
    const response = await this.api.post(`/api/voting/like/${versionId}`);
    return response.data;
  }

  async unlikeSongVersion(versionId: string): Promise<ApiResponse<null>> {
    const response = await this.api.delete(`/api/voting/like/${versionId}`);
    return response.data;
  }

  async addComment(versionId: string, content: string): Promise<ApiResponse<Comment>> {
    const response = await this.api.post(`/api/voting/comment/${versionId}`, { content });
    return response.data;
  }

  async getComments(versionId: string): Promise<ApiResponse<Comment[]>> {
    const response = await this.api.get(`/api/voting/comments/${versionId}`);
    return response.data;
  }

  // Charts endpoints (Agent 4)
  async getCharts(type: 'overall' | 'genre' | 'rising' = 'overall', limit: number = 50): Promise<ApiResponse<ChartEntry[]>> {
    const response = await this.api.get(`/api/charts/${type}`, { params: { limit } });
    return response.data;
  }

  async getTrendingSongs(limit: number = 20): Promise<ApiResponse<SongVersion[]>> {
    const response = await this.api.get('/api/charts/trending', { params: { limit } });
    return response.data;
  }

  // User endpoints
  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    const response = await this.api.get(`/api/users/${userId}`);
    return response.data;
  }

  async getUserSongs(userId: string): Promise<ApiResponse<Song[]>> {
    const response = await this.api.get(`/api/users/${userId}/songs`);
    return response.data;
  }

  async getUserVersions(userId: string): Promise<ApiResponse<SongVersion[]>> {
    const response = await this.api.get(`/api/users/${userId}/versions`);
    return response.data;
  }

  // New comprehensive user profile endpoints
  async getUserStats(userId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/users/${userId}/stats`);
    return response.data;
  }

  async getUserSongHistory(userId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/users/${userId}/history`);
    return response.data;
  }

  async getUserLikedVersions(userId: string): Promise<ApiResponse<SongVersion[]>> {
    const response = await this.api.get(`/api/users/${userId}/liked`);
    return response.data;
  }

  async getUserCollaborations(userId: string): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/api/users/${userId}/collaborations`);
    return response.data;
  }

  async getUserAchievements(userId: string): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/api/users/${userId}/achievements`);
    return response.data;
  }

  async followUser(userId: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/api/users/${userId}/follow`);
    return response.data;
  }

  async unfollowUser(userId: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/api/users/${userId}/follow`);
    return response.data;
  }

  // New collaboration window and version management endpoints
  async getOpenCollaborations(limit: number = 20): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/api/voting/collaborations/open', {
      params: { limit }
    });
    return response.data;
  }

  async getVersionHierarchy(songId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/voting/song/${songId}/hierarchy`);
    return response.data;
  }

  async joinCollaboration(songId: string, options: any): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/api/voting/song/${songId}/join`, options);
    return response.data;
  }

  async createSongWithCollaborationWindow(songData: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/api/voting/song', songData);
    return response.data;
  }

  async getCollaborationWindow(songId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/voting/song/${songId}/window`);
    return response.data;
  }

  async closeCollaborationWindow(songId: string): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/api/voting/song/${songId}/close`);
    return response.data;
  }

  async getEngagementMetrics(targetId: string, targetType: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/voting/engagement/${targetType}/${targetId}`);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService; 