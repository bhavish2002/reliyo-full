export interface CountryState {
  name: string;
  states: string[];
}

export const countriesWithStates: CountryState[] = [
  {
    name: "India",
    states: [
      "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
      "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
      "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
      "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
      "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
      "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli",
      "Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
      "Other",
    ],
  },
  {
    name: "United States",
    states: [
      "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
      "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
      "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
      "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
      "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
      "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
      "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
      "Wisconsin","Wyoming","Other",
    ],
  },
  {
    name: "United Kingdom",
    states: [
      "England","Scotland","Wales","Northern Ireland","Other",
    ],
  },
  {
    name: "Canada",
    states: [
      "Alberta","British Columbia","Manitoba","New Brunswick",
      "Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut",
      "Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon","Other",
    ],
  },
  {
    name: "Australia",
    states: [
      "Australian Capital Territory","New South Wales","Northern Territory",
      "Queensland","South Australia","Tasmania","Victoria","Western Australia","Other",
    ],
  },
  {
    name: "Germany",
    states: [
      "Baden-Württemberg","Bavaria","Berlin","Brandenburg","Bremen","Hamburg","Hesse",
      "Lower Saxony","Mecklenburg-Vorpommern","North Rhine-Westphalia","Rhineland-Palatinate",
      "Saarland","Saxony","Saxony-Anhalt","Schleswig-Holstein","Thuringia","Other",
    ],
  },
  {
    name: "France",
    states: [
      "Auvergne-Rhône-Alpes","Bourgogne-Franche-Comté","Brittany","Centre-Val de Loire",
      "Corsica","Grand Est","Hauts-de-France","Île-de-France","Normandy",
      "Nouvelle-Aquitaine","Occitanie","Pays de la Loire","Provence-Alpes-Côte d'Azur","Other",
    ],
  },
  {
    name: "Japan",
    states: [
      "Aichi","Akita","Aomori","Chiba","Ehime","Fukui","Fukuoka","Fukushima","Gifu",
      "Gunma","Hiroshima","Hokkaido","Hyogo","Ibaraki","Ishikawa","Iwate","Kagawa",
      "Kagoshima","Kanagawa","Kochi","Kumamoto","Kyoto","Mie","Miyagi","Miyazaki",
      "Nagano","Nagasaki","Nara","Niigata","Oita","Okayama","Okinawa","Osaka","Saga",
      "Saitama","Shiga","Shimane","Shizuoka","Tochigi","Tokushima","Tokyo","Tottori",
      "Toyama","Wakayama","Yamagata","Yamaguchi","Yamanashi","Other",
    ],
  },
  {
    name: "Brazil",
    states: [
      "Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Espírito Santo","Goiás",
      "Maranhão","Mato Grosso","Mato Grosso do Sul","Minas Gerais","Pará","Paraíba",
      "Paraná","Pernambuco","Piauí","Rio de Janeiro","Rio Grande do Norte",
      "Rio Grande do Sul","Rondônia","Roraima","Santa Catarina","São Paulo","Sergipe",
      "Tocantins","Federal District","Other",
    ],
  },
  {
    name: "South Africa",
    states: [
      "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga",
      "North West","Northern Cape","Western Cape","Other",
    ],
  },
  {
    name: "United Arab Emirates",
    states: [
      "Abu Dhabi","Ajman","Dubai","Fujairah","Ras Al Khaimah","Sharjah","Umm Al Quwain","Other",
    ],
  },
  {
    name: "Singapore",
    states: ["Central Region","East Region","North Region","North-East Region","West Region","Other"],
  },
  {
    name: "Nigeria",
    states: [
      "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
      "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa",
      "Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger",
      "Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
      "FCT Abuja","Other",
    ],
  },
  {
    name: "Mexico",
    states: [
      "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
      "Chihuahua","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo",
      "Jalisco","Mexico City","Mexico State","Michoacán","Morelos","Nayarit",
      "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
      "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán",
      "Zacatecas","Other",
    ],
  },
  {
    name: "China",
    states: [
      "Anhui","Beijing","Chongqing","Fujian","Gansu","Guangdong","Guangxi","Guizhou",
      "Hainan","Hebei","Heilongjiang","Henan","Hong Kong","Hubei","Hunan","Inner Mongolia",
      "Jiangsu","Jiangxi","Jilin","Liaoning","Macau","Ningxia","Qinghai","Shaanxi",
      "Shandong","Shanghai","Shanxi","Sichuan","Tianjin","Tibet","Xinjiang","Yunnan",
      "Zhejiang","Other",
    ],
  },
];

export const getStatesByCountry = (country: string): string[] => {
  return countriesWithStates.find((c) => c.name === country)?.states ?? [];
};

export const ALL_COUNTRY_NAMES = countriesWithStates.map((c) => c.name);
