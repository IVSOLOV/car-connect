export interface Car {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  location: string;
  image: string;
  images: string[];
  description: string;
  features: string[];
  owner: {
    id: string;
    name: string;
    avatar: string;
    phone?: string;
    memberSince: string;
  };
}

export const mockCars: Car[] = [
  {
    id: "1",
    title: "2023 BMW M4 Competition",
    brand: "BMW",
    model: "M4 Competition",
    year: 2023,
    price: 84900,
    mileage: 5200,
    fuelType: "Gasoline",
    transmission: "Automatic",
    location: "Los Angeles, CA",
    image: "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80",
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
    ],
    description: "Stunning BMW M4 Competition in pristine condition. Full service history, one owner from new. Features include carbon fiber roof, M Sport exhaust, and premium sound system.",
    features: ["Carbon Fiber Roof", "M Sport Exhaust", "Head-Up Display", "Wireless Charging", "360° Camera"],
    owner: {
      id: "o1",
      name: "Michael Chen",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
      memberSince: "2021",
    },
  },
  {
    id: "2",
    title: "2022 Porsche 911 Carrera S",
    brand: "Porsche",
    model: "911 Carrera S",
    year: 2022,
    price: 129500,
    mileage: 8300,
    fuelType: "Gasoline",
    transmission: "Automatic",
    location: "Miami, FL",
    image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
    ],
    description: "Exceptional Porsche 911 Carrera S with Sport Chrono package. This beauty turns heads everywhere it goes.",
    features: ["Sport Chrono Package", "PASM", "Bose Surround Sound", "LED Matrix Headlights"],
    owner: {
      id: "o2",
      name: "Sarah Williams",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
      memberSince: "2020",
    },
  },
  {
    id: "3",
    title: "2024 Mercedes-AMG GT 63",
    brand: "Mercedes-Benz",
    model: "AMG GT 63",
    year: 2024,
    price: 175000,
    mileage: 1200,
    fuelType: "Gasoline",
    transmission: "Automatic",
    location: "New York, NY",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
    ],
    description: "Brand new Mercedes-AMG GT 63 with full factory warranty. The ultimate grand tourer.",
    features: ["AMG Performance Exhaust", "Burmester 3D Sound", "MBUX Hyperscreen", "Air Suspension"],
    owner: {
      id: "o3",
      name: "James Rodriguez",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
      memberSince: "2019",
    },
  },
  {
    id: "4",
    title: "2021 Audi RS6 Avant",
    brand: "Audi",
    model: "RS6 Avant",
    year: 2021,
    price: 95800,
    mileage: 22000,
    fuelType: "Gasoline",
    transmission: "Automatic",
    location: "Chicago, IL",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
    ],
    description: "The practical supercar. Audi RS6 Avant combines everyday usability with supercar performance.",
    features: ["Quattro AWD", "RS Sport Suspension", "Bang & Olufsen Sound", "Night Vision"],
    owner: {
      id: "o4",
      name: "Emma Thompson",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
      memberSince: "2022",
    },
  },
  {
    id: "5",
    title: "2023 Tesla Model S Plaid",
    brand: "Tesla",
    model: "Model S Plaid",
    year: 2023,
    price: 108900,
    mileage: 3500,
    fuelType: "Electric",
    transmission: "Automatic",
    location: "San Francisco, CA",
    image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80",
    ],
    description: "The fastest accelerating production car ever made. Full Self-Driving capability included.",
    features: ["Full Self-Driving", "Yoke Steering", "21\" Arachnid Wheels", "Glass Roof"],
    owner: {
      id: "o5",
      name: "David Park",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
      memberSince: "2020",
    },
  },
  {
    id: "6",
    title: "2022 Lamborghini Huracán EVO",
    brand: "Lamborghini",
    model: "Huracán EVO",
    year: 2022,
    price: 285000,
    mileage: 4800,
    fuelType: "Gasoline",
    transmission: "Automatic",
    location: "Las Vegas, NV",
    image: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    ],
    description: "Breathtaking Lamborghini Huracán EVO in Verde Mantis. A true Italian masterpiece.",
    features: ["LDVI System", "Magneto-Rheological Suspension", "Sensonum Sound System", "Lift System"],
    owner: {
      id: "o6",
      name: "Alex Morgan",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&q=80",
      memberSince: "2018",
    },
  },
];
