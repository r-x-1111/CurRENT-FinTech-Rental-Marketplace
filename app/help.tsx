import { Text } from "react-native";
import { router } from "expo-router";
import { Button, Card, Notice, Screen, Section, s } from "../components/ui";

const faqs = [
  [
    "How is my security deposit calculated?",
    "The demo uses estimated item value and your explainable Rental Risk Score. Low, standard and higher risk tiers use 10%, 20% and 30% of item value. The deposit is refundable after an accepted return with no active dispute.",
  ],
  [
    "What happens if an item is damaged or not returned?",
    "Open the related rental and report a problem with a reason, explanation and photo. Deposit release pauses while the case is under review. The prototype does not decide disputes automatically.",
  ],
  [
    "How does verification work?",
    "Profile lets you simulate an external authorised eKYC provider response. No real identity documents are collected.",
  ],
  [
    "Can I rent out my own items?",
    "Yes. Open Owner Mode from Profile, add item details and at least one photo, then publish after demo verification. You cannot request your own listing.",
  ],
  [
    "When is the deposit released?",
    "After the renter submits return evidence, the owner inspects the item and confirms the return. A disputed deposit remains paused.",
  ],
  [
    "How are fees calculated?",
    "The borrower service fee is 5% of the rental fee, with a RM5 minimum. Owners see a 12% platform commission on rental income. The quote lists the refundable deposit separately.",
  ],
  [
    "Can I cancel?",
    "A pending or approved request can be cancelled before payment processing. Refunds are not automated in this academic prototype.",
  ],
  [
    "Can an item be delivered?",
    "Only listings marked Delivery Available offer that option. A live service would use an external logistics provider. This demo does not calculate a delivery fee; confirm arrangements in rental messages.",
  ],
  [
    "How does the Rental Risk Score work?",
    "The demo score starts at 50 and reflects verification, completed rentals, reviews and disputes. Profile shows the calculation. It is not a credit score.",
  ],
] as const;

export default function HelpScreen() {
  return (
    <Screen
      back
      title="Help & Trust"
      subtitle="Practical answers for safer rentals."
    >
      <Notice text="CurRENT is an academic local prototype. Real identity checks, payments, deposit handling, BNPL, item protection and delivery would require authorised external providers." />
      <Section title="How CurRENT works" />
      <Card>
        <Text style={s.body}>1. Search and choose an item near you.</Text>
        <Text style={s.body}>
          2. Verify, select dates and submit a request.
        </Text>
        <Text style={s.body}>
          3. After approval, complete demo payment and arrange collection.
        </Text>
        <Text style={s.body}>
          4. Record handover and return evidence, then complete the rental.
        </Text>
      </Card>
      <Section title="Trust & Safety" />
      <Card>
        <Text style={s.h2}>Know who you rent with</Text>
        <Text style={s.body}>
          Verified status, structured listings, reviews and rental history help
          participants assess a request. Verification is simulated here.
        </Text>
        <Text style={s.h2}>Record item condition</Text>
        <Text style={s.body}>
          Handover and return photos, notes and on-platform messages create a
          shared record. Optional protection depends on external partner
          eligibility and terms; compensation is not automatic.
        </Text>
        <Text style={s.h2}>Resolve problems</Text>
        <Text style={s.body}>
          Either participant can report a problem from an active rental or
          pending return. A dispute pauses demo deposit release for review.
        </Text>
        <Button secondary onPress={() => router.push("/(tabs)/rentals")}>
          View rentals or report a problem
        </Button>
      </Card>
      <Section title="Frequently asked questions" />
      {faqs.map(([question, answer]) => (
        <Card key={question}>
          <Text style={s.h2}>{question}</Text>
          <Text style={s.body}>{answer}</Text>
        </Card>
      ))}
    </Screen>
  );
}
