import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../constants/config';

const {TOKEN_STORAGE_KEY, USER_DATA_KEY, TOKEN_REFRESH_THRESHOLD_MS} = config;

const TokenManager = {
  async setToken(token, expiresInSeconds = 86400, refreshToken) {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload = {
      token,
      expiresAt,
      refreshToken: refreshToken || null,
    };

    try {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('TokenManager.setToken failed', error);
    }
  },

  async getTokenData() {
    try {
      const raw = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('TokenManager.getTokenData failed', error);
      return null;
    }
  },

  async getToken() {
    const tokenData = await this.getTokenData();
    if (!tokenData) {
      return null;
    }

    if (Date.now() >= tokenData.expiresAt) {
      await this.clearToken();
      return null;
    }

    return tokenData.token;
  },

  async isTokenExpired() {
    const tokenData = await this.getTokenData();
    if (!tokenData) {
      return true;
    }
    return Date.now() >= tokenData.expiresAt;
  },

  async shouldRefreshToken() {
    const tokenData = await this.getTokenData();
    if (!tokenData) {
      return false;
    }
    return Date.now() >= tokenData.expiresAt - TOKEN_REFRESH_THRESHOLD_MS;
  },

  async getRefreshToken() {
    const tokenData = await this.getTokenData();
    return tokenData?.refreshToken || null;
  },

  async setUserData(userData) {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('TokenManager.setUserData failed', error);
    }
  },

  async getUserData() {
    try {
      const raw = await AsyncStorage.getItem(USER_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('TokenManager.getUserData failed', error);
      return null;
    }
  },

  async clearToken() {
    try {
      await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_DATA_KEY]);
    } catch (error) {
      console.error('TokenManager.clearToken failed', error);
    }
  },
};

export default TokenManager;

