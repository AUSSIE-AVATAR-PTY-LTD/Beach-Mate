import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";

export default function AppHeader({
  title = "Welcome",
  subtitle = "",
  showAvatar = true,
}: {
  title?: string;
  subtitle?: string;
  showAvatar?: boolean;
}) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    })();
  }, []);

  const displayName = user?.user_metadata?.full_name || "";
  const avatar =
    user?.user_metadata?.avatar_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.title}>
          {displayName ? `Hi, ${displayName} 👋` : "Welcome 👋"}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {showAvatar && (
        <TouchableOpacity
          onPress={() =>
            user ? router.push("/tabs/profile") : router.push("/auth/login")
          }
        >
          <Image source={{ uri: avatar }} style={styles.avatar} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#023e8a",
  },
  subtitle: {
    color: "#666",
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#eee",
  },
});
