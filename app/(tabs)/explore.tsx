import { Redirect, useLocalSearchParams } from "expo-router";

export default function ExploreScreen() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: "/(tabs)", params }} />;
}
