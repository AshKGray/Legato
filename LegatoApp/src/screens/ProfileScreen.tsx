import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logoutUser } from '../store/slices/authSlice';
import {
  fetchUserProfile,
  fetchUserStats,
  fetchUserSongHistory,
  fetchUserAchievements,
  clearUserProfile,
  followUser,
  unfollowUser,
} from '../store/slices/userSlice';
import { NavigationProps, SongVersion } from '../types';

interface ProfileScreenProps extends NavigationProps {}

const { width } = Dimensions.get('window');

// Helper function to group songs and find top versions
const groupSongsByTopVersion = (songs: any[], versions: SongVersion[], userId: string) => {
  const songGroups = songs.map(song => {
    // Get all versions for this song
    const songVersions = versions.filter(v => v.songId === song.id);
    
    // Sort by likes to find top version
    const sortedVersions = songVersions.sort((a, b) => b.likes - a.likes);
    const topVersion = sortedVersions[0];
    
    // Check if user participated
    const userVersions = songVersions.filter(v => v.userId === userId);
    const userParticipated = userVersions.length > 0;
    
    return {
      song,
      topVersion,
      allVersions: sortedVersions,
      totalVersions: songVersions.length,
      userParticipated,
      userVersions,
    };
  });
  
  return songGroups.filter(group => group.topVersion); // Only include songs with versions
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: currentUser, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const {
    currentProfile,
    userStats,
    userSongs,
    userVersions,
    likedVersions,
    collaborations,
    achievements,
    isLoading,
    statsLoading,
    historyLoading,
  } = useSelector((state: RootState) => state.user);
  
  const [activeTab, setActiveTab] = useState<'songs' | 'liked' | 'collaborations' | 'achievements'>('songs');
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  
  // Get userId from route params or use current user
  const profileUserId = route?.params?.userId || currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  useEffect(() => {
    if (profileUserId) {
      loadUserProfile();
    }
    return () => {
      dispatch(clearUserProfile());
    };
  }, [profileUserId]);

  const loadUserProfile = async () => {
    if (!profileUserId) return;
    
    try {
      await Promise.all([
        dispatch(fetchUserProfile(profileUserId)),
        dispatch(fetchUserStats(profileUserId)),
        dispatch(fetchUserSongHistory(profileUserId)),
        dispatch(fetchUserAchievements(profileUserId)),
      ]);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigation.navigate('Login');
  };

  const handleFollowToggle = () => {
    if (!profileUserId || !currentProfile) return;
    
    // This would need to track follow status - for now just dispatch the action
    dispatch(followUser(profileUserId));
  };

  const toggleSongExpansion = (songId: string) => {
    const newExpanded = new Set(expandedSongs);
    if (newExpanded.has(songId)) {
      newExpanded.delete(songId);
    } else {
      newExpanded.add(songId);
    }
    setExpandedSongs(newExpanded);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group songs by top version
  const groupedSongs = currentUser?.id 
    ? groupSongsByTopVersion(userSongs, userVersions, currentUser.id)
    : [];

  const renderSongItem = ({ item }: { item: any }) => {
    const isExpanded = expandedSongs.has(item.song.id);
    
    return (
      <View style={styles.songItem}>
        {/* Main song display - top version */}
        <TouchableOpacity
          style={styles.songHeader}
          onPress={() => navigation.navigate('SongDetail', { songId: item.song.id })}
        >
          <View style={styles.songInfo}>
            <Text style={styles.songTitle}>{item.song.title}</Text>
            <Text style={styles.songAuthor}>by @{item.song.originalAuthor?.username}</Text>
            {item.userParticipated && (
              <View style={styles.participatedBadge}>
                <Text style={styles.participatedText}>You participated</Text>
              </View>
            )}
          </View>
          
          <View style={styles.songStats}>
            <Text style={styles.topVersionInfo}>
              Top: {formatNumber(item.topVersion.likes)} ❤️
            </Text>
            <Text style={styles.versionCount}>
              {item.totalVersions} version{item.totalVersions !== 1 ? 's' : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Expand/Collapse button if multiple versions */}
        {item.totalVersions > 1 && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => toggleSongExpansion(item.song.id)}
          >
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Show Less' : `Show All ${item.totalVersions} Versions`}
            </Text>
            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>
        )}

        {/* Expanded versions list */}
        {isExpanded && (
          <View style={styles.expandedVersions}>
            {item.allVersions.map((version: SongVersion, index: number) => (
              <TouchableOpacity
                key={version.id}
                style={[
                  styles.versionItem,
                  index === 0 && styles.topVersionItem, // Highlight top version
                  version.userId === currentUser?.id && styles.userVersionItem, // Highlight user's versions
                ]}
                onPress={() => navigation.navigate('SongDetail', { 
                  songId: item.song.id, 
                  versionId: version.id 
                })}
              >
                <View style={styles.versionInfo}>
                  <Text style={styles.versionUser}>@{version.user?.username}</Text>
                  <Text style={styles.versionDate}>{formatDate(version.createdAt)}</Text>
                  {index === 0 && <Text style={styles.topLabel}>TOP</Text>}
                  {version.userId === currentUser?.id && <Text style={styles.youLabel}>YOU</Text>}
                </View>
                <View style={styles.versionStats}>
                  <Text style={styles.versionLikes}>{formatNumber(version.likes)} ❤️</Text>
                  <Text style={styles.versionComments}>{formatNumber(version.comments)} 💬</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderLikedItem = ({ item }: { item: SongVersion }) => (
    <TouchableOpacity
      style={styles.likedItem}
      onPress={() => navigation.navigate('SongDetail', { 
        songId: item.songId, 
        versionId: item.id 
      })}
    >
      <View style={styles.likedInfo}>
        <Text style={styles.likedTitle}>Song Title</Text>
        <Text style={styles.likedUser}>@{item.user?.username}</Text>
        <Text style={styles.likedDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={styles.likedStats}>
        <Text style={styles.likedLikes}>{formatNumber(item.likes)} ❤️</Text>
        <Text style={styles.likedComments}>{formatNumber(item.comments)} 💬</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCollaborationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.collaborationItem}
      onPress={() => navigation.navigate('SongDetail', { songId: item.song.id })}
    >
      <View style={styles.collaborationInfo}>
        <Text style={styles.collaborationTitle}>{item.song.title}</Text>
        <Text style={styles.collaborationType}>{item.collaborationType.toUpperCase()}</Text>
        <Text style={styles.collaborationDate}>{formatDate(item.version.createdAt)}</Text>
      </View>
      <View style={styles.collaborationStats}>
        <Text style={styles.collaborationLikes}>{formatNumber(item.version.likes)} ❤️</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAchievementItem = ({ item }: { item: any }) => (
    <View style={styles.achievementItem}>
      <Text style={styles.achievementIcon}>{item.icon}</Text>
      <View style={styles.achievementInfo}>
        <Text style={styles.achievementTitle}>{item.title}</Text>
        <Text style={styles.achievementDescription}>{item.description}</Text>
        <Text style={styles.achievementDate}>{formatDate(item.unlockedAt)}</Text>
      </View>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.authTitle}>Profile</Text>
          <Text style={styles.authSubtitle}>Please log in to view profiles</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !currentProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {currentProfile.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.username}>@{currentProfile.username}</Text>
            <Text style={styles.email}>{currentProfile.email}</Text>
            <Text style={styles.joinDate}>
              Joined {formatDate(currentProfile.createdAt)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.followButton} onPress={handleFollowToggle}>
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(userStats?.totalSongs || 0)}</Text>
            <Text style={styles.statLabel}>Songs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(userStats?.totalVersions || 0)}</Text>
            <Text style={styles.statLabel}>Versions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(currentProfile.followerCount)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(currentProfile.totalLikes)}</Text>
            <Text style={styles.statLabel}>Total Likes</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {[
            { key: 'songs', label: 'Songs', count: groupedSongs.length },
            { key: 'liked', label: 'Liked', count: likedVersions.length },
            { key: 'collaborations', label: 'Collabs', count: collaborations.length },
            { key: 'achievements', label: 'Awards', count: achievements.length },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
              <Text style={[styles.tabCount, activeTab === tab.key && styles.activeTabCount]}>
                {tab.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'songs' && (
            <FlatList
              data={groupedSongs}
              renderItem={renderSongItem}
              keyExtractor={(item) => item.song.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No songs yet</Text>
                  {isOwnProfile && (
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={() => navigation.navigate('Record')}
                    >
                      <Text style={styles.createButtonText}>Create Your First Song</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          )}

          {activeTab === 'liked' && (
            <FlatList
              data={likedVersions}
              renderItem={renderLikedItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No liked songs yet</Text>
                </View>
              }
            />
          )}

          {activeTab === 'collaborations' && (
            <FlatList
              data={collaborations}
              renderItem={renderCollaborationItem}
              keyExtractor={(item) => `${item.song.id}-${item.version.id}`}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No collaborations yet</Text>
                </View>
              }
            />
          )}

          {activeTab === 'achievements' && (
            <FlatList
              data={achievements}
              renderItem={renderAchievementItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No achievements yet</Text>
                </View>
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  authSubtitle: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 5,
  },
  joinDate: {
    color: '#999',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  logoutButton: {
    backgroundColor: '#333',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  followButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 5,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#111',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  tabCount: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  activeTabCount: {
    color: '#FF6B6B',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  songItem: {
    marginBottom: 20,
    backgroundColor: '#111',
    borderRadius: 10,
    overflow: 'hidden',
  },
  songHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  songAuthor: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  participatedBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  participatedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  songStats: {
    alignItems: 'flex-end',
  },
  topVersionInfo: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  versionCount: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#222',
  },
  expandButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  expandIcon: {
    color: '#FF6B6B',
    fontSize: 12,
  },
  expandedVersions: {
    backgroundColor: '#0a0a0a',
  },
  versionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  topVersionItem: {
    backgroundColor: '#1a1a1a',
  },
  userVersionItem: {
    backgroundColor: '#2a1a1a',
  },
  versionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  versionUser: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  versionDate: {
    color: '#999',
    fontSize: 12,
  },
  topLabel: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youLabel: {
    color: '#FF6B6B',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  versionStats: {
    flexDirection: 'row',
    gap: 15,
  },
  versionLikes: {
    color: '#FF6B6B',
    fontSize: 12,
  },
  versionComments: {
    color: '#ccc',
    fontSize: 12,
  },
  likedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#111',
    borderRadius: 10,
  },
  likedInfo: {
    flex: 1,
  },
  likedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  likedUser: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 3,
  },
  likedDate: {
    color: '#999',
    fontSize: 12,
  },
  likedStats: {
    flexDirection: 'row',
    gap: 15,
  },
  likedLikes: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  likedComments: {
    color: '#ccc',
    fontSize: 14,
  },
  collaborationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#111',
    borderRadius: 10,
  },
  collaborationInfo: {
    flex: 1,
  },
  collaborationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  collaborationType: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  collaborationDate: {
    color: '#999',
    fontSize: 12,
  },
  collaborationStats: {
    alignItems: 'flex-end',
  },
  collaborationLikes: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  achievementItem: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#111',
    borderRadius: 10,
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  achievementDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  achievementDate: {
    color: '#999',
    fontSize: 12,
  },
});

export default ProfileScreen; 