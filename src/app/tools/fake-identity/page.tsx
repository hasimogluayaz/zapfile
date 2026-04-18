"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

// ── Data Arrays ──────────────────────────────────────────────────────────────

const FIRST_NAMES_MALE = [
  "James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles",
  "Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Joshua",
  "Kenneth","Kevin","Brian","George","Timothy","Ronald","Edward","Jason","Jeffrey","Ryan",
  "Jacob","Nicholas","Eric","Jonathan","Stephen","Larry","Justin","Scott","Brandon","Benjamin",
  "Samuel","Raymond","Gregory","Frank","Alexander","Patrick","Jack","Dennis","Jerry","Tyler",
];

const FIRST_NAMES_FEMALE = [
  "Mary","Patricia","Jennifer","Linda","Barbara","Elizabeth","Susan","Jessica","Sarah","Karen",
  "Lisa","Nancy","Betty","Margaret","Sandra","Ashley","Dorothy","Kimberly","Emily","Donna",
  "Michelle","Carol","Amanda","Melissa","Deborah","Stephanie","Rebecca","Sharon","Laura","Cynthia",
  "Amy","Angela","Kathleen","Anna","Brenda","Pamela","Emma","Nicole","Helen","Samantha",
  "Katherine","Christine","Debra","Rachel","Carolyn","Janet","Catherine","Maria","Heather","Diane",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Phillips","Evans","Turner","Parker","Collins","Edwards","Stewart","Flores","Morris","Nguyen",
  "Murphy","Cook","Rogers","Morgan","Peterson","Cooper","Reed","Bailey","Bell","Gomez",
  "Kelly","Howard","Ward","Cox","Diaz","Richardson","Wood","Watson","Brooks","Bennett",
  "Gray","James","Reyes","Hughes","Price","Myers","Long","Foster","Sanders","Ross",
  "Morales","Powell","Sullivan","Russell","Ortiz","Jenkins","Gutierrez","Perry","Butler","Barnes",
];

const CITIES_US: [string, string, string][] = [
  ["New York","NY","100"],["Los Angeles","CA","900"],["Chicago","IL","606"],
  ["Houston","TX","770"],["Phoenix","AZ","850"],["Philadelphia","PA","191"],
  ["San Antonio","TX","782"],["San Diego","CA","921"],["Dallas","TX","752"],
  ["San Jose","CA","951"],["Austin","TX","787"],["Jacksonville","FL","322"],
  ["Fort Worth","TX","761"],["Columbus","OH","432"],["Charlotte","NC","282"],
  ["San Francisco","CA","941"],["Indianapolis","IN","462"],["Seattle","WA","981"],
  ["Denver","CO","802"],["Nashville","TN","372"],["Oklahoma City","OK","731"],
  ["El Paso","TX","799"],["Boston","MA","021"],["Portland","OR","972"],
  ["Las Vegas","NV","891"],["Memphis","TN","381"],["Louisville","KY","402"],
  ["Baltimore","MD","212"],["Milwaukee","WI","532"],["Albuquerque","NM","871"],
  ["Tucson","AZ","857"],["Fresno","CA","937"],["Sacramento","CA","958"],
];

const CITIES_UK = ["London","Manchester","Birmingham","Glasgow","Liverpool","Leeds","Edinburgh","Bristol","Cardiff","Sheffield"];
const CITIES_DE = ["Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Dusseldorf","Leipzig","Dortmund","Essen"];
const CITIES_TR = ["Istanbul","Ankara","Izmir","Bursa","Adana","Gaziantep","Konya","Mersin","Kayseri","Eskisehir"];
const CITIES_FR = ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Strasbourg","Montpellier","Bordeaux","Lille"];

const STREETS = [
  "Main St","Oak Ave","Maple Dr","Cedar Ln","Pine Rd","Elm St","Willow Way","Birch Blvd",
  "Sunset Blvd","Park Ave","Lake Dr","River Rd","Forest Ln","Hillside Ave","Valley View Dr",
  "Meadow Ln","Cherry St","Walnut Ave","Chestnut Rd","Sycamore St","Hickory Ln","Poplar Ave",
  "Spruce St","Magnolia Blvd","Ash St","Cypress Ave","Redwood Ln","Juniper Dr","Sequoia Rd","Cottonwood Ct",
];

const COMPANIES = [
  "Apex Solutions","Bright Future LLC","Crestwood Industries","Delta Tech","Emerald Consulting",
  "Falcon Systems","Granite Partners","Horizon Group","Irongate Corp","Jade Software",
  "Keystone Ventures","Lighthouse Media","Momentum Labs","Nexus Digital","Orbit Analytics",
  "Pinnacle Services","Quantum Works","Ridgeline Co","Summit Strategies","Tidal Innovations",
  "Cobalt Dynamics","Stellar Networks","Vanguard Digital","Beacon Analytics","Catalyst Group",
];

