export type VenueType =
  | "Turf / Sports Ground"
  | "Box Cricket Arena"
  | "Futsal Court"
  | "Badminton / Pickleball Court"
  | "Gaming Zone / PS5 Lounge"
  | "Bowling Alley"
  | "Skating Rink"
  | "Escape Room"
  | "Individual"
  | "Company";

export type BusinessVertical = "turf" | "events" | "food" | "coaches";

export interface RegistrationFormData {
  phone: string;
  otp: string;
  otpVerified: boolean;
  businessName: string;
  ownerName: string;
  email: string;
  verticals: BusinessVertical[];
  venueType: VenueType;
  password: string;
  confirmPassword: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  state: string;
  city: string;
  pincode: string;
  acceptedTerms: boolean;
}

export const emptyFormData: RegistrationFormData = {
  phone: "",
  otp: "",
  otpVerified: false,
  businessName: "",
  ownerName: "",
  email: "",
  verticals: ["turf"],
  venueType: "Turf / Sports Ground",
  password: "",
  confirmPassword: "",
  accountNumber: "",
  ifscCode: "",
  accountHolderName: "",
  state: "",
  city: "",
  pincode: "",
  acceptedTerms: false,
};

export const PHASES = [
  { id: 1, title: "Business Information", desc: "Tell us about your venue and provide your contact details." },
  { id: 2, title: "Security Setup", desc: "Create a secure password for your vendor account." },
  { id: 3, title: "Bank Account Details", desc: "Add your bank account information for receiving payouts (optional — you can add this later)." },
  { id: 4, title: "Address Details", desc: "Provide your venue's location information." },
  { id: 5, title: "Review & Submit", desc: "Review all your information and complete registration." },
] as const;
