import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet
} from 'react-native';

export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SmartFit</Text>
      <Text style={styles.subtitle}>Your personalized workout planner</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.outline} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.outlineText}>I already have an account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', color: '#4F46E5', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 48 },
  button: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outline: { padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#4F46E5' },
  outlineText: { color: '#4F46E5', fontSize: 16, fontWeight: '600' },
});