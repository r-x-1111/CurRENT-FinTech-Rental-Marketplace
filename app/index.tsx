import { Redirect } from "expo-router";
import { useMarketplace } from "../context/Marketplace";

export default function Index() {
  const { user } = useMarketplace();
  return <Redirect href={user ? "/(tabs)" : "/welcome"} />;
}
