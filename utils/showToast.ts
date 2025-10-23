import Toast from "react-native-root-toast";

export const showToast = (message: string, type: "success" | "error" = "success") => {
  const backgroundColor = type === "success" ? "#0077b6" : "#e63946";

  Toast.show(message, {
    duration: Toast.durations.SHORT,
    position: Toast.positions.BOTTOM - 80,
    shadow: true,
    animation: true,
    hideOnPress: true,
    backgroundColor,
    textColor: "#fff",
    opacity: 0.95,
    containerStyle: {
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
  });
};
