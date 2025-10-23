import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { showToast } from "../../utils/showToast";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return showToast("Enter your email and password", "error");

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const user = data?.user;
      if (user) {
        // Sync user record if missing
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingUser) {
          const meta = user.user_metadata || {};
          await supabase.from("users").insert({
            id: user.id,
            full_name: meta.full_name ?? null,
            phone: meta.phone ?? null,
            email: user.email,
            avatar_url: meta.avatar_url ?? null,
          });
        }
      }

      showToast("✅ Welcome back!", "success");
      router.replace("/tabs");
    } catch (err: any) {
      showToast(err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome Back 👋</Text>

      <TextInput
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      {/* Password with eye toggle */}
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          secureTextEntry={!showPassword}
          style={[styles.input, { flex: 1, borderWidth: 0 }]}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#0077b6" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>
        Don’t have an account?{" "}
        <Link href="/auth/register" style={styles.link}>
          Sign Up
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fbfd", justifyContent: "center", padding: 25 },
  header: { fontSize: 24, fontWeight: "700", color: "#023e8a", marginBottom: 30, textAlign: "center" },
  input: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#ddd" },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingRight: 10,
  },
  button: {
    backgroundColor: "#0077b6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  footer: { textAlign: "center", marginTop: 20, color: "#333" },
  link: { color: "#0077b6", fontWeight: "600" },
});
