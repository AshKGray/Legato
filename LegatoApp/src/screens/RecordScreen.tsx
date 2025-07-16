import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  startRecording,
  stopRecording,
  setPermission,
  clearRecording,
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
  uploadRecording,
} from '../store/slices/recordingSlice';
import { NavigationProps } from '../types';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';

interface RecordScreenProps extends NavigationProps {}

const { width, height } = Dimensions.get('window');

const FILTERS = [
  { id: null, name: 'None', icon: '🎬' },
  { id: 'vintage', name: 'Vintage', icon: '📽️' },
  { id: 'dramatic', name: 'Dramatic', icon: '🎭' },
  { id: 'warm', name: 'Warm', icon: '🌅' },
  { id: 'cool', name: 'Cool', icon: '🌊' },
  { id: 'noir', name: 'Noir', icon: '🖤' },
];

const RecordScreen: React.FC<RecordScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const recording = useSelector((state: RootState) => state.recording);
  
  const cameraRef = useRef<CameraView>(null);
  const audioRecordingRef = useRef<Audio.Recording | null>(null);
  const playbackSoundRef = useRef<Audio.Sound | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  
  // Use hooks for permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  
  // Get songId from route params if user is recording a duet/collaboration
  const songId = route?.params?.songId;

  useEffect(() => {
    requestPermissions();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording.isRecording) {
      interval = setInterval(() => {
        setRecordingTimer(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTimer(0);
    }
    return () => clearInterval(interval);
  }, [recording.isRecording]);

  const requestPermissions = async () => {
    try {
      const cameraResult = await requestCameraPermission();
      const micResult = await requestMicrophonePermission();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      
      const hasPermission = 
        cameraResult?.granted === true && 
        micResult?.granted === true &&
        mediaLibraryPermission.granted === true;
      
      dispatch(setPermission(hasPermission));
      
      if (!hasPermission) {
        Alert.alert(
          'Permissions Required',
          'Please grant camera, microphone, and media library permissions to record.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      dispatch(setPermission(false));
    }
  };

  const cleanup = async () => {
    try {
      if (audioRecordingRef.current) {
        await audioRecordingRef.current.stopAndUnloadAsync();
        audioRecordingRef.current = null;
      }
      if (playbackSoundRef.current) {
        await playbackSoundRef.current.unloadAsync();
        playbackSoundRef.current = null;
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  const handleStartRecording = async () => {
    if (!recording.hasPermission) {
      await requestPermissions();
      return;
    }

    try {
      if (recording.isVideoEnabled && cameraRef.current) {
        // Video recording with CameraView
        const recordingOptions = {
          maxDuration: 60, // 60 seconds max
        };
        
        await cameraRef.current.recordAsync(recordingOptions);
        dispatch(startRecording());
        
        // Start playback if play-along mode
        if (recording.isPlayingAlong && recording.playbackUri) {
          await startPlaybackForPlayAlong();
        }
      } else {
        // Audio-only recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording_instance = new Audio.Recording();
        await recording_instance.prepareToRecordAsync({
          android: {
            extension: '.m4a',
            outputFormat: 2, // MPEG_4
            audioEncoder: 3, // AAC
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            audioQuality: 127, // iOS_AUDIO_QUALITY_HIGH
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });

        audioRecordingRef.current = recording_instance;
        await recording_instance.startAsync();
        dispatch(startRecording());
        
        // Start playback if play-along mode
        if (recording.isPlayingAlong && recording.playbackUri) {
          await startPlaybackForPlayAlong();
        }
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    try {
      let recordedUri = '';
      
      if (recording.isVideoEnabled && cameraRef.current) {
        // Stop video recording
        cameraRef.current.stopRecording();
      } else if (audioRecordingRef.current) {
        // Stop audio recording
        await audioRecordingRef.current.stopAndUnloadAsync();
        const uri = audioRecordingRef.current.getURI();
        recordedUri = uri || '';
        audioRecordingRef.current = null;
      }

      // Stop playback if playing along
      if (playbackSoundRef.current) {
        await playbackSoundRef.current.stopAsync();
        dispatch(stopPlayAlong());
      }

      dispatch(stopRecording({ uri: recordedUri, duration: recordingTimer }));
      setRecordingTimer(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const startPlaybackForPlayAlong = async () => {
    if (!recording.playbackUri) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: recording.playbackUri },
        { 
          shouldPlay: true,
          volume: recording.volume,
          isLooping: true,
        }
      );
      playbackSoundRef.current = sound;
      dispatch(startPlayAlong());
    } catch (error) {
      console.error('Failed to start playback:', error);
    }
  };

  const handleUpload = async () => {
    if (!recording.recordedUri) return;

    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: recording.recordedUri,
        type: recording.isVideoEnabled ? 'video/mp4' : 'audio/m4a',
        name: `recording_${Date.now()}.${recording.isVideoEnabled ? 'mp4' : 'm4a'}`,
      } as any);

      await dispatch(uploadRecording({
        songId: songId || 'new',
        audioFile: formData,
        description: `${recording.isVideoEnabled ? 'Video' : 'Audio'} recording`,
      })).unwrap();

      Alert.alert('Success', 'Recording uploaded successfully!');
      dispatch(clearRecording());
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to upload recording. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!recording.hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionText}>
            Legato needs camera, microphone, and media library access to record.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera View */}
      {recording.isVideoEnabled ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={recording.cameraType === 'front' ? 'front' : 'back'}
          flash={recording.flashMode === 'on' ? 'on' : recording.flashMode === 'off' ? 'off' : 'auto'}
        >
          {/* Filter overlay */}
          {recording.selectedFilter && (
            <View style={[styles.filterOverlay, getFilterStyle(recording.selectedFilter)]} />
          )}
        </CameraView>
      ) : (
        <View style={styles.audioContainer}>
          <View style={styles.audioVisualization}>
            <Text style={styles.audioTitle}>Audio Recording</Text>
            <View style={styles.waveform}>
              {[...Array(20)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    recording.isRecording && {
                      height: Math.random() * 60 + 10,
                      backgroundColor: '#FF6B6B',
                    }
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Header Controls */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.timer}>{formatTime(recordingTimer)}</Text>
          {songId && <Text style={styles.duetLabel}>Duet Mode</Text>}
        </View>
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
          <Text style={styles.headerButton}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Side Controls */}
      <View style={styles.sideControls}>
        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => dispatch(toggleVideoEnabled())}
        >
          <Text style={styles.sideButtonText}>
            {recording.isVideoEnabled ? '📹' : '🎙️'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => dispatch(toggleCameraType())}
        >
          <Text style={styles.sideButtonText}>🔄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.sideButtonText}>✨</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => setShowEffects(!showEffects)}
        >
          <Text style={styles.sideButtonText}>🎵</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => dispatch(setFlashMode(
            recording.flashMode === 'off' ? 'on' : 
            recording.flashMode === 'on' ? 'auto' : 'off'
          ))}
        >
          <Text style={styles.sideButtonText}>
            {recording.flashMode === 'off' ? '🔦' : 
             recording.flashMode === 'on' ? '💡' : '⚡'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {recording.recordedUri ? (
          <View style={styles.recordedControls}>
            <TouchableOpacity
              style={styles.discardButton}
              onPress={() => dispatch(clearRecording())}
            >
              <Text style={styles.discardButtonText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUpload}
              disabled={recording.isUploading}
            >
              <Text style={styles.uploadButtonText}>
                {recording.isUploading ? 'Uploading...' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.recordButton,
              recording.isRecording && styles.recordButtonActive
            ]}
            onPress={recording.isRecording ? handleStopRecording : handleStartRecording}
          >
            <View style={[
              styles.recordButtonInner,
              recording.isRecording && styles.recordButtonInnerActive
            ]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  recording.selectedFilter === filter.id && styles.filterButtonActive
                ]}
                onPress={() => dispatch(setFilter(filter.id))}
              >
                <Text style={styles.filterIcon}>{filter.icon}</Text>
                <Text style={styles.filterName}>{filter.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Effects Panel */}
      {showEffects && (
        <View style={styles.effectsPanel}>
          <Text style={styles.effectsTitle}>Audio Effects</Text>
          
          <View style={styles.effectRow}>
            <Text style={styles.effectLabel}>Volume</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={recording.volume}
              onValueChange={(value) => dispatch(setVolume(value))}
              minimumTrackTintColor="#FF6B6B"
              maximumTrackTintColor="#666"
            />
          </View>

          <View style={styles.effectRow}>
            <Text style={styles.effectLabel}>Pitch</Text>
            <Slider
              style={styles.slider}
              minimumValue={-12}
              maximumValue={12}
              value={recording.effects.pitch}
              step={1}
              onValueChange={(value) => dispatch(updateEffects({ pitch: value }))}
              minimumTrackTintColor="#FF6B6B"
              maximumTrackTintColor="#666"
            />
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.effectToggle,
                recording.effects.reverb && styles.effectToggleActive
              ]}
              onPress={() => dispatch(updateEffects({ reverb: !recording.effects.reverb }))}
            >
              <Text style={styles.effectToggleText}>Reverb</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.effectToggle,
                recording.effects.echo && styles.effectToggleActive
              ]}
              onPress={() => dispatch(updateEffects({ echo: !recording.effects.echo }))}
            >
              <Text style={styles.effectToggleText}>Echo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <Text style={styles.settingsTitle}>Recording Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Quality</Text>
            <View style={styles.qualityButtons}>
              {['low', 'medium', 'high'].map((quality) => (
                <TouchableOpacity
                  key={quality}
                  style={[
                    styles.qualityButton,
                    recording.recordingQuality === quality && styles.qualityButtonActive
                  ]}
                  onPress={() => dispatch(setRecordingQuality(quality as any))}
                >
                  <Text style={[
                    styles.qualityButtonText,
                    recording.recordingQuality === quality && styles.qualityButtonTextActive
                  ]}>
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => dispatch(resetSettings())}
          >
            <Text style={styles.resetButtonText}>Reset All Settings</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const getFilterStyle = (filter: string) => {
  switch (filter) {
    case 'vintage':
      return { backgroundColor: 'rgba(255, 204, 102, 0.3)' };
    case 'dramatic':
      return { backgroundColor: 'rgba(139, 69, 19, 0.3)' };
    case 'warm':
      return { backgroundColor: 'rgba(255, 140, 0, 0.2)' };
    case 'cool':
      return { backgroundColor: 'rgba(0, 191, 255, 0.2)' };
    case 'noir':
      return { backgroundColor: 'rgba(0, 0, 0, 0.4)' };
    default:
      return {};
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  audioVisualization: {
    alignItems: 'center',
  },
  audioTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
  },
  waveBar: {
    width: 4,
    height: 20,
    backgroundColor: '#333',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerButton: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerCenter: {
    alignItems: 'center',
  },
  timer: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  duetLabel: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 2,
  },
  sideControls: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -150 }],
  },
  sideButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  sideButtonText: {
    fontSize: 20,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  recordButtonInnerActive: {
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
  },
  recordedControls: {
    flexDirection: 'row',
    gap: 20,
  },
  discardButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  discardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filtersPanel: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 10,
  },
  filterButton: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 10,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
  },
  filterIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  filterName: {
    color: '#fff',
    fontSize: 12,
  },
  effectsPanel: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
  },
  effectsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  effectRow: {
    marginBottom: 20,
  },
  effectLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  effectToggle: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  effectToggleActive: {
    backgroundColor: '#FF6B6B',
  },
  effectToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsPanel: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 20,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  qualityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  qualityButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  qualityButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  qualityButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  qualityButtonTextActive: {
    fontWeight: 'bold',
  },
  resetButton: {
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default RecordScreen; 