const JOB_TITLES = [
  "Software Engineer","Product Manager","Data Analyst","UX Designer","Marketing Specialist",
  "Operations Manager","Sales Representative","Financial Analyst","HR Coordinator","Content Writer",
  "Project Manager","Business Analyst","DevOps Engineer","Customer Success Manager","QA Engineer",
  "Graphic Designer","Systems Administrator","Legal Counsel","Account Executive","Research Scientist",
  "Frontend Developer","Backend Engineer","Data Scientist","Brand Strategist","Cloud Architect",
];

const HOBBIES = [
  "Photography","Hiking","Gaming","Cooking","Reading","Cycling","Yoga","Painting",
  "Gardening","Running","Chess","Swimming","Traveling","Pottery","Rock Climbing",
  "Knitting","Bird Watching","Astronomy","Woodworking","Surfing","Meditation",
  "Sketching","Baking","Volunteering","Film Making","3D Printing","Origami","Dancing",
];

const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

const EMAIL_DOMAINS_US = ["gmail.com","yahoo.com","outlook.com","icloud.com","hotmail.com"];
const EMAIL_DOMAINS_UK = ["gmail.com","yahoo.co.uk","hotmail.co.uk","outlook.com","btinternet.com"];
const EMAIL_DOMAINS_DE = ["gmail.com","web.de","gmx.de","t-online.de","outlook.de"];
const EMAIL_DOMAINS_TR = ["gmail.com","hotmail.com","outlook.com","yahoo.com","yandex.com"];
const EMAIL_DOMAINS_FR = ["gmail.com","orange.fr","free.fr","laposte.net","outlook.fr"];

type Country = "US" | "UK" | "DE" | "TR" | "FR";

const COUNTRY_LABELS: Record<Country, string> = {
  US: "United States",
  UK: "United Kingdom",
  DE: "Germany",
  TR: "Turkey",
  FR: "France",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDigits(n: number): string {
  return Array.from({ length: n }, () => randInt(0, 9)).join("");
}

function randPassword(length = 14): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ".");
}

// Luhn-valid Visa card number
function generateVisaCard(): string {
  const prefix = "4";
  let digits = prefix + Array.from({ length: 14 }, () => randInt(0, 9)).join("");
  // Luhn checksum
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  const check = (10 - (sum % 10)) % 10;
  const full = digits + check;
  return `${full.slice(0,4)}-${full.slice(4,8)}-${full.slice(8,12)}-${full.slice(12,16)}`;
}

function generateSSN(): string {
  const area = randInt(100, 899).toString().padStart(3, "0");
  const group = randInt(10, 99).toString();
  const serial = randInt(1000, 9999).toString();
  return `${area}-${group}-${serial}`;
}

