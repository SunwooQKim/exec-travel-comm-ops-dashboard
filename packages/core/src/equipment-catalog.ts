/**
 * Temporary catalog rows for comm / SATCOM class gear (placeholder FMC lines — extend or replace with real property books later).
 * Each entry is a template for seed `Equipment` rows with `isPlaceholder: true`.
 */
export const EQUIPMENT_CATALOG_PLACEHOLDERS = [
  {
    category: "Transport Layer (SATCOM)",
    nomenclature: "Portable VSATs",
    description:
      "Deployable satellite dishes for high-bandwidth links.",
  },
  {
    category: "Transport Layer (SATCOM)",
    nomenclature: "BGAN Terminals",
    description: "Briefcase-sized satellite terminals for quick/emergency connectivity.",
  },
  {
    category: "Transport Layer (SATCOM)",
    nomenclature: "Secure Satphones",
    description: "Iridium or similar phones for independent voice comms.",
  },
  {
    category: "Cryptographic & Boundary Gear (COMSEC)",
    nomenclature: "HAIPEs (e.g., TACLANE)",
    description:
      "High Assurance IP Encryptors to tunnel secure data over commercial/unclassified networks.",
  },
  {
    category: "Cryptographic & Boundary Gear (COMSEC)",
    nomenclature: "Deployable Routers/Switches",
    description: "Modular networking gear housed in shock-proof transit cases.",
  },
  {
    category: "End-User Devices (EUDs)",
    nomenclature: "Secure VoIP Phones",
    description: "For classified voice communications (e.g., vIPer phones).",
  },
  {
    category: "End-User Devices (EUDs)",
    nomenclature: "Thin Clients / Hardened Laptops",
    description:
      "Zero-client terminals (like Panasonic Toughbooks) to access DoD servers without storing local data.",
  },
  {
    category: "End-User Devices (EUDs)",
    nomenclature: "DMCC Smartphones",
    description:
      "Modified commercial mobile devices for secure voice/data independent of local cell towers.",
  },
  {
    category: "Power & Infrastructure",
    nomenclature: "Industrial Transformers & Conditioners",
    description:
      "To convert and clean local foreign power (e.g., 220V/50Hz to US 110V/60Hz).",
  },
  {
    category: "Power & Infrastructure",
    nomenclature: "Heavy-Duty UPS (Uninterruptible Power Supplies)",
    description:
      "Battery backups to prevent cryptographic gear from losing power and erasing keys.",
  },
  {
    category: "Physical Security & Counter-Intelligence",
    nomenclature: "Tamper-Evident Transit Cases",
    description: "Locked and sealed to prevent unauthorized physical access during transit.",
  },
  {
    category: "Physical Security & Counter-Intelligence",
    nomenclature: "Zeroize Triggers",
    description:
      "Emergency switches to instantly wipe all cryptographic keys and classified data if compromised.",
  },
  {
    category: "Physical Security & Counter-Intelligence",
    nomenclature: "Portable SCIF Tents",
    description:
      "Electromagnetically shielded tents to prevent signal leakage and electronic eavesdropping (TEMPEST protection).",
  },
] as const;
