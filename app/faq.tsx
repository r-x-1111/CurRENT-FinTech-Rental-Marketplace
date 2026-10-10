import React from "react";
import { Screen } from "../components/ui";
import { FaqAccordion } from "../components/FaqAccordion";
import { sampleFaqs } from "../data/mock";

export default function FaqScreen() {
  return (
    <Screen
      back
      title="FAQ"
      subtitle="Frequently asked questions about CurRENT peer-to-peer rentals in Klang Valley."
    >
      <FaqAccordion faqs={sampleFaqs} />
    </Screen>
  );
}

