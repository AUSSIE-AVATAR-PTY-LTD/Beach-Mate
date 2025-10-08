import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Video, ResizeMode, AVPlaybackStatusSuccess } from "expo-av";
import { Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

type VideoData = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  user_id: string;
  created_at: string;
};

export default function VideoPlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId?: string | string[] }>();
  const router = useRouter();

  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const resolvedId = Array.isArray(videoId) ? videoId[0] : videoId;
        if (!resolvedId) return;

        const { data, error } = await supabase
          .from("videos")
          .select("*")
          .eq("id", resolvedId)
          .single();
        if (error) throw error;
        setVideoData(data);
      } catch (err) {
        console.error("Fetch video error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [videoId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: "#fff" }}>Loading video...</Text>
      </View>
    );
  }

  if (!videoData) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Video not found 😕</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoData.video_url }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        onPlaybackStatusUpdate={(status) => {
          if ((status as AVPlaybackStatusSuccess).isLoaded) {
            const s = status as AVPlaybackStatusSuccess;
            setIsPlaying(s.isPlaying);
          }
        }}
      />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Feather name="arrow-left" size={26} color="#fff" />
      </TouchableOpacity>

      <View style={styles.captionContainer}>
        <Text style={styles.captionText}>
          {videoData.caption || "Surf vibes 🌊"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.playPauseButton}
        onPress={async () => {
          if (videoRef.current) {
            const status = await videoRef.current.getStatusAsync();
            if ((status as AVPlaybackStatusSuccess).isLoaded) {
              const s = status as AVPlaybackStatusSuccess;
              if (s.isPlaying) {
                await videoRef.current.pauseAsync();
                setIsPlaying(false);
              } else {
                await videoRef.current.playAsync();
                setIsPlaying(true);
              }
            }
          }
        }}
      >
        <Feather
          name={isPlaying ? "pause-circle" : "play-circle"}
          size={60}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  video: { width, height },
  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  captionContainer: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
  },
  captionText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    borderRadius: 20,
  },
  playPauseButton: { position: "absolute", bottom: 130, right: 20 },
});
