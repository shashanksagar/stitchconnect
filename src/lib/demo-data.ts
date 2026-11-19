export const tailors = [
  { id: "tailor-amara", name: "Amara Atelier", location: "Lagos, Nigeria", specialty: "Contemporary African", bio: "Heritage textiles, modern silhouettes. Beautifully personal pieces, made with care in our Lagos atelier.", basePrice: 12000, turnaroundDays: 12, rating: 4.9, styles: ["Ankara", "Occasion wear"], color: "#b65d3e", image: "/images/atelier-1.svg" },
  { id: "tailor-luca", name: "Luca & Thread", location: "Florence, Italy", specialty: "Classic tailoring", bio: "Quiet confidence in every seam. Italian-inspired tailoring for your everyday and extraordinary moments.", basePrice: 24000, turnaroundDays: 18, rating: 4.9, styles: ["Suits", "Minimalist"], color: "#657765", image: "/images/atelier-2.svg" },
  { id: "tailor-meera", name: "Studio Meera", location: "Jaipur, India", specialty: "Bridal & embroidery", bio: "Hand-finished embroidery and thoughtful details, bringing the artistry of Jaipur to your wardrobe.", basePrice: 18000, turnaroundDays: 15, rating: 4.8, styles: ["Bridal", "Embroidery"], color: "#c19766", image: "/images/atelier-3.svg" },
  { id: "tailor-june", name: "June Studio", location: "Seoul, South Korea", specialty: "Modern essentials", bio: "Relaxed shapes, precise cuts, and a little unexpected detail. Clothes that feel like you.", basePrice: 9500, turnaroundDays: 10, rating: 4.7, styles: ["Minimalist", "Everyday"], color: "#738c8b", image: "/images/atelier-4.svg" },
  { id: "tailor-noor", name: "Maison Noor", location: "Marrakech, Morocco", specialty: "Artisanal occasion wear", bio: "Flowing forms and traditional craftsmanship for unforgettable occasions. Made slowly, worn forever.", basePrice: 16000, turnaroundDays: 14, rating: 4.9, styles: ["Occasion wear", "Handcrafted"], color: "#9b6b63", image: "/images/atelier-5.svg" },
];
export const garments = ["Dress", "Suit", "Shirt", "Trousers", "Traditional wear"];
export function workshopAddress(t: typeof tailors[number]) {
  const [city, country] = t.location.split(", ");
  return { name: t.name, line1: "12 Atelier Lane (demo address)", city, country, postalCode: "DEMO-01", phone: "+1 555 0199" };
}
