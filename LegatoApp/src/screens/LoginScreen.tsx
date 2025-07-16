import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { loginUser, registerUser } from '../store/slices/authSlice';
import { NavigationProps } from '../types';

interface LoginScreenProps extends NavigationProps {}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !username)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      console.log('Attempting:', isLogin ? 'login' : 'registration');
      if (isLogin) {
        await dispatch(loginUser({ email, password })).unwrap();
      } else {
        await dispatch(registerUser({ username, email, password })).unwrap();
      }
      console.log('Success! Navigating to Main');
      navigation.navigate('Main');
    } catch (error) {
      console.error('Auth error:', error);
      
      // Show specific error messages with helpful suggestions
      let errorMessage = error as string;
      let title = 'Error';
      
      if (errorMessage.includes('Username or email already exists')) {
        title = 'Account Already Exists';
        errorMessage = 'This username or email is already registered. Please try a different username/email or login instead.';
      } else if (errorMessage.includes('Invalid credentials')) {
        title = 'Invalid Credentials';
        errorMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.';
      } else if (errorMessage.includes('required')) {
        title = 'Missing Information';
        errorMessage = 'Please make sure all required fields are filled out correctly.';
      }
      
      Alert.alert(title, errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Legato</Text>
        <Text style={styles.subtitle}>Music collaboration platform</Text>
      </View>
      
      <View style={styles.form}>
        <Text style={styles.formTitle}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Text>
        
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Username (3-20 characters)"
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchButtonText}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    color: '#FF6B6B',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  formTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
});

export default LoginScreen; 