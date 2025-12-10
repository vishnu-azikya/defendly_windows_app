import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import Logo from '../images/download.png';
import Email from '../images/email.png';
import Lock from '../images/lock.png';
import useAuth from '../hooks/useAuth';

function LoginScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState(null);
  const { login, authLoading, authError } = useAuth();

  const canSubmit = useMemo(() => email.trim() !== '' && password !== '', [email, password]);

  const handleLogin = async () => {
    if (!email.trim()) {
      setLocalError('Please enter your email.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setLocalError(null);
    const success = await login(email.trim(), password);
    if (!success) {
      setLocalError('Invalid email or password.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5' }]}>
      <View style={[styles.card, { backgroundColor: '#ffffff' }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={Logo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Sign in to Defendly</Text>
        <Text style={styles.subtitle}>Access your security dashboard</Text>

        {(localError || authError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{localError || authError}</Text>
          </View>
        )}

        {/* Email Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            {/* <Text style={styles.inputIcon}>✉</Text> */}
            <Image
              source={Email}
              style={styles.inputIcon}
              resizeMode="contain"
            />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#999"
              value={email}
              type='text'
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Password Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            {/* <Text style={styles.inputIcon}>🔒</Text> */}
            <Image
              source={Lock}
              style={styles.inputIcon}
              resizeMode="contain"
            />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#999"
              value={password}
              type='text'
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}>
              <Text style={styles.eyeIconText}>{showPassword ? '👁' : '👁‍🗨'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Remember Me & Forgot Password */}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotPassword}>Forgot your password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.signInButton, (!canSubmit || authLoading) && styles.signInButtonDisabled]}
          onPress={handleLogin}
          disabled={!canSubmit || authLoading}>
          {authLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.signInButtonText}>Sign in</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoImage: {
    width: 32,
    height: 32,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgb(226,232,240)',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logoCircle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgb(226,232,240)',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
    marginBottom: 16,
    flexDirection: 'row',
  },
  shieldIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphIcon: {
    width: 16,
    height: 12,
    backgroundColor: '#00457f',
    borderRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    fontFamily: 'sans-serif',
    fontWeight: '500',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'sans-serif',
    fontWeight: '400',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'sans-serif',
    fontWeight: '400',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    height: 48,
  },
  inputIcon: {
    marginRight: 12,
    width: 20,
    height: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 4,
  },
  eyeIconText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 3,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#00457f',
    borderColor: '#00457f',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'sans-serif',
    fontWeight: '400',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'sans-serif',
    fontWeight: '400',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#00457f',
    fontWeight: '500',
    fontFamily: 'sans-serif',
    fontWeight: '400',
  },
  signInButton: {
    backgroundColor: '#00457f',
    borderRadius: 6,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'sans-serif',
    fontWeight: '400',
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'sans-serif',
    fontWeight: '500',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
});

export default LoginScreen;