import React from "react";
import { Stack } from "expo-router";

export default function BeachLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card", // iOS-style slide transition
        animation: "slide_from_right",
        gestureEnabled: true,
        contentStyle: {
          backgroundColor: "#f9fbfd", // ✅ Replaced cardStyle with contentStyle
        },
      }}
    />
  );
}
