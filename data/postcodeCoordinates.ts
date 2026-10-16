// Lightweight bundled Malaysian postcode → approximate coordinate lookup, used only to estimate a
// straight-line demo delivery distance (see services/geo.ts). No external maps/routing API, no API key.
// Coordinates are approximate town/area centroids, not exact rooftop locations.

export type PostcodeCoordinate = { lat: number; lng: number; area: string; state: string };

// Exact postcode matches: the CurRENT seeded listings' pickup postcodes, demo saved delivery
// addresses, and a handful of other common Klang Valley postcodes.
export const POSTCODE_COORDINATES: Record<string, PostcodeCoordinate> = {
  "46100": { lat: 3.1020, lng: 101.6480, area: "Jalan Gasing, Petaling Jaya", state: "Selangor" },
  "46200": { lat: 3.1073, lng: 101.6416, area: "Jaya One, Petaling Jaya", state: "Selangor" },
  "47170": { lat: 3.0319, lng: 101.6187, area: "Puchong", state: "Selangor" },
  "47300": { lat: 3.1073, lng: 101.6067, area: "Kelana Jaya, Petaling Jaya", state: "Selangor" },
  "47301": { lat: 3.1073, lng: 101.6067, area: "Kelana Jaya, Petaling Jaya", state: "Selangor" },
  "47400": { lat: 3.1350, lng: 101.6230, area: "Damansara Uptown, Petaling Jaya", state: "Selangor" },
  "47500": { lat: 3.0738, lng: 101.5951, area: "Subang Jaya", state: "Selangor" },
  "47800": { lat: 3.1488, lng: 101.6150, area: "Bandar Utama, Petaling Jaya", state: "Selangor" },
  "47810": { lat: 3.1570, lng: 101.5890, area: "Kota Damansara, Petaling Jaya", state: "Selangor" },
  "40000": { lat: 3.0738, lng: 101.5183, area: "Shah Alam", state: "Selangor" },
  "40150": { lat: 3.0450, lng: 101.5330, area: "Shah Alam", state: "Selangor" },
  "50088": { lat: 3.1579, lng: 101.7120, area: "KLCC, Kuala Lumpur", state: "Kuala Lumpur" },
  "50250": { lat: 3.1455, lng: 101.7099, area: "Bukit Bintang, Kuala Lumpur", state: "Kuala Lumpur" },
  "50400": { lat: 3.1390, lng: 101.6869, area: "Kuala Lumpur", state: "Kuala Lumpur" },
  "50480": { lat: 3.1715, lng: 101.6508, area: "Mont Kiara, Kuala Lumpur", state: "Kuala Lumpur" },
  "59100": { lat: 3.1292, lng: 101.6785, area: "Bangsar, Kuala Lumpur", state: "Kuala Lumpur" },
  "59200": { lat: 3.1200, lng: 101.6778, area: "Mid Valley, Kuala Lumpur", state: "Kuala Lumpur" },
  "60000": { lat: 3.1478, lng: 101.6280, area: "TTDI, Kuala Lumpur", state: "Kuala Lumpur" },
  // Nationwide spread so delivery estimates are not assumed to always be within Klang Valley.
  "62502": { lat: 2.9264, lng: 101.6964, area: "Putrajaya", state: "Putrajaya" },
  "10000": { lat: 5.4141, lng: 100.3288, area: "George Town", state: "Penang" },
  "11900": { lat: 5.2945, lng: 100.2680, area: "Bayan Lepas", state: "Penang" },
  "14000": { lat: 5.3644, lng: 100.4668, area: "Bukit Mertajam", state: "Penang" },
  "80000": { lat: 1.4927, lng: 103.7414, area: "Johor Bahru", state: "Johor" },
  "81300": { lat: 1.5333, lng: 103.6500, area: "Skudai", state: "Johor" },
  "30000": { lat: 4.5975, lng: 101.0901, area: "Ipoh", state: "Perak" },
  "70000": { lat: 2.7258, lng: 101.9424, area: "Seremban", state: "Negeri Sembilan" },
  "75000": { lat: 2.1896, lng: 102.2501, area: "Melaka City", state: "Melaka" },
  "25000": { lat: 3.8168, lng: 103.3317, area: "Kuantan", state: "Pahang" },
  "20000": { lat: 5.3302, lng: 103.1408, area: "Kuala Terengganu", state: "Terengganu" },
  "15000": { lat: 6.1248, lng: 102.2380, area: "Kota Bharu", state: "Kelantan" },
  "05000": { lat: 6.1214, lng: 100.3692, area: "Alor Setar", state: "Kedah" },
  "01000": { lat: 6.4414, lng: 100.1986, area: "Kangar", state: "Perlis" },
  "88000": { lat: 5.9804, lng: 116.0735, area: "Kota Kinabalu", state: "Sabah" },
  "93000": { lat: 1.5497, lng: 110.3626, area: "Kuching", state: "Sarawak" },
  "87000": { lat: 5.2831, lng: 115.2308, area: "Labuan", state: "Labuan" },
};

