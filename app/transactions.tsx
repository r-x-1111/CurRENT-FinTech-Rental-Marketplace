import { Text } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Empty,
  Notice,
  Row,
  Screen,
  s,
} from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { money } from "../services/booking";
export default function Transactions() {
  const { state, user } = useMarketplace();
  const bookings = state.bookings.filter(
    (b) => b.renterId === user?.id && b.payment !== "required",
  );
  return (
    <Screen
      back
      title="Payment history"
      subtitle="Every fee and every deposit, in plain sight."
    >
      <Notice text="These are simulated transactions. No real money has been charged or refunded." />
      {bookings.length ? (
        bookings.map((b) => (
          <Card key={b.id}>
            <Text style={s.h2}>{b.title}</Text>
            <Badge text={b.payment} green={b.payment === "paid"} />
            <Row label="Total payable" value={money(b.quote.total)} />
            <Row label="Refundable deposit" value={money(b.quote.deposit)} />
            <Row label="Deposit status" value={b.deposit.replace("_", " ")} />
            <Row label="Method" value={b.paymentMethod || "—"} />
            <Text style={s.caption}>Reference {b.id}</Text>
            <Button secondary onPress={() => router.push(`/rental/${b.id}`)}>
              View receipt & rental
            </Button>
          </Card>
        ))
      ) : (
        <Empty
          title="A fresh start"
          text="Your demo payment records will appear after checkout."
        />
      )}
    </Screen>
  );
}
