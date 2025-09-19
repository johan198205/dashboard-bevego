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
          { title: "KPI Dashboard", url: "/" },
          { title: "GA4 Dashboard", url: "/oversikt/besok" },
        ],
      },
      { title: "Användare", url: "/anvandare", icon: Icons.User, items: [] },
      { title: "Användning", url: "/anvandning", icon: Icons.Table, items: [] },
      // TODO: Konverteringar section - controlled by FEATURE_FLAGS.conversions
      ...(FEATURE_FLAGS.conversions ? [{ title: "Konverteringar", url: "/konverteringar", icon: Icons.PieChart, items: [] }] : []),
      { 
        title: "Kundnöjdhet", 
        icon: Icons.FourCircle, 
        items: [
          { title: "NDI Dashboard", url: "/ndi" },
          { title: "NDI Detaljer", url: "/ndi/details" },
          { title: "NDI Inställningar", url: "/ndi/settings" },
        ]
      },
      { title: "Prestanda", url: "/prestanda", icon: Icons.Table, items: [] },
      { title: "Clarity", url: "/clarity", icon: Icons.FourCircle, items: [] },
      { title: "Inställningar", url: "/installningar", icon: Icons.Alphabet, items: [] },
    ],
  },
  // Optional legacy demos below can be re-enabled if needed
];