// Fallback when the exact 5-digit postcode isn't in the dataset above: route by its maintained
// 2-digit postal-area prefix to the nearest representative centroid. This is a lookup table, not
// arithmetic on the postcode digits.
export const POSTCODE_PREFIX_FALLBACK: Record<string, PostcodeCoordinate> = {
  "01": POSTCODE_COORDINATES["01000"], "02": POSTCODE_COORDINATES["01000"],
  "05": POSTCODE_COORDINATES["05000"], "06": POSTCODE_COORDINATES["05000"],
  "08": POSTCODE_COORDINATES["05000"], "09": POSTCODE_COORDINATES["05000"],
  "10": POSTCODE_COORDINATES["10000"], "11": POSTCODE_COORDINATES["11900"], "13": POSTCODE_COORDINATES["10000"], "14": POSTCODE_COORDINATES["14000"],
  "15": POSTCODE_COORDINATES["15000"], "16": POSTCODE_COORDINATES["15000"], "17": POSTCODE_COORDINATES["15000"], "18": POSTCODE_COORDINATES["15000"],
  "20": POSTCODE_COORDINATES["20000"], "21": POSTCODE_COORDINATES["20000"], "22": POSTCODE_COORDINATES["20000"], "23": POSTCODE_COORDINATES["20000"], "24": POSTCODE_COORDINATES["20000"],
  "25": POSTCODE_COORDINATES["25000"], "26": POSTCODE_COORDINATES["25000"], "27": POSTCODE_COORDINATES["25000"], "28": POSTCODE_COORDINATES["25000"], "39": POSTCODE_COORDINATES["25000"],
  "30": POSTCODE_COORDINATES["30000"], "31": POSTCODE_COORDINATES["30000"], "32": POSTCODE_COORDINATES["30000"], "33": POSTCODE_COORDINATES["30000"], "34": POSTCODE_COORDINATES["30000"], "35": POSTCODE_COORDINATES["30000"], "36": POSTCODE_COORDINATES["30000"],
  "40": POSTCODE_COORDINATES["40000"], "41": POSTCODE_COORDINATES["40000"], "42": POSTCODE_COORDINATES["40000"], "43": POSTCODE_COORDINATES["47170"],
  "44": POSTCODE_COORDINATES["40000"], "45": POSTCODE_COORDINATES["40000"], "48": POSTCODE_COORDINATES["47800"], "63": POSTCODE_COORDINATES["62502"], "68": POSTCODE_COORDINATES["47800"],
  "50": POSTCODE_COORDINATES["50400"], "51": POSTCODE_COORDINATES["50400"], "52": POSTCODE_COORDINATES["50400"], "53": POSTCODE_COORDINATES["50400"], "54": POSTCODE_COORDINATES["50400"],
  "55": POSTCODE_COORDINATES["50400"], "56": POSTCODE_COORDINATES["50400"], "57": POSTCODE_COORDINATES["50400"], "58": POSTCODE_COORDINATES["50400"], "59": POSTCODE_COORDINATES["59200"], "60": POSTCODE_COORDINATES["60000"],
  "62": POSTCODE_COORDINATES["62502"],
  "70": POSTCODE_COORDINATES["70000"], "71": POSTCODE_COORDINATES["70000"], "72": POSTCODE_COORDINATES["70000"], "73": POSTCODE_COORDINATES["70000"],
  "75": POSTCODE_COORDINATES["75000"], "76": POSTCODE_COORDINATES["75000"], "77": POSTCODE_COORDINATES["75000"], "78": POSTCODE_COORDINATES["75000"], "79": POSTCODE_COORDINATES["75000"],
  "80": POSTCODE_COORDINATES["80000"], "81": POSTCODE_COORDINATES["81300"], "82": POSTCODE_COORDINATES["80000"], "83": POSTCODE_COORDINATES["80000"], "84": POSTCODE_COORDINATES["80000"], "85": POSTCODE_COORDINATES["80000"], "86": POSTCODE_COORDINATES["80000"],
  "87": POSTCODE_COORDINATES["87000"],
  "88": POSTCODE_COORDINATES["88000"], "89": POSTCODE_COORDINATES["88000"], "90": POSTCODE_COORDINATES["88000"], "91": POSTCODE_COORDINATES["88000"],
  "93": POSTCODE_COORDINATES["93000"], "94": POSTCODE_COORDINATES["93000"], "95": POSTCODE_COORDINATES["93000"], "96": POSTCODE_COORDINATES["93000"], "98": POSTCODE_COORDINATES["93000"],
};
