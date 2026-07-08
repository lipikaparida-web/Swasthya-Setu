export interface StateData {
  stateName: string;
  districts: string[];
}

export const indiaStatesAndDistricts: StateData[] = [
  {
    stateName: "Andhra Pradesh",
    districts: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kurnool", "Anantapur", "Chittoor"]
  },
  {
    stateName: "Bihar",
    districts: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Nalanda", "Purnia", "Rohtas"]
  },
  {
    stateName: "Delhi",
    districts: ["New Delhi", "Central Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi"]
  },
  {
    stateName: "Gujarat",
    districts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Jamnagar", "Bhavnagar", "Junagadh"]
  },
  {
    stateName: "Haryana",
    districts: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Panchkula", "Rohtak", "Karnal", "Hisar"]
  },
  {
    stateName: "Jharkhand",
    districts: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Dumka"]
  },
  {
    stateName: "Karnataka",
    districts: ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Hubli-Dharwad", "Mangaluru", "Belagavi", "Bellary", "Davanagere"]
  },
  {
    stateName: "Kerala",
    districts: ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Palakkad", "Alappuzha", "Kannur", "Kollam"]
  },
  {
    stateName: "Madhya Pradesh",
    districts: ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna"]
  },
  {
    stateName: "Maharashtra",
    districts: ["Pune", "Mumbai City", "Mumbai Suburban", "Thane", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Kolhapur"]
  },
  {
    stateName: "Odisha",
    districts: ["Khordha", "Cuttack", "Puri", "Ganjam", "Balasore", "Sambalpur", "Bhadrak", "Khurda", "Mayurbhanj"]
  },
  {
    stateName: "Punjab",
    districts: ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot"]
  },
  {
    stateName: "Rajasthan",
    districts: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Sikar"]
  },
  {
    stateName: "Tamil Nadu",
    districts: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Vellore", "Kanyakumari", "Thanjavur"]
  },
  {
    stateName: "Uttar Pradesh",
    districts: ["Lucknow", "Kanpur", "Gautam Buddha Nagar", "Varanasi", "Agra", "Prayagraj", "Ghaziabad", "Meerut", "Bareilly", "Gorakhpur"]
  },
  {
    stateName: "West Bengal",
    districts: ["Kolkata", "Howrah", "Darjeeling", "Hooghly", "North 24 Parganas", "South 24 Parganas", "Purba Medinipur", "Paschim Medinipur"]
  }
];

export const getDistrictsByState = (stateName: string): string[] => {
  const found = indiaStatesAndDistricts.find(s => s.stateName === stateName);
  return found ? found.districts : [];
};
