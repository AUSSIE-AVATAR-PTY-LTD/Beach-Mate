import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Font from "expo-font";
import AppHeader from "../../components/AppHeader";

const { width } = Dimensions.get("window");

type Beach = {
  id: string;
  formal_name: string;
  local_name: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
};

type Weather = {
  temp: number;
  wind_speed: number;
  weather_code: number;
};

type Video = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  user_id: string;
  created_at: string;
  users?: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
};

export default function BeachDetails() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();

  const [beach, setBeach] = useState<Beach | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync(Feather.font);
        const beachId = Array.isArray(id) ? id[0] : id;
        if (!beachId) return;

        // 🌊 Load beach info
        const { data: beachData, error: beachError } = await supabase
          .from("beaches")
          .select("*")
          .eq("id", beachId)
          .single();
        if (beachError) throw beachError;
        setBeach(beachData);

        // 🌦️ Fetch weather
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${beachData.latitude}&longitude=${beachData.longitude}&current=temperature_2m,wind_speed_10m,weather_code`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.current) {
          setWeather({
            temp: json.current.temperature_2m,
            wind_speed: json.current.wind_speed_10m,
            weather_code: json.current.weather_code,
          });
        }

        // 🎥 Fetch videos with uploader info
        const beachUUID = Array.isArray(id) ? id[0].trim() : (id ?? "").trim();
        const { data: videoData, error: videoError } = await supabase
          .from("videos")
          .select("*, users(full_name, email, avatar_url)")
          .eq("beach_id", beachUUID)
          .eq("approved", true)
          .order("created_at", { ascending: false });

        if (videoError) throw videoError;
        setVideos(videoData || []);
      } catch (err) {
        console.error("Beach page error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const getWeatherDescription = (code: number) => {
    const map: Record<number, string> = {
      0: "Clear Sky ☀️",
      1: "Mainly Clear 🌤️",
      2: "Partly Cloudy ⛅",
      3: "Overcast ☁️",
      45: "Fog 🌫️",
      61: "Light Rain 🌦️",
      63: "Rain 🌧️",
      65: "Heavy Rain ⛈️",
      80: "Rain Showers 🌧️",
      95: "Thunderstorm ⛈️",
    };
    return map[code] || "Unknown";
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0077b6" />
        <Text style={styles.text}>Loading beach details...</Text>
      </View>
    );
  }

  if (!beach) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Beach not found 😕</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🌊 Dynamic Header */}
      <AppHeader subtitle="Explore surf conditions & videos" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 🏖️ Hero */}
        <ImageBackground
          source={{
            uri:
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
          }}
          style={styles.heroImage}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.gradient}
          />
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>{beach.formal_name}</Text>
            {beach.local_name && (
              <Text style={styles.heroSubtitle}>{beach.local_name}</Text>
            )}
            <Text style={styles.heroAddress}>📍 {beach.address}</Text>
          </View>
        </ImageBackground>

        {/* 🌦️ Weather */}
        {weather && (
          <View style={styles.weatherCard}>
            <Text style={styles.sectionTitle}>Live Conditions</Text>
            <View style={styles.weatherRow}>
              <View style={styles.weatherBox}>
                <Feather name="thermometer" size={24} color="#0077b6" />
                <Text style={styles.weatherLabel}>
                  {weather.temp.toFixed(1)}°C
                </Text>
              </View>
              <View style={styles.weatherBox}>
                <Feather name="wind" size={24} color="#0077b6" />
                <Text style={styles.weatherLabel}>
                  {weather.wind_speed.toFixed(1)} m/s
                </Text>
              </View>
              <View style={styles.weatherBox}>
                <Feather name="cloud" size={24} color="#0077b6" />
                <Text style={styles.weatherLabel}>
                  {getWeatherDescription(weather.weather_code)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 🎥 Videos */}
        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>Surf Videos</Text>

          {videos.length === 0 ? (
            <View style={styles.videoPlaceholder}>
              <Feather name="video-off" size={32} color="#aaa" />
              <Text style={styles.placeholderText}>
                No videos yet — be the first!
              </Text>
            </View>
          ) : (
            videos.map((v) => {
              const uploaderName =
                v.users?.full_name || v.users?.email || "Unknown user";

              return (
                <TouchableOpacity
                  key={v.id}
                  style={styles.videoCard}
                  onPress={() => router.push(`/beach/video/${v.id}`)}
                >
                  <Image
                    source={{
                      uri: v.thumbnail_url || "https://via.placeholder.com/400",
                    }}
                    style={styles.thumbnail}
                  />

                  <View style={styles.videoInfo}>
                    <Text style={styles.caption}>
                      {v.caption || "Surf vibes 🌊"}
                    </Text>

                    {/* Uploader Row */}
                    <View style={styles.metaRow}>
                      {v.users?.avatar_url ? (
                        <Image
                          source={{ uri: v.users.avatar_url }}
                          style={styles.avatarSmall}
                        />
                      ) : (
                        <Feather name="user" size={14} color="#0077b6" />
                      )}
                      <Text style={styles.metaText}>
                        Uploaded by {uploaderName}
                      </Text>
                    </View>

                    {/* Time Row */}
                    <View style={styles.metaRow}>
                      <Feather name="clock" size={14} color="#0077b6" />
                      <Text style={styles.metaText}>
                        {formatDate(v.created_at)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 📤 Upload Button */}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() =>
          router.push(`/beach/upload?beachId=${Array.isArray(id) ? id[0] : id}`)
        }
      >
        <Feather name="upload" size={24} color="#fff" />
        <Text style={styles.uploadText}>Upload Video</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fbfd", paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { marginTop: 10, color: "#555" },
  error: { color: "red", fontSize: 16, textAlign: "center", marginTop: 20 },
  heroImage: {
    width: width - 40,
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 20,
    alignSelf: "center",
    justifyContent: "flex-end",
  },
  gradient: { ...StyleSheet.absoluteFillObject },
  heroTextContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "bold" },
  heroSubtitle: { color: "#eee", fontSize: 16, marginTop: 4 },
  heroAddress: { color: "#ddd", fontSize: 14, marginTop: 6 },
  weatherCard: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#023e8a",
    marginBottom: 10,
  },
  weatherRow: { flexDirection: "row", justifyContent: "space-between" },
  weatherBox: { alignItems: "center", flex: 1 },
  weatherLabel: { fontSize: 14, color: "#333", marginTop: 5 },
  videoSection: { marginTop: 30, marginBottom: 40 },
  videoPlaceholder: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  placeholderText: { color: "#999", marginTop: 10, fontSize: 14 },
  videoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  thumbnail: {
    width: "100%",
    height: 220,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  videoInfo: { padding: 12 },
  caption: { color: "#333", fontSize: 15, fontWeight: "500", marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  metaText: { color: "#555", fontSize: 13, marginLeft: 5 },
  avatarSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 5,
  },
  uploadButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0077b6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  uploadText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
});
