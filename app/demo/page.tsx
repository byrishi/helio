import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = { title: "Live demo · Helio", description: "Helio with sample data from a fictional 5.4 kW rooftop." };

export default function Demo() {
  return <Dashboard mode="demo" />;
}
