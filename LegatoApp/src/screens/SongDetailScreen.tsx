import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationProps } from '../types';

interface SongDetailScreenProps extends NavigationProps {
  route: {
    params: {
      songId: string;
    };
  };
}

const SongDetailScreen: React.FC<SongDetailScreenProps> = ({ navigation, route }) => {
  const { songId } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Song Details</Text>
        <Text style={styles.subtitle}>Song ID: {songId}</Text>
        <Text style={styles.description}>
          This will show song details, versions, comments, and voting interface.
        </Text>
        
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    color: '#FF6B6B',
    fontSize: 16,
    marginBottom: 20,
  },
  description: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SongDetailScreen; 