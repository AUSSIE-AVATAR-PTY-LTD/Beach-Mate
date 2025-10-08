import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
      } else {
        setEmail(data.user?.email ?? null);

      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Page 👤</Text>
      {email && <Text style={styles.email}>{email}</Text>}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={async () => {
          await supabase.auth.signOut();
          Alert.alert("Logged out");
          router.push("/auth/login");
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 22, color: "#023e8a" },
  email: { marginTop: 10, color: "#555" },
  logoutBtn: {
    marginTop: 20,
    backgroundColor: "#0077b6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
});
