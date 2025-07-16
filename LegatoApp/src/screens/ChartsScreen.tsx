import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchCharts } from '../store/slices/songsSlice';
import { NavigationProps } from '../types';

interface ChartsScreenProps extends NavigationProps {}

const ChartsScreen: React.FC<ChartsScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { charts, isLoading } = useSelector((state: RootState) => state.songs);
  const [selectedChart, setSelectedChart] = useState<'overall' | 'genre' | 'rising'>('overall');

  useEffect(() => {
    dispatch(fetchCharts({ type: selectedChart, limit: 50 }));
  }, [dispatch, selectedChart]);

  const renderChartItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.chartItem}
      onPress={() => navigation.navigate('SongDetail', { songId: item.song?.id })}
    >
      <View style={styles.position}>
        <Text style={styles.positionText}>{index + 1}</Text>
      </View>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{item.song?.title || 'Unknown Song'}</Text>
        <Text style={styles.username}>@{item.songVersion?.user?.username || 'Unknown User'}</Text>
        <Text style={styles.engagement}>
          ❤️ {item.songVersion?.likes || 0} • 💬 {item.songVersion?.comments || 0}
        </Text>
      </View>
      <View style={styles.changeIndicator}>
        {item.changeFromPrevious > 0 && (
          <Text style={styles.changeUp}>↗️ +{item.changeFromPrevious}</Text>
        )}
        {item.changeFromPrevious < 0 && (
          <Text style={styles.changeDown}>↘️ {item.changeFromPrevious}</Text>
        )}
        {item.changeFromPrevious === 0 && (
          <Text style={styles.changeNone}>—</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Charts</Text>
      </View>
      
      <View style={styles.chartTabs}>
        <TouchableOpacity
          style={[styles.tab, selectedChart === 'overall' && styles.activeTab]}
          onPress={() => setSelectedChart('overall')}
        >
          <Text style={[styles.tabText, selectedChart === 'overall' && styles.activeTabText]}>
            Overall
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedChart === 'genre' && styles.activeTab]}
          onPress={() => setSelectedChart('genre')}
        >
          <Text style={[styles.tabText, selectedChart === 'genre' && styles.activeTabText]}>
            Genre
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedChart === 'rising' && styles.activeTab]}
          onPress={() => setSelectedChart('rising')}
        >
          <Text style={[styles.tabText, selectedChart === 'rising' && styles.activeTabText]}>
            Rising
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading charts...</Text>
        </View>
      ) : (
        <FlatList
          data={charts}
          renderItem={renderChartItem}
          keyExtractor={(item, index) => `${item.song?.id}-${index}`}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={() => dispatch(fetchCharts({ type: selectedChart, limit: 50 }))}
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
  chartTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  activeTab: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    color: '#ccc',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  chartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  position: {
    width: 40,
    alignItems: 'center',
  },
  positionText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  songInfo: {
    flex: 1,
    marginLeft: 16,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 4,
  },
  engagement: {
    color: '#ccc',
    fontSize: 12,
  },
  changeIndicator: {
    alignItems: 'center',
    minWidth: 60,
  },
  changeUp: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  changeDown: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: 'bold',
  },
  changeNone: {
    color: '#ccc',
    fontSize: 12,
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

export default ChartsScreen; 