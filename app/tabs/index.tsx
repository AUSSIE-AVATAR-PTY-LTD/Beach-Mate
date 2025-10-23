import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import AppHeader from "../../components/AppHeader";

const { width } = Dimensions.get("window");
const PAGE_SIZE = 10;

type Beach = {
  id: string;
  formal_name: string;
  local_name: string | null;
  latitude: number;
  longitude: number;
  distance?: number;
  weather?: { temp: number; wind: number };
};

export default function HomeScreen() {
  const [beaches, setBeaches] = useState<Beach[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState("Nearby");

  const fetchBeaches = async (reset = false) => {
    try {
      if (reset) {
        setBeaches([]);
        setPage(0);
        setHasMore(true);
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied");
        setLoading(false);
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({});
      const userLat = coords.latitude;
      const userLon = coords.longitude;

      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("beaches")
        .select("*")
        .eq("is_deleted", false)
        .range(from, to);

      if (error) throw error;
      if (!data || data.length === 0) {
        setHasMore(false);
        return;
      }

      // Calculate distances + weather
      const updated = await Promise.all(
        data.map(async (b) => {
          const R = 6371;
          const dLat = ((b.latitude - userLat) * Math.PI) / 180;
          const dLon = ((b.longitude - userLon) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((userLat * Math.PI) / 180) *
              Math.cos((b.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;

          try {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${b.latitude}&longitude=${b.longitude}&current=temperature_2m,wind_speed_10m`
            );
            const json = await res.json();
            const temp = json.current?.temperature_2m ?? null;
            const wind = json.current?.wind_speed_10m ?? null;
            return { ...b, distance, weather: { temp, wind } };
          } catch {
            return { ...b, distance };
          }
        })
      );

      setBeaches((prev) =>
        [...prev, ...updated].sort(
          (a, b) => (a.distance ?? 0) - (b.distance ?? 0)
        )
      );

      if (data.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error("Error fetching beaches:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchBeaches(true);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setPage((prev) => prev + 1);
      fetchBeaches();
    }
  };

  return (
    <View style={styles.container}>
      {/* 🌊 Header always visible */}
      <AppHeader subtitle="Find your perfect wave" />

      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#999" />
        <TextInput placeholder="Search beaches..." style={styles.searchInput} />
        <Feather name="sliders" size={20} color="#0077b6" />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {["Popular", "Nearby", "Latest"].map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setSelectedFilter(tab)}
            style={[
              styles.filterButton,
              selectedFilter === tab && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === tab && styles.filterTextActive,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 🏖️ Beaches Section */}
      <View style={styles.beachesSection}>
        {loading && beaches.length === 0 ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color="#0077b6" />
            <Text style={styles.loadingText}>Loading nearby beaches...</Text>
          </View>
        ) : beaches.length === 0 ? (
          <View style={styles.centeredLoader}>
            <Feather name="alert-circle" size={28} color="#999" />
            <Text style={styles.loadingText}>No beaches found nearby.</Text>
          </View>
        ) : (
          <FlatList
            data={beaches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Link key={item.id} href={`/beach/${item.id}`} asChild>
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                >
                  <ImageBackground
                    source={{
                      uri:
                        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
                    }}
                    style={styles.card}
                    imageStyle={{ borderRadius: 20 }}
                  >
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.6)"]}
                      style={styles.gradient}
                    />

                    {/* Weather Badge */}
                    <View style={styles.weatherBadge}>
                      <Feather name="thermometer" size={14} color="#fff" />
                      <Text style={styles.weatherText}>
                        {item.weather?.temp?.toFixed(1)}°C
                      </Text>
                      <Feather
                        name="wind"
                        size={14}
                        color="#fff"
                        style={{ marginLeft: 6 }}
                      />
                      <Text style={styles.weatherText}>
                        {item.weather?.wind?.toFixed(1)} m/s
                      </Text>
                    </View>

                    {/* Info Text */}
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{item.formal_name}</Text>
                      {item.local_name && (
                        <Text style={styles.cardSubtitle}>
                          Also known as {item.local_name}
                        </Text>
                      )}
                      <View style={styles.cardFooter}>
                        <Feather name="map-pin" size={14} color="#fff" />
                        <Text style={styles.cardDistance}>
                          {item.distance?.toFixed(1)} km away
                        </Text>
                      </View>
                    </View>
                  </ImageBackground>
                </Pressable>
              </Link>
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  size="small"
                  color="#0077b6"
                  style={{ margin: 20 }}
                />
              ) : null
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fbfd", paddingHorizontal: 20 },
  searchContainer: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  searchInput: { flex: 1, marginHorizontal: 8, fontSize: 16, color: "#333" },
  filterTabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 25,
  },
  filterButton: {
    backgroundColor: "#e6f2ff",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  filterButtonActive: { backgroundColor: "#0077b6" },
  filterText: { color: "#0077b6", fontWeight: "500" },
  filterTextActive: { color: "#fff" },
  beachesSection: { flex: 1, marginTop: 15 },
  centeredLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  loadingText: { color: "#555", marginTop: 10 },
  card: {
    width: width - 40,
    height: 230,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  gradient: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  cardText: { padding: 16 },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cardSubtitle: { color: "#ddd", fontSize: 14, marginTop: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  cardDistance: { color: "#fff", marginLeft: 6, fontSize: 13 },
  weatherBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  weatherText: { color: "#fff", fontSize: 12, marginLeft: 3 },
});
