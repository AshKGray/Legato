import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchOpenCollaborations,
  joinCollaboration,
  clearError,
  sortCollaborationsByUrgency,
  filterExpiredCollaborations,
  updateWindowTimer,
} from '../store/slices/collaborationSlice';
import { NavigationProps, OpenCollaboration, CollaborationJoinOptions } from '../types';

interface CollaborationsScreenProps extends NavigationProps {}

const CollaborationsScreen: React.FC<CollaborationsScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    openCollaborations, 
    isLoading, 
    isJoining, 
    error, 
    joinError,
    lastUpdated 
  } = useSelector((state: RootState) => state.collaboration);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] = useState<OpenCollaboration | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinOptions, setJoinOptions] = useState<CollaborationJoinOptions>({
    collaborationType: 'duet',
    playAlongMode: true,
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadCollaborations();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Set up timer to update collaboration windows every minute
    const interval = setInterval(() => {
      updateCollaborationTimers();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [openCollaborations]);

  const loadCollaborations = async () => {
    try {
      await dispatch(fetchOpenCollaborations(50)).unwrap();
      dispatch(sortCollaborationsByUrgency());
    } catch (error) {
      console.error('Failed to load collaborations:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCollaborations();
    setRefreshing(false);
  };

  const updateCollaborationTimers = () => {
    // Update window timers and filter expired ones
    dispatch(filterExpiredCollaborations());
    
    // Recalculate urgency and resort
    dispatch(sortCollaborationsByUrgency());
  };

  const handleJoinCollaboration = (collaboration: OpenCollaboration) => {
    if (!collaboration.userCanJoin) {
      Alert.alert(
        'Cannot Join',
        'You cannot join this collaboration. You may have already participated or the window may be closed.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedCollaboration(collaboration);
    setShowJoinModal(true);
  };

  const confirmJoinCollaboration = async () => {
    if (!selectedCollaboration) return;

    try {
      await dispatch(joinCollaboration({
        songId: selectedCollaboration.song.id,
        options: joinOptions,
      })).unwrap();

      setShowJoinModal(false);
      setSelectedCollaboration(null);
      
      Alert.alert(
        'Success!',
        'You have joined the collaboration. You can now record your version.',
        [
          {
            text: 'Record Now',
            onPress: () => navigation.navigate('Record', { 
              songId: selectedCollaboration.song.id,
              collaborationType: joinOptions.collaborationType,
              playAlongMode: joinOptions.playAlongMode,
            }),
          },
          { text: 'Later', style: 'cancel' },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to join collaboration. Please try again.');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#FF4444';
      case 'high': return '#FF8844';
      case 'medium': return '#FFAA44';
      case 'low': return '#44AA44';
      default: return '#666';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'URGENT';
      case 'high': return 'ENDING SOON';
      case 'medium': return 'ACTIVE';
      case 'low': return 'NEW';
      default: return '';
    }
  };

  const formatTimeRemaining = (hoursRemaining: number) => {
    if (hoursRemaining < 1) {
      const minutes = Math.floor(hoursRemaining * 60);
      return `${minutes}m left`;
    } else if (hoursRemaining < 24) {
      return `${Math.floor(hoursRemaining)}h left`;
    } else {
      const days = Math.floor(hoursRemaining / 24);
      const hours = Math.floor(hoursRemaining % 24);
      return `${days}d ${hours}h left`;
    }
  };

  const renderCollaborationItem = ({ item }: { item: OpenCollaboration }) => {
    const { song, collaborationWindow, featuredVersion, collaborationCount, userCanJoin } = item;
    
    return (
      <TouchableOpacity
        style={styles.collaborationCard}
        onPress={() => navigation.navigate('SongDetail', { songId: song.id })}
      >
        {/* Urgency Banner */}
        <View style={[
          styles.urgencyBanner,
          { backgroundColor: getUrgencyColor(collaborationWindow.urgencyLevel) }
        ]}>
          <Text style={styles.urgencyText}>{getUrgencyText(collaborationWindow.urgencyLevel)}</Text>
          <Text style={styles.timeRemaining}>
            {formatTimeRemaining(collaborationWindow.hoursRemaining)}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { 
                width: `${collaborationWindow.percentComplete}%`,
                backgroundColor: getUrgencyColor(collaborationWindow.urgencyLevel),
              }
            ]} />
          </View>
          <Text style={styles.progressText}>
            {collaborationWindow.percentComplete}% complete
          </Text>
        </View>

        {/* Song Info */}
        <View style={styles.songInfo}>
          <Text style={styles.songTitle}>{song.title}</Text>
          <Text style={styles.songAuthor}>by @{song.originalAuthor.username}</Text>
          <Text style={styles.collaborationCount}>
            {collaborationCount} collaboration{collaborationCount !== 1 ? 's' : ''} so far
          </Text>
        </View>

        {/* Featured Version Preview */}
        <View style={styles.featuredPreview}>
          <Text style={styles.featuredLabel}>Current Top Version:</Text>
          <Text style={styles.featuredUser}>@{featuredVersion.user?.username}</Text>
          <Text style={styles.featuredStats}>
            ❤️ {featuredVersion.likes} • 💬 {featuredVersion.comments}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => navigation.navigate('SongDetail', { songId: song.id })}
          >
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>
          
          {userCanJoin && collaborationWindow.isOpen && (
            <TouchableOpacity
              style={[
                styles.joinButton,
                { backgroundColor: getUrgencyColor(collaborationWindow.urgencyLevel) }
              ]}
              onPress={() => handleJoinCollaboration(item)}
            >
              <Text style={styles.joinButtonText}>Join Collaboration</Text>
            </TouchableOpacity>
          )}
          
          {!collaborationWindow.isOpen && (
            <View style={styles.closedIndicator}>
              <Text style={styles.closedText}>Collaboration Closed</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderJoinModal = () => (
    <Modal
      visible={showJoinModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowJoinModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Join Collaboration</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowJoinModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.songTitleModal}>
              "{selectedCollaboration?.song.title}"
            </Text>
            <Text style={styles.songAuthorModal}>
              by @{selectedCollaboration?.song.originalAuthor.username}
            </Text>

            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Collaboration Type:</Text>
              <View style={styles.typeOptions}>
                {[
                  { key: 'duet', label: 'Duet', desc: 'Sing along with the original' },
                  { key: 'harmony', label: 'Harmony', desc: 'Add harmonies to the song' },
                  { key: 'remix', label: 'Remix', desc: 'Your creative take on the song' },
                  { key: 'instrument', label: 'Instrument', desc: 'Add instrumental parts' },
                  { key: 'cover', label: 'Cover', desc: 'Your own version of the song' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeOption,
                      joinOptions.collaborationType === type.key && styles.typeOptionSelected
                    ]}
                    onPress={() => setJoinOptions(prev => ({
                      ...prev,
                      collaborationType: type.key as any
                    }))}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      joinOptions.collaborationType === type.key && styles.typeOptionTextSelected
                    ]}>
                      {type.label}
                    </Text>
                    <Text style={styles.typeOptionDesc}>{type.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Recording Options:</Text>
              <TouchableOpacity
                style={styles.checkboxOption}
                onPress={() => setJoinOptions(prev => ({
                  ...prev,
                  playAlongMode: !prev.playAlongMode
                }))}
              >
                <View style={[
                  styles.checkbox,
                  joinOptions.playAlongMode && styles.checkboxChecked
                ]}>
                  {joinOptions.playAlongMode && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>Play-along mode</Text>
                  <Text style={styles.checkboxDesc}>
                    Hear the original track while recording your version
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowJoinModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={confirmJoinCollaboration}
              disabled={isJoining}
            >
              <Text style={styles.confirmButtonText}>
                {isJoining ? 'Joining...' : 'Join & Record'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.authTitle}>Open Collaborations</Text>
          <Text style={styles.authSubtitle}>Login to join music collaborations</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Open Collaborations</Text>
        <Text style={styles.subtitle}>
          {openCollaborations.length} active collaboration{openCollaborations.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              dispatch(clearError());
              loadCollaborations();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={openCollaborations}
        renderItem={renderCollaborationItem}
        keyExtractor={(item) => item.song.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Open Collaborations</Text>
              <Text style={styles.emptySubtitle}>
                Check back later for new songs to collaborate on!
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('Record')}
              >
                <Text style={styles.createButtonText}>Create New Song</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {renderJoinModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 5,
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
    textAlign: 'center',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#330000',
    margin: 10,
    padding: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#FF6B6B',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  collaborationCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  urgencyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeRemaining: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: '#ccc',
    fontSize: 12,
  },
  songInfo: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  songTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  songAuthor: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  collaborationCount: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuredPreview: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  featuredLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 3,
  },
  featuredUser: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  featuredStats: {
    color: '#ccc',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 10,
  },
  previewButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  joinButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closedIndicator: {
    flex: 2,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closedText: {
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  songTitleModal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  songAuthorModal: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 25,
  },
  optionSection: {
    marginBottom: 25,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  typeOptions: {
    gap: 10,
  },
  typeOption: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#331a1a',
  },
  typeOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  typeOptionTextSelected: {
    color: '#FF6B6B',
  },
  typeOptionDesc: {
    color: '#ccc',
    fontSize: 12,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  checkboxDesc: {
    color: '#ccc',
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CollaborationsScreen; 