export const DESIGNATIONS = [
  "Account Manager",
  "Social Media Manager",
  "SMM Specialist",
  "SEO Expert",
  "SEO Specialist",
  "Performance Marketer",
  "Content Creator",
  "Graphic Designer",
  "Web Developer",
  "Sales Executive",
  "HR",
  "Paid Intern",
  "Unpaid Intern",
  "Influencer",
  "Others",
] as const;

export type Designation = (typeof DESIGNATIONS)[number];