function cmToFeetInches(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

interface Identity {
  fullName: string;
  gender: string;
  age: number;
  birthday: string;
  bloodType: string;
  heightCm: number;
  weightKg: number;
  email: string;
  phone: string;
  address: string;
  country: Country;
  username: string;
  password: string;
  website: string;
  linkedin: string;
  company: string;
  jobTitle: string;
  ssn: string;
  creditCard: string;
  hobbies: string;
}

function generatePhone(country: Country, isMale: boolean): string {
  void isMale;
  switch (country) {
    case "US": return `+1 (${randDigits(3)}) ${randDigits(3)}-${randDigits(4)}`;
    case "UK": return `+44 7${randDigits(3)} ${randDigits(6)}`;
    case "DE": return `+49 1${pick(["5","6","7"])}${randDigits(2)} ${randDigits(7)}`;
    case "TR": return `+90 5${randDigits(2)} ${randDigits(3)} ${randDigits(4)}`;
    case "FR": return `+33 6${randDigits(2)} ${randDigits(2)} ${randDigits(2)} ${randDigits(2)}`;
  }
}

function generateAddress(country: Country): string {
  switch (country) {
    case "US": {
      const [city, state, zipPrefix] = pick(CITIES_US);
      return `${randInt(1, 9999)} ${pick(STREETS)}, ${city}, ${state} ${zipPrefix}${randDigits(2)}`;
    }
    case "UK": {
      const city = pick(CITIES_UK);
      return `${randInt(1, 200)} ${pick(STREETS)}, ${city}, ${["SW","NW","SE","NE","EC","WC"][randInt(0,5)]}${randInt(1,9)} ${randInt(1,9)}${String.fromCharCode(65+randInt(0,25))}${String.fromCharCode(65+randInt(0,25))}`;
    }
    case "DE": {
      const city = pick(CITIES_DE);
      return `${pick(["Hauptstraße","Berliner Str","Goethestraße","Schillerstr","Bahnhofstr"])} ${randInt(1, 120)}, ${randInt(10000,99999)} ${city}`;
    }
    case "TR": {
      const city = pick(CITIES_TR);
      return `${pick(["Atatürk Cad","İstiklal Cad","Cumhuriyet Blv","Bağdat Cad","Millet Cad"])} No:${randInt(1,200)}, ${city}`;
    }
    case "FR": {
      const city = pick(CITIES_FR);
      return `${randInt(1,200)} ${pick(["Rue de la Paix","Avenue des Champs","Boulevard Haussmann","Rue Saint-Honoré","Rue du Faubourg"])} , ${randInt(10000,99999)} ${city}`;
    }
  }
}

function generateIdentity(country: Country): Identity {
  const isMale = Math.random() > 0.5;
  const firstName = pick(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
  const lastName = pick(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const gender = isMale ? "Male" : "Female";

  const age = randInt(18, 65);
  const year = new Date().getFullYear() - age;
  const month = randInt(1, 12).toString().padStart(2, "0");
  const day = randInt(1, 28).toString().padStart(2, "0");
  const birthday = `${month}/${day}/${year}`;

  const bloodType = pick(BLOOD_TYPES);
  const heightCm = isMale ? randInt(165, 193) : randInt(155, 180);
  const weightKg = isMale ? randInt(65, 100) : randInt(50, 85);

  const emailDomains =
    country === "US" ? EMAIL_DOMAINS_US :
    country === "UK" ? EMAIL_DOMAINS_UK :
    country === "DE" ? EMAIL_DOMAINS_DE :
    country === "TR" ? EMAIL_DOMAINS_TR :
    EMAIL_DOMAINS_FR;
  const email = `${slugify(firstName)}.${slugify(lastName)}${randInt(10, 99)}@${pick(emailDomains)}`;
  const phone = generatePhone(country, isMale);
  const address = generateAddress(country);

  const username = `${slugify(firstName)}${slugify(lastName)}${randInt(10, 999)}`;
  const website = `https://www.${slugify(firstName)}${slugify(lastName)}.com`;
  const linkedin = `https://linkedin.com/in/${slugify(firstName)}-${slugify(lastName)}-${randInt(1000,9999)}`;

  const company = pick(COMPANIES);
  const jobTitle = pick(JOB_TITLES);
  const ssn = generateSSN();
  const creditCard = generateVisaCard();

  const numHobbies = randInt(2, 3);
  const shuffled = [...HOBBIES].sort(() => Math.random() - 0.5);
  const hobbies = shuffled.slice(0, numHobbies).join(", ");

  return {
    fullName, gender, age, birthday, bloodType,
    heightCm, weightKg, email, phone, address,
    country, username, password: randPassword(),
    website, linkedin, company, jobTitle, ssn, creditCard, hobbies,
  };
}

// ── Components ────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function FieldRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied!`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-white/[0.06] last:border-0 group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-t-secondary">{label}</p>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium leading-none">
              {badge}
            </span>
          )}
        </div>
        <p className={`text-sm font-semibold text-t-primary mt-0.5 break-all ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 mt-4 text-t-secondary opacity-0 group-hover:opacity-100 hover:text-t-primary transition-all"
        aria-label={`Copy ${label}`}
      >
        <CopyIcon />
      </button>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-t-secondary mb-3">{title}</p>
      {children}
    </div>
  );
}

const COUNTRIES: { code: Country; label: string; flag: string }[] = [
  { code: "US", label: "USA", flag: "🇺🇸" },
  { code: "UK", label: "UK", flag: "🇬🇧" },
  { code: "DE", label: "Germany", flag: "🇩🇪" },
  { code: "TR", label: "Turkey", flag: "🇹🇷" },
  { code: "FR", label: "France", flag: "🇫🇷" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FakeIdentityPage() {
  const [country, setCountry] = useState<Country>("US");
  const [identity, setIdentity] = useState<Identity>(() => generateIdentity("US"));

  const generate = useCallback((c?: Country) => {
    const target = c ?? country;
    setIdentity(generateIdentity(target));
    toast.success("New identity generated!");
  }, [country]);

  const handleCountryChange = (c: Country) => {
    setCountry(c);
    setIdentity(generateIdentity(c));
  };

  const copyAsJSON = async () => {
    const json = JSON.stringify({
      fullName: identity.fullName,
      gender: identity.gender,
      age: identity.age,
      birthday: identity.birthday,
      bloodType: identity.bloodType,
      height: `${identity.heightCm} cm / ${cmToFeetInches(identity.heightCm)}`,
      weight: `${identity.weightKg} kg / ${Math.round(identity.weightKg * 2.205)} lbs`,
      hobbies: identity.hobbies,
      email: identity.email,
      phone: identity.phone,
      address: identity.address,
      country: COUNTRY_LABELS[identity.country],
      username: identity.username,
      password: identity.password,
      website: identity.website,
      linkedin: identity.linkedin,
      company: identity.company,
      jobTitle: identity.jobTitle,
    }, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      toast.success("Copied as JSON!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copyAsCSV = async () => {
    const headers = "Full Name,Gender,Age,Birthday,Blood Type,Height,Weight,Email,Phone,Address,Username,Password,Website,Company,Job Title";
    const values = [
      identity.fullName, identity.gender, identity.age, identity.birthday,
      identity.bloodType,
      `${identity.heightCm}cm`,
      `${identity.weightKg}kg`,
      identity.email, identity.phone, identity.address,
      identity.username, identity.password, identity.website,
      identity.company, identity.jobTitle,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    try {
      await navigator.clipboard.writeText(`${headers}\n${values}`);
      toast.success("Copied as CSV!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <ToolLayout
      toolName="Fake Identity Generator"
      toolDescription="Generate random test identities for development and QA. All data is created locally — nothing is sent to any server."
    >
      <div className="space-y-5">
        {/* Country Selector */}
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleCountryChange(c.code)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                country === c.code
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                  : "bg-bg-secondary border-border text-t-secondary hover:text-t-primary"
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => generate()}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all"
          >
            Generate New
          </button>
          <button
            onClick={copyAsJSON}
            className="px-5 py-3 rounded-xl font-semibold text-t-primary bg-bg-secondary border border-border hover:bg-bg-secondary/80 transition-all text-sm"
          >
            Copy as JSON
          </button>
          <button
            onClick={copyAsCSV}
            className="px-5 py-3 rounded-xl font-semibold text-t-primary bg-bg-secondary border border-border hover:bg-bg-secondary/80 transition-all text-sm"
          >
            Copy as CSV
          </button>
        </div>

        {/* Profile Header */}
        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {identity.fullName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-t-primary text-lg leading-tight">{identity.fullName}</p>
            <p className="text-sm text-t-secondary">{identity.jobTitle} at {identity.company}</p>
            <p className="text-xs text-t-secondary mt-0.5">{COUNTRY_LABELS[identity.country]}</p>
          </div>
        </div>

        {/* Personal Info Card */}
        <Card title="Personal Info">
          <FieldRow label="Full Name" value={identity.fullName} />
          <FieldRow label="Gender" value={identity.gender} />
          <FieldRow label="Age" value={`${identity.age} years old`} />
          <FieldRow label="Birthday" value={identity.birthday} />
          <FieldRow label="Blood Type" value={identity.bloodType} />
          <FieldRow label="Height" value={`${identity.heightCm} cm  /  ${cmToFeetInches(identity.heightCm)}`} />
          <FieldRow label="Weight" value={`${identity.weightKg} kg  /  ${Math.round(identity.weightKg * 2.205)} lbs`} />
          <FieldRow label="Hobbies" value={identity.hobbies} />
        </Card>

        {/* Contact Card */}
        <Card title="Contact">
          <FieldRow label="Email" value={identity.email} mono />
          <FieldRow label="Phone" value={identity.phone} mono />
          <FieldRow label="Address" value={identity.address} />
          <FieldRow label="Country" value={COUNTRY_LABELS[identity.country]} />
        </Card>

        {/* Online Card */}
        <Card title="Online">
          <FieldRow label="Username" value={identity.username} mono />
          <FieldRow label="Password" value={identity.password} mono />
          <FieldRow label="Website" value={identity.website} mono />
          <FieldRow label="LinkedIn" value={identity.linkedin} mono />
        </Card>

        {/* Professional Card */}
        <Card title="Professional">
          <FieldRow label="Company" value={identity.company} />
          <FieldRow label="Job Title" value={identity.jobTitle} />
          <FieldRow label="SSN" value={identity.ssn} mono badge="FAKE" />
          <FieldRow label="Credit Card (Visa)" value={identity.creditCard} mono badge="TEST ONLY" />
        </Card>

        <p className="text-center text-xs text-t-secondary">
          All data is randomly generated and does not represent any real person. For testing purposes only.
        </p>
      </div>
    </ToolLayout>
  );
}
