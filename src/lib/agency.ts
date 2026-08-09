// Agency profile used on invoices, quotations, and anywhere else the brand needs to appear.
// Once Settings (src/app/(app)/settings) is wired to the database, this becomes the seed/
// fallback values for that table instead of a hardcoded constant.
export const agency = {
  name: "OWNOVA",
  tagline: "Automating the Future, Empowering Businesses",
  phone: "+92 312 5681111",
  email: "ownova.org@gmail.com",
  address: "Lahore, Pakistan",
  bank: {
    bankName: "Bank Alfalah",
    accountTitle: "SYED OWN MUHAMMAD",
    accountNumber: "00471010906744",
    iban: "PK38ALFH0047001010906744",
    swiftCode: "ALFHPKKAXXX",
    branch: "Lahore Cantt Branch (0047)",
  },
};
