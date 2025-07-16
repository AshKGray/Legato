import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchTrending } from '../store/slices/songsSlice';
import { NavigationProps } from '../types';

interface HomeScreenProps extends NavigationProps {}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { trending, isLoading } = useSelector((state: RootState) => state.songs);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchTrending(20));
    }
  }, [dispatch, isAuthenticated]);

  const renderSongItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => navigation.navigate('SongDetail', { songId: item.songId })}
    >
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{item.song?.title || 'Unknown Song'}</Text>
        <Text style={styles.username}>@{item.user?.username || 'Unknown User'}</Text>
        <Text style={styles.description}>{item.description || ''}</Text>
      </View>
      <View style={styles.engagementInfo}>
        <Text style={styles.likes}>❤️ {item.likes}</Text>
        <Text style={styles.comments}>💬 {item.comments}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.title}>Welcome to Legato</Text>
          <Text style={styles.subtitle}>Discover and create music collaborations</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>For You</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('Record')}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading trending songs...</Text>
        </View>
      ) : (
        <FlatList
          data={trending}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={() => dispatch(fetchTrending(20))}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  songItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 4,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
  },
  engagementInfo: {
    alignItems: 'flex-end',
  },
  likes: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  comments: {
    color: '#fff',
    fontSize: 14,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
  },
});

export default HomeScreen; 