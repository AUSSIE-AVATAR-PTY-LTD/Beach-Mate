import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 25,
          backgroundColor: "#ffffff",
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
          paddingBottom: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Feather name="home" size={26} color={focused ? "#0077b6" : "#888"} />
          ),
        }}
      />
      <Tabs.Screen
        name="recents"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Feather name="clock" size={26} color={focused ? "#0077b6" : "#888"} />
          ),
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Feather name="heart" size={26} color={focused ? "#0077b6" : "#888"} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Feather name="user" size={26} color={focused ? "#0077b6" : "#888"} />
          ),
        }}
      />
    </Tabs>
  );
}
