import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../../lib/supabase";
import { decode } from "base64-arraybuffer";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function UploadVideo() {
  const router = useRouter();
  const { beachId } = useLocalSearchParams<{ beachId?: string }>();
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

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

  const uploadVideo = async () => {
  try {
    setUploading(true);

    // 🎥 Pick a video
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) {
      setUploading(false);
      return;
    }

    const videoUri = result.assets[0].uri;

    // 🎞️ Generate a thumbnail
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000,
    });

    // 📏 Get file info
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    const sizeMB = (fileInfo as any).size ? (fileInfo as any).size / (1024 * 1024) : 0;

    if (sizeMB > 50) {
      Alert.alert("Too Large", "Please choose a video smaller than 50MB.");
      setUploading(false);
      return;
    }

    // 👤 Current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("You must be logged in to upload.");

    const userId = user.id;
    const videoId = Math.random().toString(36).substring(2, 10);

    // 📁 Ensure folders exist
    await ensureFolder(beachId as string);
    await ensureFolder(`${beachId}/${userId}`);

    // 🧠 Read and convert files
    const videoBase64 = await FileSystem.readAsStringAsync(videoUri, { encoding: "base64" });
    const thumbBase64 = await FileSystem.readAsStringAsync(thumbUri, { encoding: "base64" });

    // ✅ Convert safely to ArrayBuffer
    const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = global.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
    };

    const videoBuffer = decode(videoBase64);

    const thumbBuffer = base64ToArrayBuffer(thumbBase64);


    // 🗂️ Paths
    const videoPath = `${beachId}/${userId}/${videoId}.mp4`;
    const thumbPath = `${beachId}/${userId}/${videoId}_thumb.jpg`;

    // ☁️ Upload video
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(videoPath, videoBuffer, {
        contentType: "video/mp4",
      });
    if (uploadError) throw uploadError;

    // ☁️ Upload thumbnail
    const { error: thumbError } = await supabase.storage
      .from("videos")
      .upload(thumbPath, thumbBuffer, {
        contentType: "image/jpeg",
      });
    if (thumbError) throw thumbError;

    // 🌍 Public URLs
    const { data: videoPublic } = supabase.storage.from("videos").getPublicUrl(videoPath);
    const { data: thumbPublic } = supabase.storage.from("videos").getPublicUrl(thumbPath);

    // 🗄️ Insert into DB
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

    Alert.alert("✅ Success", "Your video has been uploaded!");
    setCaption("");
  } catch (error: any) {
    console.error("Upload error:", error);
    Alert.alert("Upload failed", error.message || "Something went wrong");
  } finally {
    setUploading(false);
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎥 Upload Surf Video</Text>

      <TextInput
        style={styles.input}
        placeholder="Write a caption..."
        placeholderTextColor="#aaa"
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      <TouchableOpacity
        style={[styles.button, uploading && { opacity: 0.6 }]}
        onPress={uploadVideo}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Upload Video</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fbfd", padding: 20, paddingTop: 60 },
  header: { fontSize: 22, fontWeight: "bold", color: "#023e8a", marginBottom: 20 },
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
  button: {
    backgroundColor: "#0077b6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
