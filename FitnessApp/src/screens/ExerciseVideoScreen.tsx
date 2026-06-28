import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ExerciseVideoScreen({ route, navigation }: any) {
  const { exerciseName } = route.params;
  const searchQuery = encodeURIComponent(`${exerciseName} exercise tutorial`);
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{exerciseName}</Text>
      </View>
      <WebView
        source={{ uri: youtubeSearchUrl }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  back: { color: '#4F46E5', fontSize: 16, marginRight: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: '600' },
  webview: { flex: 1 },
});