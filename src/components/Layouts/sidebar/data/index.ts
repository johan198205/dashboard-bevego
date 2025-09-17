import * as Icons from "../icons";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export const NAV_DATA = [
  {
    label: "Mitt Riksbyggen",
    items: [
      {
        title: "Översikt",
        icon: Icons.HomeIcon,
        items: [
          { title: "Dashboard", url: "/" },
        ],
      },
      { title: "Användare", url: "/anvandare", icon: Icons.User, items: [] },
      { title: "Användning", url: "/anvandning", icon: Icons.Table, items: [] },
      // TODO: Konverteringar section - controlled by FEATURE_FLAGS.conversions
      ...(FEATURE_FLAGS.conversions ? [{ title: "Konverteringar", url: "/konverteringar", icon: Icons.PieChart, items: [] }] : []),
      { title: "Kundnöjdhet", url: "/kundnojdhet", icon: Icons.FourCircle, items: [] },
      { title: "Prestanda", url: "/prestanda", icon: Icons.Table, items: [] },
      { title: "Inställningar", url: "/installningar", icon: Icons.Alphabet, items: [] },
    ],
  },
  // Optional legacy demos below can be re-enabled if needed
];
