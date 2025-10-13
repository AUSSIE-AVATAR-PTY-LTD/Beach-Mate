import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../../lib/supabase";
import { decode } from "base64-arraybuffer";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AppHeader from "../../componenets/AppHeader";


export default function UploadVideo() {
  const router = useRouter();
  const { beachId } = useLocalSearchParams<{ beachId?: string }>();

  const [beachName, setBeachName] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [stage, setStage] = useState<"pick" | "preview" | "upload">("pick");
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const userName = user?.user_metadata?.full_name || "Guest";
  const userAvatar =
    user?.user_metadata?.avatar_url || "https://randomuser.me/api/portraits/men/1.jpg";

  // 🔐 Check user session
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoadingUser(false);
    };
    fetchUser();
  }, []);

  // Fetch beach name
  useEffect(() => {
    const fetchBeach = async () => {
      if (!beachId) return;
      const { data, error } = await supabase
        .from("beaches")
        .select("formal_name")
        .eq("id", beachId)
        .single();
      if (error) console.error("Beach fetch error:", error);
      else setBeachName(data?.formal_name);
    };
    fetchBeach();
  }, [beachId]);

  // 🧩 Ensure folder exists (or create placeholder file)
  const ensureFolder = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from("videos").list(path);
      if (error && error.message !== "Not Found") throw error;

      if (!data || data.length === 0) {
        await supabase.storage
          .from("videos")
          .upload(`${path}/.keep`, new Uint8Array(), {
            contentType: "text/plain",
          });
      }
    } catch (err) {
      console.warn("ensureFolder error:", err);
    }
  };

  // 🎥 Pick a video
  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
      });
      if (result.canceled) return;

      const selectedUri = result.assets[0].uri;
      setVideoUri(selectedUri);

      const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(selectedUri, {
        time: 1000,
      });
      setThumbUri(thumb);
      setStage("preview");
    } catch (error) {
      console.error("Pick video error:", error);
      Alert.alert("Error", "Failed to pick video");
    }
  };

  // 📸 Record video
  const recordVideo = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera permission is needed to record videos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality,
        quality: 0.7,
      });

      if (result.canceled) return;

      const recordedUri = result.assets[0].uri;
      setVideoUri(recordedUri);

      const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(recordedUri, {
        time: 1000,
      });
      setThumbUri(thumb);
      setStage("preview");
    } catch (error) {
      console.error("Record video error:", error);
      Alert.alert("Error", "Failed to record video");
    }
  };

  // ☁️ Upload
  const uploadVideo = async () => {
    try {
      if (!videoUri || !user) return;
      setUploading(true);
      setProgress(10);

      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      const sizeMB = (fileInfo as any).size
        ? (fileInfo as any).size / (1024 * 1024)
        : 0;

      if (sizeMB > 50) {
        Alert.alert("Too Large", "Please choose a video smaller than 50MB.");
        setUploading(false);
        return;
      }

      const userId = user.id;
      const videoId = Math.random().toString(36).substring(2, 10);

      await ensureFolder(beachId as string);
      await ensureFolder(`${beachId}/${userId}`);
      setProgress(25);

      const videoBase64 = await FileSystem.readAsStringAsync(videoUri, {
        encoding: "base64",
      });
      const thumbBase64 = thumbUri
        ? await FileSystem.readAsStringAsync(thumbUri, { encoding: "base64" })
        : "";

      const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
        const binary = global.atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
      };

      const videoBuffer = decode(videoBase64);
      const thumbBuffer = thumbBase64 ? base64ToArrayBuffer(thumbBase64) : new ArrayBuffer(0);

      setProgress(50);

      const videoPath = `${beachId}/${userId}/${videoId}.mp4`;
      const thumbPath = `${beachId}/${userId}/${videoId}_thumb.jpg`;

      const { error: videoError } = await supabase.storage
        .from("videos")
        .upload(videoPath, videoBuffer, { contentType: "video/mp4" });
      if (videoError) throw videoError;
      setProgress(75);

      if (thumbUri) {
        const { error: thumbError } = await supabase.storage
          .from("videos")
          .upload(thumbPath, thumbBuffer, { contentType: "image/jpeg" });
        if (thumbError) throw thumbError;
      }

      const { data: videoPublic } = supabase.storage
        .from("videos")
        .getPublicUrl(videoPath);
      const { data: thumbPublic } = supabase.storage
        .from("videos")
        .getPublicUrl(thumbPath);

      const { error: dbError } = await supabase.from("videos").insert({
        beach_id: beachId,
        user_id: userId,
        video_url: videoPublic.publicUrl,
        thumbnail_url: thumbPublic.publicUrl,
        caption,
        duration_seconds: 20,
        size_mb: sizeMB.toFixed(2),
        mime_type: "video/mp4",
        approved: true,
      });
      if (dbError) throw dbError;

      setProgress(100);
      Alert.alert("✅ Success", "Your video has been uploaded!");
      setCaption("");
      setStage("pick");
      router.back();
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload failed", error.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  // Loading state while checking auth
  if (loadingUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0077b6" />
      </View>
    );
  }

  // 🚫 Not logged in
  if (!user) {
    return (
      <View style={styles.center}>
        <Feather name="lock" size={64} color="#0077b6" />
        <Text style={styles.lockText}>You must be logged in to upload videos.</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.loginText}>Login to Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {userName} 👋</Text>
          <Text style={styles.subtext}>Share your latest surf session</Text>
        </View>
        <Image source={{ uri: userAvatar }} style={styles.avatar} />
      </View>

      {/* Beach Info */}
      <View style={styles.beachInfo}>
        <Feather name="map-pin" size={18} color="#0077b6" />
        <Text style={styles.beachName}>
          {beachName ? `Uploading to: ${beachName}` : "Loading beach..."}
        </Text>
      </View>

      {/* Pick / Record Options */}
      {stage === "pick" && (
        <View style={styles.pickSection}>
          <TouchableOpacity style={styles.optionButton} onPress={pickVideo}>
            <Feather name="folder" size={28} color="#0077b6" />
            <Text style={styles.optionText}>Pick from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={recordVideo}>
            <Feather name="camera" size={28} color="#0077b6" />
            <Text style={styles.optionText}>Record a Video</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Preview + Caption */}
      {stage === "preview" && (
        <View style={styles.previewSection}>
          {thumbUri && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: thumbUri }} style={styles.thumbnail} />
              <Text style={styles.previewText}>Preview</Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Add a caption..."
            placeholderTextColor="#aaa"
            value={caption}
            onChangeText={setCaption}
            multiline
          />
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={uploadVideo}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Upload Progress */}
      {uploading && (
        <View style={styles.progressBox}>
          <ActivityIndicator size="large" color="#0077b6" />
          <Text style={styles.progressText}>
            Uploading... {progress.toFixed(0)}%
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fbfd", paddingHorizontal: 20 },
  header: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 24, fontWeight: "bold", color: "#023e8a" },
  subtext: { color: "#666", marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  beachInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  beachName: { marginLeft: 8, color: "#023e8a", fontWeight: "600" },
  pickSection: {
    marginTop: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  optionButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 25,
    paddingHorizontal: 50,
    marginVertical: 10,
    alignItems: "center",
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  optionText: { color: "#0077b6", marginTop: 10, fontSize: 16 },
  previewSection: { marginTop: 30 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    color: "#333",
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: "#0077b6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  uploadButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  previewContainer: { alignItems: "center", marginBottom: 20 },
  thumbnail: {
    width: 240,
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  previewText: { color: "#555" },
  progressBox: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  progressText: { color: "#0077b6", fontSize: 16, marginTop: 8 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fbfd",
    padding: 20,
  },
  lockText: { color: "#023e8a", fontSize: 18, textAlign: "center", marginTop: 10 },
  loginButton: {
    marginTop: 20,
    backgroundColor: "#0077b6",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  loginText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
