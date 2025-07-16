import React from 'react';
import { Provider } from 'react-redux';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store';

// Import screens (we'll create these next)
import HomeScreen from './src/screens/HomeScreen';
import ChartsScreen from './src/screens/ChartsScreen';
import RecordScreen from './src/screens/RecordScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import SongDetailScreen from './src/screens/SongDetailScreen';
import CollaborationsScreen from './src/screens/CollaborationsScreen';

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  SongDetail: { songId: string };
  Record: { songId?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Charts: undefined;
  Record: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'For You',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text>,
        }}
      />
      <Tab.Screen 
        name="Charts" 
        component={ChartsScreen}
        options={{
          title: 'Charts',
          tabBarIcon: ({ color }) => <Text style={{ color }}>📊</Text>,
        }}
      />
      <Tab.Screen 
        name="Record" 
        component={RecordScreen}
        options={{
          title: 'Record',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🎤</Text>,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#000" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#000' },
            }}
          >
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen 
              name="SongDetail" 
              component={SongDetailScreen}
              options={{ headerShown: true, title: 'Song Details' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
