import * as SecureStore from 'expo-secure-store';

const KEY = 'zhurekai.participant';
export const loadToken = () => SecureStore.getItemAsync(KEY);
export const saveToken = (code: string) => SecureStore.setItemAsync(KEY, code);
