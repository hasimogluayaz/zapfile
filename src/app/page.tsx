import HomeClient from "./HomeClient";
import { homeMetadata } from "./home-page";

export const metadata = homeMetadata("en");

export default function Home() {
  return <HomeClient />;
}
