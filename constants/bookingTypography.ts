// Shared typography scale for the booking interface (Delivery & Return Arrangement, Fulfilment &
// Address, Rental Protection, Booking Summary, Payment). One compact scale, reused everywhere, so
// every main heading looks like every other main heading, every subheading matches, and so on.
//
// Sizes are the SAME on desktop and mobile (no responsive split) — this is the only place that
// defines them, so there is nowhere else for an oversized heading to be coming from. The
// `sectionHeading`/`subheading`/`dailyPrice`/`totalAmount` entries keep their `(mobile: boolean)`
// function signature only so existing call sites (which already pass a computed `mobile` flag)
// don't need to change; the argument is accepted and ignored.
//   <Text style={bookingTypography.sectionHeading(mobile)}>Delivery & Return Arrangement</Text>

export const bookingTypeColors = {
  heading: "#102B50",
  subheading: "#102B50",
  description: "#405A78",
  note: "#64748B",
  action: "#2563EB",
};

export const bookingTypography = {
  /** Main section heading — e.g. "Delivery & Return Arrangement", "Fulfilment", "Address",
   * "Rental Protection (Optional · Demo)", "Booking Summary", "GrabExpress Delivery (Demo)". */
  sectionHeading: (_mobile?: boolean) => ({
    fontSize: 16,
    fontWeight: "700" as const,
    color: bookingTypeColors.heading,
  }),
  /** Subheading — e.g. "Scheduled Delivery Arrival Time", "Delivery & Return Schedule",
   * "Available delivery time slots", "Saved delivery addresses", "Paid to CurRENT". */
  subheading: (_mobile?: boolean) => ({
    fontSize: 14,
    fontWeight: "600" as const,
    color: bookingTypeColors.subheading,
  }),
  /** Supporting description under a heading/subheading, and pricing-row descriptions
   * (e.g. "Rental fee · 2 days", "Payment Status") in the Booking Summary. */
  description: {
    fontSize: 13,
    fontWeight: "400" as const,
    color: bookingTypeColors.description,
    lineHeight: 18,
  },
  /** Form field label — e.g. "Recipient Name", "Postcode", "Start date / End date". */
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: bookingTypeColors.heading,
  },
  /** Small label / note — e.g. the smaller in-group labels ("Delivery Arrival", "Return Pickup")
   * and any supporting note, status line or disclosure. */
  smallLabel: {
    fontSize: 12,
    fontWeight: "400" as const,
    color: bookingTypeColors.heading,
  },
  /** Supporting note — small print under a field, status line, or disclosure. */
  note: {
    fontSize: 12,
    fontWeight: "400" as const,
    color: bookingTypeColors.note,
  },
  /** A line-item pricing amount — e.g. rental fee, service fee, deposit, delivery fee. */
  pricingValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: bookingTypeColors.heading,
  },
  /** Time-slot button label (delivery arrival / return pickup / rental-start hour chips). */
  timeSlotButton: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: bookingTypeColors.heading,
  },
  /** The listing's daily rental price (e.g. "RM45 / day") — one size down from the final total. */
  dailyPrice: (_mobile?: boolean) => ({
    fontSize: 18,
    fontWeight: "700" as const,
    color: bookingTypeColors.heading,
  }),
  /** The final total amount for the booking. */
  totalAmount: (_mobile?: boolean) => ({
    fontSize: 20,
    fontWeight: "700" as const,
    color: bookingTypeColors.heading,
  }),
  /** Primary action text/link colour, and primary pricing emphasis (e.g. an add-on premium). */
  action: {
    color: bookingTypeColors.action,
  },
};
